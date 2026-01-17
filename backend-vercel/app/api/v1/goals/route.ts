import { options, ok, badRequest, serverError, created } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { goalsListQuerySchema, goalCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/goals?kind=&scope=global|org|user
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const url = new URL(req.url);
    const input = goalsListQuerySchema.parse({
      kind: url.searchParams.get('kind') ?? undefined,
      scope: url.searchParams.get('scope') ?? undefined,
    });

    const supabase = getClientOrThrow(req);
    let q = supabase
      .from('message_goals')
      .select('id, org_id, owner_user_id, kind, name, description, channel_suggestions, variables_schema, default_template_id, is_active, popularity_score, created_at, updated_at')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (input.kind) q = q.eq('kind', input.kind);
    if (input.scope === 'global') {
      q = q.is('org_id', null).is('owner_user_id', null);
    } else if (input.scope === 'user') {
      q = q.eq('owner_user_id', user.id);
    } // 'org' reserved for future org-scoped behavior

    const { data, error } = await q;
    if (error) return serverError(error.message, req);
    return ok({ items: data || [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// POST /v1/goals
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = goalCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  try {
    const supabase = getClientOrThrow(req);
    const insert = {
      ...parsed.data,
      owner_user_id: user.id,
      org_id: null,
      is_active: true,
      popularity_score: 0,
    } as any;
    const { data, error } = await supabase
      .from('message_goals')
      .insert([insert])
      .select('id, name, created_at')
      .single();
    if (error) return serverError(error.message, req);
    return created({ goal: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
