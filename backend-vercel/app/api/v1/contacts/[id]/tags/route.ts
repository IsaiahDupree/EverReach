import { options, ok, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { tagsModifySchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

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
  if (selErr) return new Response(JSON.stringify({ error: 'db_select_failed', details: selErr.message }), { status: 500 });
  if (!row) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

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
  if (error) return new Response(JSON.stringify({ error: 'db_update_failed', details: error.message }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return ok({ contact: data }, req);
}
