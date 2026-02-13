import { options, ok, created, unauthorized, badRequest, serverError, tooManyRequests } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactCreateSchema, contactsListQuerySchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:GET:/v1/contacts`, 60, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  const url = new URL(req.url);
  const params: Record<string, string> = {} as any;
  url.searchParams.forEach((v, k) => { params[k] = v; });
  // Preserve raw CSV for multi-tag filtering
  const rawTagsParam = url.searchParams.get('tags') || undefined;
  // Back-compat alias only when not CSV
  if ((params as any).tags && !(params as any).tag && !String((params as any).tags).includes(',')) (params as any).tag = (params as any).tags;
  const parsed = contactsListQuerySchema.safeParse(params);
  if (!parsed.success) return badRequest(parsed.error.message, req);
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
        return ok({ contacts: [], items: [], limit: q.limit ?? 20, nextCursor: null }, req);
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
        return ok({ contacts: [], items: [], limit: q.limit ?? 20, nextCursor: null }, req);
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
      return ok({ contacts: [], items: [], limit: q.limit ?? 20, nextCursor: null }, req);
    }
    filteredContactIds = ids as string[];
  }

  let sel = supabase.from('contacts')
    .select('id, display_name, emails, phones, tags, warmth, warmth_band, last_interaction_at, created_at, updated_at, photo_url')
    .is('deleted_at', null);
  if (filteredContactIds) sel = sel.in('id', filteredContactIds);

  if (q.q) {
    // Try text search, fallback to ILIKE on display_name
    sel = sel.textSearch?.('search_tsv' as any, q.q as any, { config: 'simple' } as any) || sel.ilike('display_name', `%${q.q}%`);
  }
  const csvTags = rawTagsParam ? rawTagsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (csvTags.length > 1) sel = (sel as any).overlaps('tags', csvTags);
  else if (q.tag) sel = sel.contains('tags', [q.tag]);
  if (q.updated_since) sel = sel.gte('updated_at', q.updated_since);
  if (q.warmth_gte !== undefined) sel = sel.gte('warmth', q.warmth_gte);
  if (q.warmth_lte !== undefined) sel = sel.lte('warmth', q.warmth_lte);
  if (q.warmth_band) sel = sel.eq('warmth_band', q.warmth_band);
  if (q.has_email !== undefined && q.has_email) sel = sel.not('emails', 'eq', '{}');

  const limit = q.limit ?? 20;
  const sortCol = q.sort?.startsWith('warmth') ? 'warmth' : q.sort?.startsWith('updated_at') ? 'updated_at' : 'created_at';
  sel = sel.order(sortCol, { ascending: q.sort?.endsWith('.asc') ?? false })
           .order('id', { ascending: false })
           .limit(limit);
  if (q.cursor) sel = sel.lt('created_at', q.cursor);

  let { data, error } = await sel;
  // If contacts table is missing, fallback to people with mapped fields
  if (error && (error.message?.includes('relation') && error.message?.includes('contacts'))) {
    let sel2 = supabase
      .from('people')
      .select('id, full_name, emails, phones, tags, warmth, last_interaction, created_at, updated_at');
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
    if (error2) return serverError("Internal server error", req);

    const mapped = (data2 || []).map((row: any) => ({
      id: row.id,
      display_name: row.full_name,
      emails: row.emails,
      phones: row.phones,
      tags: row.tags,
      warmth: row.warmth,
      warmth_band: row.warmth >= 80 ? 'hot' : row.warmth >= 60 ? 'warm' : row.warmth >= 40 ? 'neutral' : row.warmth >= 20 ? 'cool' : 'cold',
      last_interaction_at: row.last_interaction,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    const nextCursor2 = mapped.length === limit ? mapped[mapped.length - 1]?.created_at : null;
    return ok({ contacts: mapped, items: mapped, limit, nextCursor: nextCursor2 }, req);
  }

  if (error) return serverError("Internal server error", req);
  const items = data ?? [];
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
  // Include both 'contacts' and 'items' keys for compatibility with existing clients/tests
  return ok({ contacts: items, items, limit, nextCursor }, req);
}

export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const rl = checkRateLimit(`u:${user.id}:POST:/v1/contacts`, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  let body: any;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  // Accept `name` as alias for `display_name` for compatibility
  if (body && typeof body === 'object' && !body.display_name && typeof body.name === 'string') {
    body.display_name = body.name;
  }
  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(`validation_error: ${parsed.error.message}`, req);

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

  // Determine org_id for RLS
  let orgId: string | null = null;
  try {
    const { data: orgRow } = await supabase
      .from('user_orgs')
      .select('org_id')
      .limit(1)
      .maybeSingle();
    orgId = (orgRow as any)?.org_id ?? null;
    if (!orgId) {
      try {
        const { data: ensuredOrg } = await (supabase as any).rpc('ensure_user_org');
        if (ensuredOrg) orgId = ensuredOrg as string;
      } catch {}
    }
  } catch {}

  const insert = { ...parsed.data } as any;
  if (idempotency) insert.metadata = { ...(insert.metadata ?? {}), idempotency_key: idempotency };
  if (orgId) (insert as any).org_id = orgId;

  const { data, error } = await supabase
    .from('contacts')
    .insert([insert])
    .select('id, display_name, emails, phones, company, notes, tags, avatar_url, photo_url, metadata, warmth, warmth_band, created_at, updated_at')
    .single();

  // Fallback: if contacts table is missing, insert into people instead
  if (error && (
    (error.message?.includes('relation') && error.message?.includes('contacts')) ||
    (error.code === '42P01') // undefined_table
  )) {
    // Determine org_id for RLS
    let orgId: string | null = null;
    const { data: orgRow } = await supabase
      .from('user_orgs')
      .select('org_id')
      .limit(1)
      .maybeSingle();
    orgId = (orgRow as any)?.org_id ?? null;
    if (!orgId) {
      // Try to ensure org via RPC if not present
      try {
        const { data: ensuredOrg } = await (supabase as any).rpc('ensure_user_org');
        if (ensuredOrg) orgId = ensuredOrg as string;
      } catch {}
    }

    if (!orgId) {
      return badRequest('org_not_found: Could not determine org_id for user', req);
    }

    const peopleInsert: any = {
      org_id: orgId,
      full_name: (parsed.data as any).display_name,
      emails: (parsed.data as any).emails ?? [],
      phones: (parsed.data as any).phones ?? [],
    };
    if ((parsed.data as any).company) peopleInsert.company = (parsed.data as any).company;
    if ((parsed.data as any).tags) peopleInsert.tags = (parsed.data as any).tags;

    const { data: pData, error: pErr } = await supabase
      .from('people')
      .insert([peopleInsert])
      .select('id, full_name, created_at')
      .single();

    if (pErr) {
      return serverError("Internal server error", req);
    }

    // Map to contacts response shape
    const mapped = { id: (pData as any).id, display_name: (pData as any).full_name, created_at: (pData as any).created_at };
    return created({ contact: mapped }, req);
  }

  if (error) return serverError("Internal server error", req);
  return created({ contact: data }, req);
}
