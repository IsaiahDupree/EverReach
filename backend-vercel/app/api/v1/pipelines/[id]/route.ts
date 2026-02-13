import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/pipelines/:id
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('pipelines')
      .select('id, key, name, created_at')
      .eq('id', params.id)
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ pipeline: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/pipelines/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  
  if (!body || typeof body !== 'object') return badRequest('invalid_body', req);
  const { name } = body as any;
  if (!name || typeof name !== 'string') return badRequest('name_required', req);

  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('pipelines')
      .update({ name })
      .eq('id', params.id)
      .select('id, key, name, updated_at')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ pipeline: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// DELETE /v1/pipelines/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ deleted: true, id: data.id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
