import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { paywallWindowSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/me/usage-summary?window=30d
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const url = new URL(req.url);
    const input = paywallWindowSchema.parse({ window: url.searchParams.get('window') ?? undefined });

    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('paywall_insights_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('window', input.window || '30d')
      .maybeSingle();
    if (error) return serverError(error.message, req);

    const row = data || {} as any;
    const usage = {
      contacts_created: row.contacts_created || 0,
      messages_drafted: row.messages_drafted || 0,
      drafts_accepted: row.drafts_accepted || 0,
      messages_sent: row.messages_sent || 0,
      voice_minutes_used: Number(row.voice_minutes_used || 0),
      storage_used_mb: Number(row.storage_used_mb || 0),
      compose_runs_used: row.compose_runs_used || 0,
      integrations_count: row.integrations_count || 0,
      top_intents: row.top_intents || [],
      updated_at: row.updated_at || null,
    };

    // Provide limits to support progress bars in the client
    const limits = {
      compose_runs: 50,
      voice_minutes: 30,
      messages: 200,
    };

    const assumptions = [
      'Starter caps: 50 compose runs, 30 voice minutes, 200 messages per 30d.',
    ];

    return ok({ window: input.window || '30d', usage, limits, assumptions }, req);
  } catch (e: any) {
    return badRequest(e?.message || 'invalid_query', req);
  }
}
