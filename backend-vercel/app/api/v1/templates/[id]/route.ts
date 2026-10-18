import { options, ok, badRequest, serverError, unauthorized, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { templateUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/templates/:id
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('templates')
      .select('id, channel, name, description, subject_tmpl, body_tmpl, closing_tmpl, variables, visibility, is_default, created_at, updated_at')
      .eq('id', params.id)
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return notFound('Template not found', req);
    return ok({ template: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// PATCH /v1/templates/:id
export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = templateUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('templates')
      .update(parsed.data as any)
      .eq('id', params.id)
      .select('id, updated_at')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return notFound('Template not found', req);
    return ok({ template: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

// DELETE /v1/templates/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('templates')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return notFound('Template not found', req);
    return ok({ deleted: true, id: data.id }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
