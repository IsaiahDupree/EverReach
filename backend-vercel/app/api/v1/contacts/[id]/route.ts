import { options, ok, unauthorized, serverError, notFound, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { contactUpdateSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('contacts')
    .select('id, display_name, emails, phones, company, notes, tags, avatar_url, photo_url, metadata, warmth, warmth_band, warmth_override, warmth_override_reason, last_interaction_at, created_at, updated_at')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return serverError(`Database error: ${error.message}`, req);
  if (!data) return notFound('Contact not found', req);
  return ok({ contact: data }, req);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  const rl = checkRateLimit(`u:${user.id}:PATCH:/v1/contacts/${params.id}`, 30, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON', req); }
  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const supabase = getClientOrThrow(req);
  const { data, error} = await supabase
    .from('contacts')
    .update(parsed.data as any)
    .eq('id', params.id)
    .select('id, display_name, emails, phones, company, notes, tags, avatar_url, photo_url, metadata, warmth, warmth_band, updated_at')
    .maybeSingle();

  if (error) return serverError(`Database update failed: ${error.message}`, req);
  if (!data) return notFound('Contact not found', req);
  return ok({ contact: data }, req);
}

export async function PUT(req: Request, { params }: { params: { id: string } }){
  return PATCH(req, { params });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  const rl = checkRateLimit(`u:${user.id}:DELETE:/v1/contacts/${params.id}`, 20, 60_000);
  if (!rl.allowed) return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);

  const supabase = getClientOrThrow(req);
  const { data, error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, deleted_at')
    .maybeSingle();

  if (error) return serverError(`Database delete failed: ${error.message}`, req);
  if (!data) return notFound('Contact not found', req);
  return ok({ deleted: true, contact: data }, req);
}
