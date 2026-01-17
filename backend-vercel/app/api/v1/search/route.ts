import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { searchSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// POST /v1/search – basic search over contacts with optional warmth filters
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  const { q = '', limit = 20, filters } = parsed.data;

  try {
    const supabase = getClientOrThrow(req);
    let sel = supabase
      .from('contacts')
      .select('id, display_name, emails, phones, tags, warmth, warmth_band, last_interaction_at, created_at, updated_at')
      .is('deleted_at', null)
      .limit(limit)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (q && q.trim()) {
      // Prefer tsvector search; fallback to ILIKE
      const trimmed = q.trim();
      sel = sel.textSearch?.('search_tsv' as any, trimmed as any, { config: 'simple' } as any) || sel.ilike('display_name', `%${trimmed}%`);
    }

    if (filters?.warmth_band?.length) sel = sel.in('warmth_band', filters.warmth_band);
    if (typeof filters?.warmth_gte === 'number') sel = sel.gte('warmth', filters.warmth_gte);
    if (typeof filters?.warmth_lte === 'number') sel = sel.lte('warmth', filters.warmth_lte);

    const { data, error } = await sel;
    if (error) return serverError(error.message, req);
    return ok({ items: data ?? [], limit }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
