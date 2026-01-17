import { options, ok, serverError } from "@/lib/cors";
import { getServiceClient } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /api/cron/interaction-metrics
export async function GET(req: Request){
  try {
    const cronHeader = req.headers.get('x-vercel-cron');
    if (!cronHeader) {
      // Allow manual admin trigger without the Vercel header
      const user = await getUser(req);
      if (!user || !isAdmin(user.id)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('recompute_interaction_metrics');
    if (error) return serverError(error.message, req);

    return ok({ updated: data ?? 0 }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
