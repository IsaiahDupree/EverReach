import OpenAI from 'openai';
import { ok, options, badRequest, serverError, unauthorized, tooManyRequests } from "@/lib/cors";
import { craftMessageSchema } from "@/lib/validation";
import { getUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientOrThrow } from "@/lib/supabase";
import { reserveComposeUsage, releaseComposeUsage } from "@/lib/usage-limits";

export const runtime = 'nodejs';

export async function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request){
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    const rl = checkRateLimit(`u:${user.id}:POST:/api/messages/craft`, 30, 60_000);
    if (!rl.allowed) return tooManyRequests('Rate limit exceeded', req);

    const body = await req.json();
    const parsed = craftMessageSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const { tone = 'friendly', purpose, context = '', to, voiceContext } = parsed.data;

    // Short-circuit: if OPENAI is intentionally disabled or key missing, return a quick stub
    const preferStub = process.env.OPENAI_STUB === 'true' || !process.env.OPENAI_API_KEY;
    if (preferStub) {
      const recipient = [to?.name, to?.email].filter(Boolean).join(' ').trim();
      const msg = `Subject: ${tone === 'formal' ? 'Following Up' : 'Just Checking In!'}\n\n` +
        `${recipient ? `Hi ${recipient},` : 'Hi,'}\n\n` +
        `I hope you're well. ${purpose ? `I'm reaching out about ${purpose}. ` : ''}` +
        `${context ? `${context} ` : ''}` +
        `Let me know if you'd like to connect.\n\nBest,\nYour Name`;
      return ok({ message: msg }, req);
    }

    // Real OpenAI call incurs cost: enforce the per-user monthly compose quota.
    // reserveComposeUsage() atomically checks-and-increments compose_runs_used
    // in a single DB statement, so concurrent requests near the limit boundary
    // can't all pass the check before any of them increments (see
    // reserve_compose_usage SQL function / lib/usage-limits.ts).
    const supabase = getClientOrThrow(req);
    const usageCheck = await reserveComposeUsage(supabase, user.id);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'usage_limit_exceeded',
            message: usageCheck.reason || 'Monthly compose generation limit reached',
            details: {
              current_usage: usageCheck.current_usage,
              limit: usageCheck.limit,
              remaining: usageCheck.remaining,
              resets_at: usageCheck.resets_at,
              tier: usageCheck.tier,
            },
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(usageCheck.limit),
            'X-RateLimit-Remaining': String(usageCheck.remaining || 0),
            'X-RateLimit-Reset': usageCheck.resets_at || '',
          },
        }
      );
    }

    // From here on, the reservation above must be released unless the
    // OpenAI call completes successfully, so we don't charge quota for a
    // generation the user never received.
    let usageReserved = true;
    try {
      // Otherwise, call OpenAI
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Build prompt with voice context
      let prompt = `Craft a ${tone} message for the following purpose: ${purpose}.\nContext: ${context}.\nRecipient: ${to?.name || ''} ${to?.email || ''}`;

      // Add voice & tone instructions if provided
      if (voiceContext) {
        prompt += `\n\nVOICE & TONE INSTRUCTIONS: ${voiceContext}`;
        prompt += `\nIMPORTANT: Match the voice and tone specified above. This is how the user naturally communicates. Use their style, phrasing, and energy level.`;
      }

      const resp = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: prompt,
        temperature: 0.7,
        max_output_tokens: 250,
      });
      // @ts-ignore - output_text available in SDK response helper
      const text: string = (resp as any).output_text ?? '';

      // Generation succeeded; the usage reservation above stays consumed.
      usageReserved = false;

      return ok({ message: text.trim() }, req);
    } finally {
      if (usageReserved) {
        // Compensating rollback: the OpenAI call didn't complete
        // successfully, so don't charge the user's monthly quota for it.
        // Best-effort -- failures are logged inside releaseComposeUsage.
        await releaseComposeUsage(supabase, user.id);
      }
    }
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
