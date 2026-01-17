import { options, ok, badRequest, unauthorized, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { interactionUpdateSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .select('id, contact_id, kind, content, metadata, occurred_at, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return serverError(`Database error: ${error.message}`, req);
  if (!data) return notFound('Interaction not found', req);
  return ok({ interaction: data }, req);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  const rl = checkRateLimit(`u:${user.id}:PATCH:/v1/interactions/${params.id}`, 60, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = interactionUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('interactions')
    .update(parsed.data as any)
    .eq('id', params.id)
    .select('id, updated_at')
    .maybeSingle();
  if (error) return serverError(`Database update failed: ${error.message}`, req);
  if (!data) return notFound('Interaction not found', req);
  return ok({ interaction: data }, req);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  const rl = checkRateLimit(`u:${user.id}:DELETE:/v1/interactions/${params.id}`, 60, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  const supabase = getClientOrThrow(req);
  
  // First verify the interaction exists and belongs to this user's org
  const { data: existing, error: fetchError } = await supabase
    .from('interactions')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchError) return serverError(`Database error: ${fetchError.message}`, req);
  if (!existing) return notFound('Interaction not found', req);

  // Delete the interaction
  const { data, error } = await supabase
    .from('interactions')
    .delete()
    .eq('id', params.id)
    .select('id')
    .maybeSingle();

  if (error) return serverError(`Delete failed: ${error.message}`, req);
  if (!data) return notFound('Interaction not found', req);

  return ok({ deleted: true, id: data.id }, req);
}
