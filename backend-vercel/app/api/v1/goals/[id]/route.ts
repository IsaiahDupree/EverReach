import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { goalUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/goals/:id (optional helper)
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('message_goals')
      .select('id, org_id, owner_user_id, kind, name, description, channel_suggestions, variables_schema, default_template_id, is_active, popularity_score, created_at, updated_at')
      .eq('id', params.id)
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ goal: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/goals/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('message_goals')
      .update(parsed.data as any)
      .eq('id', params.id)
      .eq('owner_user_id', user.id)
      .select('id, updated_at')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ goal: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// DELETE /v1/goals/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('message_goals')
      .delete()
      .eq('id', params.id)
      .eq('owner_user_id', user.id)
      .select('id')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ deleted: true, id: data.id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
