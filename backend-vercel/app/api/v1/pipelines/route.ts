import { options, ok, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/pipelines
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);
  try {
    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('pipelines')
      .select('id, key, name, created_at')
      .order('key', { ascending: true });
    if (error) return serverError(error.message, req);
    return ok({ items: data || [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
