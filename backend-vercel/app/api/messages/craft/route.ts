import OpenAI from 'openai';
import { ok, options, badRequest, serverError } from "@/lib/cors";
import { craftMessageSchema } from "@/lib/validation";

export const runtime = 'nodejs';

// simple in-memory limiter per IP
const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 30; // 30 requests per minute per IP

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || now > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count < LIMIT) {
    entry.count++;
    return true;
  }
  return false;
}

export async function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request){
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip)) return badRequest('Rate limit exceeded');

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
    return ok({ message: text.trim() }, req);
  } catch (err: any) {
    return serverError(err?.message || 'Internal error', req);
  }
}
