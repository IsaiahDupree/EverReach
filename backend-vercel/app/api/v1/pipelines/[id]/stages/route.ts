import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/pipelines/:id/stages
// Note: here `id` is the pipeline key (e.g., 'business'), not the UUID
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const key = params.id;
  if (!key) return badRequest('missing_key', req);
  try {
    const supabase = getClientOrThrow(req);

    // Find pipeline id by key
    const { data: pipeline, error: pErr } = await supabase
      .from('pipelines')
      .select('id')
      .eq('key', key)
      .maybeSingle();
    if (pErr) return serverError(pErr.message, req);
    if (!pipeline) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('id, pipeline_id, key, name, position, terminal')
      .eq('pipeline_id', pipeline.id)
      .order('position', { ascending: true });
    if (error) return serverError(error.message, req);
    return ok({ items: data || [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
