import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { paywallWindowSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/me/impact-summary?window=90d
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const url = new URL(req.url);
    const input = paywallWindowSchema.parse({ window: url.searchParams.get('window') ?? '90d' });
    const variant = (url.searchParams.get('variant') || 'baseline').toLowerCase();

    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('paywall_insights_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('window', input.window || '90d')
      .maybeSingle();
    if (error) return serverError(error.message, req);

    const row = data || {} as any;
    const impact = {
      reply_rate: row.reply_rate === null || row.reply_rate === undefined ? null : Number(row.reply_rate),
      time_saved_minutes: row.time_saved_minutes === null || row.time_saved_minutes === undefined ? null : Number(row.time_saved_minutes),
      warmth_avg_delta: row.warmth_avg_delta === null || row.warmth_avg_delta === undefined ? null : Number(row.warmth_avg_delta),
      reengaged_contacts: row.reengaged_contacts || 0,
      updated_at: row.updated_at || null,
      explainers: [
        'Time saved = drafts_accepted × 6 min (starter assumption)',
        'Reply rate = replies / messages_sent (in-window)',
      ],
    };

    return ok({ window: input.window || '90d', variant, impact }, req);
  } catch (e: any) {
    return badRequest(e?.message || 'invalid_query', req);
  }
}
