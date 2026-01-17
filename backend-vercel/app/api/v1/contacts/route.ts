import { options, ok, created, badRequest, serverError, unauthorized, buildCorsHeaders } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactCreateSchema, contactsListQuerySchema } from "@/lib/validation";
import { withCurrentWarmth } from "@/lib/warmth-helpers";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const rl = checkRateLimit(`u:${user.id}:GET:/v1/contacts`, 60, 60_000);
  if (!rl.allowed) {
    const origin = req.headers.get('origin') ?? undefined;
    const res = new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) },
    });
    if (rl.retryAfter != null) res.headers.set('Retry-After', String(rl.retryAfter));
    return res;
  }

  const url = new URL(req.url);
  const params: Record<string, string> = {} as any;
  url.searchParams.forEach((v, k) => { params[k] = v; });
  const parsed = contactsListQuerySchema.safeParse(params);
  if (!parsed.success) {
    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({ error: "validation_error", details: parsed.error.flatten() }), {
      status: 422,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) },
    });
  }
  const q = parsed.data;

  const supabase = getClientOrThrow(req);

  // Optional pipeline/stage filters: resolve matching contact IDs first
  let filteredContactIds: string[] | null = null;
  if (q.pipeline || q.stage) {
    let pipelineId: string | null = null;
    if (q.pipeline) {
      const { data: p } = await supabase
        .from('pipelines')
        .select('id')
        .eq('key', q.pipeline)
        .maybeSingle();
      pipelineId = p?.id ?? null;
      if (!pipelineId) {
        // No pipeline match → no results
        return ok({ items: [], limit: q.limit ?? 20, nextCursor: null }, req);
      }
    }

    let stageIds: string[] | null = null;
    if (q.stage) {
      // If pipeline known, resolve stage within it; else resolve all matching keys
      let stageQuery = supabase
        .from('pipeline_stages')
        .select('id, pipeline_id, key');
      stageQuery = stageQuery.eq('key', q.stage);
      if (pipelineId) stageQuery = stageQuery.eq('pipeline_id', pipelineId);
      const { data: stages } = await stageQuery;
      stageIds = (stages || []).map(s => s.id);
      if ((stageIds?.length ?? 0) === 0) {
        return ok({ items: [], limit: q.limit ?? 20, nextCursor: null }, req);
      }
    }

    // Fetch contact ids from state with resolved filters
    let stateSel = supabase
      .from('contact_pipeline_state')
      .select('contact_id, pipeline_id, stage_id');
    if (pipelineId) stateSel = stateSel.eq('pipeline_id', pipelineId);
    if (stageIds && stageIds.length > 0) stateSel = stateSel.in('stage_id', stageIds);
    const { data: states } = await stateSel;
    const ids = (states || []).map(s => s.contact_id).filter(Boolean);
    // If no states match, short-circuit
    if (ids.length === 0) {
      return ok({ items: [], limit: q.limit ?? 20, nextCursor: null }, req);
    }
    filteredContactIds = ids as string[];
  }

  // Try contacts table first; fallback to people if contacts doesn't exist
  let sel = supabase.from('contacts')
    .select('id, display_name, emails, phones, tags, warmth, warmth_band, warmth_updated_at, last_interaction_at, photo_url, avatar_url, company, created_at, updated_at')
    .is('deleted_at', null);
  if (filteredContactIds) sel = sel.in('id', filteredContactIds);

  if (q.q) {
    // Try text search, fallback to ILIKE on display_name
    sel = sel.textSearch?.('search_tsv' as any, q.q as any, { config: 'simple' } as any) || sel.ilike('display_name', `%${q.q}%`);
  }
  if (q.tag) sel = sel.contains('tags', [q.tag]);
  if (q.updated_since) sel = sel.gte('updated_at', q.updated_since);
  if (q.warmth_gte !== undefined) sel = sel.gte('warmth', q.warmth_gte);
  if (q.warmth_lte !== undefined) sel = sel.lte('warmth', q.warmth_lte);
  if (q.warmth_band) sel = sel.eq('warmth_band', q.warmth_band);
  if (q.has_email !== undefined && q.has_email) sel = sel.not('emails', 'eq', '{}');

  const limit = q.limit ?? 20;
  sel = sel.order(q.sort?.startsWith('warmth') ? 'warmth' : 'created_at', { ascending: q.sort?.endsWith('.asc') ?? false })
    .order('id', { ascending: false })
    .limit(limit);
  if (q.cursor) sel = sel.lt('created_at', q.cursor);

  let { data, error } = await sel;
  // If contacts table is missing, fallback to people with mapped fields
  if (error && (error.message?.includes('relation') && error.message?.includes('contacts'))) {
    let sel2 = supabase
      .from('people')
      .select('id, full_name, emails, phones, tags, warmth, last_interaction, photo_url, avatar_url, company, title, created_at, updated_at');
    if (filteredContactIds) sel2 = sel2.in('id', filteredContactIds);
    if (q.q) sel2 = sel2.ilike('full_name', `%${q.q}%`);
    if (q.tag) sel2 = sel2.contains('tags', [q.tag]);
    if (q.updated_since) sel2 = sel2.gte('updated_at', q.updated_since);
    if (q.warmth_gte !== undefined) sel2 = sel2.gte('warmth', q.warmth_gte);
    if (q.warmth_lte !== undefined) sel2 = sel2.lte('warmth', q.warmth_lte);
    if (q.has_email !== undefined && q.has_email) sel2 = sel2.not('emails', 'eq', '{}');

    sel2 = sel2
      .order(q.sort?.startsWith('warmth') ? 'warmth' : 'created_at', { ascending: q.sort?.endsWith('.asc') ?? false })
      .order('id', { ascending: false })
      .limit(limit);
    if (q.cursor) sel2 = sel2.lt('created_at', q.cursor);

    const { data: data2, error: error2 } = await sel2;
    if (error2) return serverError(error2.message, req);

    const mapped = (data2 || []).map((row: any) => withCurrentWarmth({
      id: row.id,
      display_name: row.full_name,
      emails: row.emails,
      phones: row.phones,
      tags: row.tags,
      warmth: row.warmth,
      warmth_band: row.warmth >= 80 ? 'hot' : row.warmth >= 60 ? 'warm' : row.warmth >= 40 ? 'neutral' : row.warmth >= 20 ? 'cool' : 'cold',
      warmth_updated_at: row.updated_at,
      last_interaction_at: row.last_interaction,
      avatar_url: row.avatar_url,
      company: row.company,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    const nextCursor2 = mapped.length === limit ? mapped[mapped.length - 1]?.created_at : null;
    return ok({ items: mapped, limit, nextCursor: nextCursor2 }, req);
  }

  if (error) return serverError(error.message, req);
  let items = (data ?? []).map((row: any) => withCurrentWarmth(row));
  if (q.sort?.startsWith('warmth_score_current')) {
    const asc = q.sort.endsWith('.asc');
    items = items.sort((a: any, b: any) => {
      const diff = (a.warmth_score_current ?? 0) - (b.warmth_score_current ?? 0);
      return asc ? diff : -diff;
    });
  }
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
  return ok({ items, limit, nextCursor }, req);
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts`, 30, 60_000);
  if (!rl.allowed) {
    const origin = req.headers.get('origin') ?? undefined;
    const res = new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) },
    });
    if (rl.retryAfter != null) res.headers.set('Retry-After', String(rl.retryAfter));
    return res;
  }

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    const origin = req.headers.get('origin') ?? undefined;
    return new Response(JSON.stringify({ error: 'validation_error', details: parsed.error.flatten() }), {
      status: 422,
      headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(origin) },
    });
  }

  const idempotency = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || undefined;
  const supabase = getClientOrThrow(req);

  // If Idempotency-Key provided, return existing contact if found
  if (idempotency) {
    const { data: existing } = await supabase.from('contacts')
      .select('id, display_name, created_at')
      .eq('metadata->>idempotency_key', idempotency)
      .limit(1)
      .maybeSingle();
    if (existing) return ok({ contact: existing, idempotent: true }, req);
  }

  const insert = { ...parsed.data, warmth: 40 } as any;
  if (idempotency) insert.metadata = { ...(insert.metadata ?? {}), idempotency_key: idempotency };

  const { data, error } = await supabase
    .from('contacts')
    .insert([insert])
    .select('id, display_name, warmth, created_at')
    .single();

  if (error) return serverError(error.message, req);
  return created({ contact: data }, req);
}
