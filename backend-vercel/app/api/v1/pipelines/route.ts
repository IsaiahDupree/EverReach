import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/pipelines
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const rl = checkRateLimit(`u:${user.id}:GET:/v1/pipelines`, 60, 60_000);
    if (!rl.allowed) return new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), { status: 429 });
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('pipelines')
      .select('id, key, name, created_at')
      .order('key', { ascending: true });
    if (error) return serverError(error.message, req);
    const items = data || [];
    return ok({ pipelines: items, items }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/pipelines
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  
  if (!body || typeof body !== 'object') return badRequest('invalid_body', req);
  const { name, stages } = body as any;
  if (!name || typeof name !== 'string') return badRequest('name_required', req);

  try {
    const rl = checkRateLimit(`u:${user.id}:POST:/v1/pipelines`, 30, 60_000);
    if (!rl.allowed) return new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfter }), { status: 429 });
    const supabase = getClientOrThrow(req);
    
    // Generate key from name
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    // Idempotency support using deterministic key
    const idempotency = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || undefined;
    if (idempotency) {
      const { data: existing } = await supabase
        .from('pipelines')
        .select('id, key, name, created_at')
        .eq('key', key)
        .limit(1)
        .maybeSingle();
      if (existing) return ok({ pipeline: existing, idempotent: true }, req);
    }
    // Try to determine org_id for RLS
    let orgId: string | null = null;
    try {
      const { data: orgRow } = await supabase
        .from('user_orgs')
        .select('org_id')
        .limit(1)
        .maybeSingle();
      orgId = (orgRow as any)?.org_id ?? null;
    } catch {}

    const pipelineInsert: any = { key, name };
    if (orgId) pipelineInsert.org_id = orgId;

    const { data, error } = await supabase
      .from('pipelines')
      .insert([pipelineInsert])
      .select('id, key, name, created_at')
      .single();
    if (error) return serverError(error.message, req);

    // Optionally insert stages if provided
    if (Array.isArray(stages) && stages.length > 0 && data?.id) {
      const stageRows = (stages as any[]).map((s, idx) => ({
        pipeline_id: (data as any).id,
        key: String((s?.name || `stage_${idx + 1}`)).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        name: s?.name || `Stage ${idx + 1}`,
        order: typeof s?.order === 'number' ? s.order : idx,
        ...(orgId ? { org_id: orgId } : {}),
      }));
      try { await supabase.from('pipeline_stages').insert(stageRows); } catch {}
    }
    return created({ pipeline: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
