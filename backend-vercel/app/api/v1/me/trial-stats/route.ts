import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { computeTrialStats } from "@/lib/trial-stats";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * GET /v1/me/trial-stats
 * 
 * Returns comprehensive trial statistics for the authenticated user:
 * - Entitlement status (active, trial, grace, none)
 * - Subscription date (when user first subscribed)
 * - Trial window (start, end, days used/left)
 * - Usage tracking (total + during trial)
 * - Activity metrics (first seen, last active, sessions)
 * - Period information (billing cycle, cancellation)
 * 
 * Single payload for frontend entitlement gating + trial UI
 */
export async function GET(req: Request){
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const supabase = getClientOrThrow(req);

  try {
    // Compute comprehensive trial statistics using single source of truth
    const stats = await computeTrialStats(user.id, supabase);
    
    // Add backward-compatible top-level fields for tests
    const response = {
      ...stats,
      is_trial: stats.entitlement_reason === 'trial',
      trial_ends_at: stats.trial.ends_at,
      days_remaining: stats.trial.days_left,
    };
    
    return ok(response, req);

  } catch (error: any) {
    console.error('[Trial Stats] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
