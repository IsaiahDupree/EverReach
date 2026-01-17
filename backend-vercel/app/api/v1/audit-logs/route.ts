import { options, ok } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/audit-logs?cursor=&limit=
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user || !isAdmin(user.id)) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)));
  const cursor = url.searchParams.get('cursor');

  const supabase = getServiceClient();
  let q = supabase.from('audit_logs')
    .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cursor) q = q.lt('created_at', cursor);
  const { data, error } = await q;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const nextCursor = (data && data.length === limit) ? data[data.length - 1].created_at : null;
  return ok({ items: data ?? [], nextCursor, limit }, req);
}
