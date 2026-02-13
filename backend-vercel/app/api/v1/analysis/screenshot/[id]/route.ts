import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/analysis/screenshot/:id
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('screenshot_analyses')
      .select('id, owner_user_id, contact_id, file_url, status, ocr_text, inferred_goal_id, inferred_goal_text, variables, confidence, created_at, updated_at')
      .eq('id', params.id)
      .maybeSingle();
    if (error) return serverError("Internal server error", req);
    if (!data) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    // Basic ownership check via RLS normally; here we ensure owner matches
    if (data.owner_user_id !== user.id) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    return ok({
      analysis_id: data.id,
      status: data.status,
      ocr_text: data.ocr_text,
      inferred_goal: data.inferred_goal_id ? { id: data.inferred_goal_id, text: data.inferred_goal_text } : null,
      variables: data.variables || {},
      confidence: data.confidence ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
