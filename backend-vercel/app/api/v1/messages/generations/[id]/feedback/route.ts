import { options, ok, badRequest, unauthorized, notFound, serverError } from '@/lib/cors';
import { getUser } from '@/lib/auth';
import { getClientOrThrow } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics/edge';
import { z } from 'zod';

export const runtime = 'edge';

export function OPTIONS(req: Request) { return options(req); }

const feedbackSchema = z.object({
  action: z.enum(['like','dislike','copy','regenerate','accept','reject','edit']),
  details: z.any().optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const genId = ctx.params?.id;
  if (!genId) return badRequest('Missing generation id', req);

  try {
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message, req);

    const supabase = getClientOrThrow(req);

    // Ensure generation exists (and optionally belongs to user via query; RLS will also protect)
    const { data: genRow } = await supabase
      .from('message_generations')
      .select('id,user_id,channel')
      .eq('id', genId)
      .maybeSingle();

    if (!genRow) return notFound('Generation not found', req);

    // Insert feedback
    const { error: insErr } = await supabase
      .from('message_generation_feedbacks')
      .insert({
        generation_id: genId,
        user_id: user.id,
        action: parsed.data.action,
        details: parsed.data.details || null,
      });

    if (insErr) return serverError(insErr.message, req);

    // Emit analytics (best-effort)
    try {
      const action = parsed.data.action;
      const eventName = mapActionToEvent(action);
      if (eventName) {
        await trackEvent(eventName as any, {
          channel: genRow.channel,
          action,
        } as any, { platform: 'web', user_id: user.id });
      }
    } catch (e) {
      console.error('[AI Feedback] trackEvent failed:', (e as any)?.message || e);
    }

    return ok({ ok: true }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Failed', req);
  }
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const genId = ctx.params?.id;
  if (!genId) return badRequest('Missing generation id', req);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('message_generation_feedbacks')
      .select('id, action, details, created_at')
      .eq('generation_id', genId)
      .order('created_at', { ascending: false });

    if (error) return serverError(error.message, req);
    return ok({ feedback: data || [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Failed', req);
  }
}

function mapActionToEvent(action: string): string | null {
  switch (action) {
    case 'like':
    case 'accept':
      return 'ai_message_accepted';
    case 'dislike':
    case 'reject':
      return 'ai_message_rejected';
    case 'edit':
      return 'ai_message_edited';
    case 'copy':
      return 'ai_message_edited';
    case 'regenerate':
      return 'ai_message_edited';
    default:
      return null;
  }
}
