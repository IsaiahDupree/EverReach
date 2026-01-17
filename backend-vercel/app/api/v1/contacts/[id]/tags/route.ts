import { options, ok, badRequest, unauthorized, serverError, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { tagsModifySchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const parsed = tagsModifySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message, req);
  const { add = [], remove = [] } = parsed.data;

  const supabase = getClientOrThrow(req);
  const { data: row, error: selErr } = await supabase
    .from('contacts')
    .select('id, tags')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (selErr) return serverError(`Database error: ${selErr.message}`, req);
  if (!row) return notFound('Contact not found', req);

  const tagSet = new Set<string>(Array.isArray(row.tags) ? row.tags : []);
  for (const t of add) tagSet.add(t);
  for (const t of remove) tagSet.delete(t);
  const nextTags = Array.from(tagSet);

  const { data, error } = await supabase
    .from('contacts')
    .update({ tags: nextTags })
    .eq('id', params.id)
    .select('id, tags, updated_at')
    .maybeSingle();
  if (error) return serverError(`Database update failed: ${error.message}`, req);
  if (!data) return notFound('Contact not found', req);
  return ok({ contact: data }, req);
}
