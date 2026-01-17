import { options, ok, badRequest, serverError } from "@/lib/cors";
import { trendingQuerySchema } from "@/lib/validation";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /trending/prompts?window=today|week|month&org=me|all&limit=10
export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const input = trendingQuerySchema.parse({
      window: url.searchParams.get('window') ?? undefined,
      org: url.searchParams.get('org') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let q = supabase
      .from('prompt_first_trending_cache')
      .select('prompt_key, representative_text, intent, uses, impressions, ctr, score, updated_at')
      .eq('window', input.window)
      .order('score', { ascending: false })
      .limit(input.limit ?? 10);
    // Note: org scoping TBD; current cache does not store org-specific rows (org_id is null)

    const { data, error } = await q;
    if (error) return serverError(error.message, req);

    const items = (data ?? []).map((row: any, idx: number) => ({
      rank: idx + 1,
      representative_text: row.representative_text || row.prompt_key,
      intent: row.intent || null,
      uses: row.uses,
      impressions: row.impressions,
      ctr: row.ctr === null || row.ctr === undefined ? null : Number(row.ctr),
      score: row.score === null || row.score === undefined ? null : Number(row.score),
      deep_link: `/compose?prefill=${encodeURIComponent(row.representative_text || row.prompt_key)}`,
    }));

    return ok(items, req);
  } catch (e: any) {
    return badRequest(e?.message || 'invalid_query', req);
  }
}
