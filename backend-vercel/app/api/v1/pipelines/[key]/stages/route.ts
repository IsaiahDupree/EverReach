import { options, ok, badRequest, serverError, unauthorized, notFound } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/pipelines/:key/stages
export async function GET(req: Request, { params }: { params: { key: string } }){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);
  const key = params.key;
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
    if (!pipeline) return notFound('not_found', req);

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
