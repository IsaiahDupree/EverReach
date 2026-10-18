import { options, ok, badRequest, unauthorized, serverError, notFound } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import { getOpenAIClient, DEFAULT_MODEL, SYSTEM_PROMPTS } from '@/lib/openai';
import { trackEvent } from '@/lib/analytics/edge';
import { z } from 'zod';

export const runtime = 'edge';

export function OPTIONS(req: Request) { return options(req); }

const regenSchema = z.object({
  tone: z.enum(['concise', 'warm', 'professional', 'playful']).optional(),
  goal_description: z.string().optional(),
  max_length: z.number().int().min(50).max(2000).optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const generationId = ctx.params?.id;
  if (!generationId) return badRequest('Missing generation id', req);

  try {
    const payload = await req.json().catch(() => ({}));
    const parsed = regenSchema.safeParse(payload || {});
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const supabase = getClientOrThrow(req);

    // Load original generation
    const { data: gen } = await supabase
      .from('message_generations')
      .select('id, user_id, contact_id, channel, tone, goal_type, generated_subject, generated_body')
      .eq('id', generationId)
      .maybeSingle();

    if (!gen) return notFound('Generation not found', req);

    // Load contact minimal fields
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, display_name, warmth, warmth_band, company, tags')
      .eq('id', gen.contact_id)
      .maybeSingle();

    if (!contact) return notFound('Contact not found', req);

    const finalTone = parsed.data.tone || gen.tone || 'warm';
    const finalMaxLength = parsed.data.max_length || (gen.channel === 'sms' ? 150 : 500);

    // Build a compact prompt (reuse composer system prompt)
    const contextParts = [
      `Regenerate a ${finalTone} ${gen.channel} message for ${contact.display_name}.`,
      contact.company ? `Company: ${contact.company}` : '',
      contact.tags?.length ? `Tags: ${contact.tags.join(', ')}` : '',
      `Warmth: ${contact.warmth}/100 (${contact.warmth_band})`,
      parsed.data.goal_description ? `Goal: ${parsed.data.goal_description}` : `Goal Type: ${gen.goal_type}`,
      gen.generated_body ? `Prior draft: ${gen.generated_body.substring(0, 400)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Rewrite with variation and improvements. Keep it authentic, match tone (${finalTone}), and target ~${finalMaxLength} chars for ${gen.channel}.`;

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.composer },
        { role: 'user', content: `${contextParts}\n\n${prompt}` },
      ],
      temperature: 0.8,
      max_tokens: gen.channel === 'sms' ? 200 : 700,
    });

    const generated = response.choices[0]?.message?.content || '';

    let subject: string | null = null;
    let body = generated;
    if (gen.channel === 'email' && generated.startsWith('Subject:')) {
      const lines = generated.split('\n');
      subject = lines[0].replace('Subject:', '').trim();
      body = lines.slice(1).join('\n').trim();
    }

    // Insert new generation linked to parent
    const { data: newGen, error: insErr } = await supabase
      .from('message_generations')
      .insert({
        user_id: user.id,
        contact_id: gen.contact_id,
        goal_type: gen.goal_type,
        channel: gen.channel,
        tone: finalTone,
        generated_subject: subject,
        generated_body: body,
        parent_generation_id: gen.id,
        context_used: { variation_of: gen.id },
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insErr) return serverError(insErr.message, req);

    // Emit analytics (best-effort)
    try {
      await trackEvent('ai_message_edited' as any, {
        channel: gen.channel,
        goal: parsed.data.goal_description || gen.goal_type,
        tone: finalTone,
      } as any, { platform: 'web', user_id: user.id });
    } catch (e) {
      console.error('[Regenerate] trackEvent failed:', (e as any)?.message || e);
    }

    return ok({
      generation_id: newGen?.id || null,
      message: { subject, body, channel: gen.channel, tone: finalTone, estimated_length: body.length },
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Failed', req);
  }
}
