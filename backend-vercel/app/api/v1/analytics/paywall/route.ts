/**
 * POST /api/v1/analytics/paywall
 *
 * Receives paywall events from the iOS app and writes them to
 * paywall_analytics_events (the canonical table from migration
 * 20251112_paywall_experiments_analytics.sql).
 *
 * Body: { event_type, platform?, config_snapshot?, metadata?, occurred_at? }
 *
 * event_type values: impression | cta_click | dismissed | skipped |
 *                    checkout_started | checkout_completed | checkout_cancelled
 */

import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const { event_type, platform, config_snapshot, metadata, occurred_at } = body;

    if (!event_type) {
      return badRequest("event_type is required", req);
    }

    const supabase = getClientOrThrow(req);

    const { data, error } = await supabase
      .from("paywall_analytics_events")
      .insert({
        event_type,
        user_id: user.id,
        platform: platform || "mobile",
        config_snapshot: config_snapshot || null,
        metadata: metadata || null,
        occurred_at: occurred_at || new Date().toISOString(),
      })
      .select("id, occurred_at")
      .single();

    if (error) {
      console.error("[Paywall Analytics] insert error:", error.message);
      return serverError("Internal server error", req);
    }

    return ok({ ok: true, event_id: data.id, recorded_at: data.occurred_at }, req);
  } catch (e: any) {
    return serverError(e?.message || "Internal error", req);
  }
}
