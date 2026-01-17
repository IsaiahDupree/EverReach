import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { personaNoteUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/me/persona-notes/:id
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('persona_notes')
      .select('id, type, title, body_text, file_url, duration_sec, transcript, tags, contact_id, created_at, updated_at')
      .eq('id', params.id)
      .maybeSingle();
    if (error) return serverError(error.message, req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ note: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/me/persona-notes/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = personaNoteUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('persona_notes')
      .update(parsed.data)
      .eq('id', params.id)
      .select('id, updated_at')
      .maybeSingle();
    if (error) return serverError(error.message, req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ note: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// DELETE /v1/me/persona-notes/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('persona_notes')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle();
    if (error) return serverError(error.message, req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    return ok({ deleted: true, id: data.id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
