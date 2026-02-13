import { options, ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/cron/paywall-rollup
export async function GET(req: Request){
  try {
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('recompute_paywall_insights');
    if (error) return serverError(error.message, req);
    return ok({ updated: data ?? 0 }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
