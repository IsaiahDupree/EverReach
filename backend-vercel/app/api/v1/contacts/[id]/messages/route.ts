import { options, ok, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/messages – unified timeline (messages + interactions)
// Query params: limit (default 20), cursor (ISO created_at)
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
  const cursor = url.searchParams.get('cursor') || undefined;

  const supabase = getClientOrThrow(req);

  // Interactions for this contact
  let qInter = supabase
    .from('interactions')
    .select('id, kind, content, metadata, created_at')
    .eq('contact_id', params.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (cursor) qInter = qInter.lt('created_at', cursor);
  const { data: interactions, error: interErr } = await qInter;
  if (interErr) return new Response(JSON.stringify({ error: 'db_select_failed', details: interErr.message }), { status: 500 });

  // Messages tagged with this contact via metadata.contact_id
  let qMsg = supabase
    .from('messages')
    .select('id, thread_id, role, content, metadata, created_at')
    .contains('metadata', { contact_id: params.id } as any)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (cursor) qMsg = qMsg.lt('created_at', cursor);
  const { data: messages, error: msgErr } = await qMsg;
  if (msgErr) return new Response(JSON.stringify({ error: 'db_select_failed', details: msgErr.message }), { status: 500 });

  const mapped = [
    ...(interactions || []).map(i => ({ type: 'interaction' as const, id: i.id, created_at: i.created_at, payload: i })),
    ...(messages || []).map(m => ({ type: 'message' as const, id: m.id, created_at: m.created_at, payload: m })),
  ];
  mapped.sort((a, b) => (a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0));
  const items = mapped.slice(0, limit);
  const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;

  return ok({ items, limit, nextCursor }, req);
}
