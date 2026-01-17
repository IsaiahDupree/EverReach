import { options, ok, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { interactionCreateSchema } from "@/lib/validation";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/notes
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
  const cursor = url.searchParams.get('cursor') || undefined; // ISO of created_at

  const supabase = getClientOrThrow(req);
  
  // First check if contact exists and is not deleted
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();
  
  if (!contact) {
    return new Response(JSON.stringify({ error: 'contact_not_found' }), { status: 404 });
  }
  
  let sel = supabase.from('interactions')
    .select('id, contact_id, kind, channel, direction, summary, sentiment, content, metadata, occurred_at, created_at, updated_at')
    .eq('contact_id', params.id)
    .eq('kind', 'note')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (cursor) sel = sel.lt('created_at', cursor);

  const { data, error } = await sel;
  if (error) return new Response(JSON.stringify({ error: 'db_select_failed', details: error.message }), { status: 500 });
  const items = data ?? [];
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
  return ok({ items, limit, nextCursor }, req);
}

// POST /v1/contacts/:id/notes
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }

  const parsed = interactionCreateSchema.safeParse({
    contact_id: params.id,
    kind: 'note',
    content: body?.content,
    metadata: body?.metadata,
  });
  if (!parsed.success) return badRequest(parsed.error.message, req);

  const supabase = getClientOrThrow(req);
  
  // Check if contact exists and is not deleted
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();
  
  if (!contact) {
    return new Response(JSON.stringify({ error: 'contact_not_found' }), { status: 404 });
  }
  const { data, error } = await supabase
    .from('interactions')
    .insert([{ contact_id: parsed.data.contact_id, kind: 'note', content: parsed.data.content ?? null, metadata: parsed.data.metadata ?? {} }])
    .select('id, contact_id, kind, created_at')
    .single();
  if (error) return new Response(JSON.stringify({ error: 'db_insert_failed', details: error.message }), { status: 500 });
  return ok({ note: data }, req);
}
