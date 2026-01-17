import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/ops/health
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user || !isAdmin(user.id)) return unauthorized("Forbidden: Admin access required", req);

  // Minimal stub; cron timestamps can be stored in a settings table in future.
  const now = new Date().toISOString();
  const gauges: any = {
    cron: {
      prompts_rollup_last_run: process.env.PROMPTS_ROLLUP_LAST_RUN || null,
      paywall_rollup_last_run: process.env.PAYWALL_ROLLUP_LAST_RUN || null,
    },
    queues: {
      jobs_pending: null,
    }
  };

  try {
    const supabase = getServiceClient();
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    gauges.queues.jobs_pending = count ?? 0;
  } catch {
    // ignore failures in health
  }

  return ok({ status: 'ok', time: now, gauges }, req);
}
