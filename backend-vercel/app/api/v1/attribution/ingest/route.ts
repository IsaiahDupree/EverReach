/**
 * POST /api/v1/attribution/ingest
 * 
 * Capture first-touch attribution data (UTMs, referrer, landing page)
 * Only stores first attribution - subsequent calls are no-ops
 * 
 * Body: {
 *   expected_user_id,
 *   utm_source, utm_medium, utm_campaign, utm_term, utm_content,
 *   referrer, landing_page
 * }
 */

import { badRequest, options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const {
      expected_user_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      referrer,
      landing_page,
    } = body;

    // The bearer token remains authoritative. This client-provided ID only
    // prevents an auth/session race from crediting a touch to the wrong user.
    if (expected_user_id && expected_user_id !== user.id) {
      return badRequest('Attribution subject does not match authenticated user', req);
    }

    const supabase = getClientOrThrow(req);

    // Use RPC function for first-touch only
    const { error } = await supabase.rpc('upsert_attribution', {
      p_user_id: user.id,
      p_utm_source: utm_source || null,
      p_utm_medium: utm_medium || null,
      p_utm_campaign: utm_campaign || null,
      p_utm_term: utm_term || null,
      p_utm_content: utm_content || null,
      p_referrer: referrer || null,
      p_landing_page: landing_page || null,
    });

    if (error) {
      return serverError("Internal server error", req);
    }

    return ok({ ok: true, attribution_subject_verified: Boolean(expected_user_id) }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
