import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/pipeline/history?limit=&cursor=
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get('limit') || '20');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
    const cursor = url.searchParams.get('cursor') || undefined; // ISO of created_at

    const supabase = getClientOrThrow(req);
    let sel = supabase
      .from('contact_pipeline_history')
      .select('id, contact_id, pipeline_id, from_stage_id, to_stage_id, changed_by_user_id, reason, created_at')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (cursor) sel = sel.lt('created_at', cursor);

    const { data, error } = await sel;
    if (error) return serverError("Internal server error", req);

    const items = data ?? [];
    const nextCursor = items.length === limit ? items[items.length - 1]?.created_at : null;
    return ok({ items, limit, nextCursor }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
