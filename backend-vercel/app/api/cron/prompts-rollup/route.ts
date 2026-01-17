import { options, ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/cron/prompts-rollup
export async function GET(req: Request){
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('recompute_prompt_trending');
    if (error) return serverError(error.message, req);
    return ok({ updated: data ?? 0 }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
