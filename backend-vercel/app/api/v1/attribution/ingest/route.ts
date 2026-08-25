/**
 * POST /api/v1/attribution/ingest
 * 
 * Capture immutable first-touch attribution data and, when every exact
 * content dimension is present, idempotently enqueue its click fact.
 * 
 * Body: {
 *   expected_user_id,
 *   utm_source, utm_medium, utm_campaign, utm_term, utm_content,
 *   referrer, landing_page, captured_at,
 *   actp_content_id, actp_published_id, actp_campaign_id,
 *   actp_offer_id, actp_touch_token
 * }
 */

import { badRequest, options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { parseAttributionIngestBody } from "@/lib/attribution-ingest";
import { getOwnedOutcomeServiceClient } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON', req);
    }
    const parsed = parseAttributionIngestBody(body);
    if (!parsed.ok) return badRequest(parsed.error, req);

    // The bearer token remains authoritative. This client-provided ID only
    // prevents an auth/session race from crediting a touch to the wrong user.
    if (parsed.expectedUserId && parsed.expectedUserId !== user.id) {
      return badRequest('Attribution subject does not match authenticated user', req);
    }

    const supabase = getOwnedOutcomeServiceClient();

    // Attribution and its optional click outbox fact are one database transaction.
    const { data, error } = await supabase.rpc('upsert_attribution', {
      p_user_id: user.id,
      ...parsed.rpcParameters,
    });

    if (error) {
      return serverError("Internal server error", req);
    }

    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    return ok({
      ok: true,
      attribution_subject_verified: Boolean(parsed.expectedUserId),
      attribution_inserted: result.attribution_inserted === true,
      owned_outcome_click: {
        status: typeof result.outbox_status === 'string'
          ? result.outbox_status
          : 'not_reported',
        inserted: result.outbox_inserted === true,
        event_id: typeof result.outbox_event_id === 'string'
          ? result.outbox_event_id
          : null,
        missing_dimensions: Array.isArray(result.missing_dimensions)
          ? result.missing_dimensions
          : [],
      },
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
