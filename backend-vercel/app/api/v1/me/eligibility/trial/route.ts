/**
 * GET /api/v1/me/eligibility/trial
 * 
 * Server-side determination of trial eligibility
 * Prevents client-side guessing and abuse
 */

import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    // Use database function for eligibility check
    const { data, error } = await supabase.rpc('check_trial_eligibility', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('[Trial Eligibility] Error:', error);
      return serverError(`Failed to check eligibility: ${error.message}`, req);
    }

    const result = data?.[0] || { eligible: false, reason: 'unknown', cooldown_until: null };

    return ok({
      eligible: result.eligible,
      reason: result.reason,
      cooldown_until: result.cooldown_until,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
