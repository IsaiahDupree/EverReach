import { randomUUID, timingSafeEqual } from 'node:crypto';

import { badRequest, ok, options, unauthorized } from '@/lib/cors';
import { parseAnonymousAttributionTouchBody } from '@/lib/attribution-ingest';
import { signAttributionPublicationClaim } from '@/lib/attribution-publication';
import {
  buildAttributionTrackedUrl,
  InvalidAttributionDestinationError,
} from '@/lib/attribution-tracked-url';
import { getOwnedOutcomeServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) { return options(req); }

function authorized(req: Request, expected: string): boolean {
  const supplied = req.headers.get('authorization') || '';
  const wanted = `Bearer ${expected}`;
  const left = Buffer.from(supplied);
  const right = Buffer.from(wanted);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: Request) {
  const controlToken = process.env.ATTRIBUTION_PUBLICATION_CONTROL_TOKEN?.trim();
  const signingSecret = process.env.ATTRIBUTION_CLAIM_SIGNING_SECRET?.trim();
  if (!controlToken || !signingSecret) {
    return new Response(JSON.stringify({ error: 'Publication registry unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!authorized(req, controlToken)) return unauthorized('Unauthorized', req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON', req);
  }
  const parsed = parseAnonymousAttributionTouchBody(body);
  if (!parsed.ok) return badRequest(parsed.error, req);
  const record = body as Record<string, unknown>;
  const expiresInSeconds = record.expires_in_seconds === undefined
    ? 2_592_000
    : Number(record.expires_in_seconds);
  if (!Number.isInteger(expiresInSeconds)
    || expiresInSeconds < 60 || expiresInSeconds > 7_776_000) {
    return badRequest('expires_in_seconds must be from 60 to 7776000', req);
  }
  const publicationId = `publication_${randomUUID()}`;
  const claimNonce = `claim_${randomUUID()}`;
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const claim = {
    publication_id: publicationId,
    claim_nonce: claimNonce,
    content_id: String(parsed.rpcParameters.p_content_id),
    source_id: String(parsed.rpcParameters.p_source_id),
    campaign_id: String(parsed.rpcParameters.p_campaign_id),
    offer_id: String(parsed.rpcParameters.p_offer_id),
    source_platform: String(parsed.rpcParameters.p_source_platform).toLowerCase(),
    expires_at: expiresAtSeconds,
  };
  const signedClaim = signAttributionPublicationClaim(claim, signingSecret);
  let trackedUrl: string;
  try {
    trackedUrl = buildAttributionTrackedUrl(
      record.destination_url,
      {
        contentId: claim.content_id,
        publishedId: claim.source_id,
        campaignId: claim.campaign_id,
        offerId: claim.offer_id,
        sourcePlatform: claim.source_platform,
      },
      signedClaim,
      {
        utmSource: parsed.rpcParameters.p_utm_source,
        utmMedium: parsed.rpcParameters.p_utm_medium,
        utmCampaign: parsed.rpcParameters.p_utm_campaign,
        utmTerm: parsed.rpcParameters.p_utm_term,
        utmContent: parsed.rpcParameters.p_utm_content,
      },
    );
  } catch (error) {
    if (error instanceof InvalidAttributionDestinationError) {
      return badRequest(error.message, req);
    }
    throw error;
  }
  const { error } = await getOwnedOutcomeServiceClient().rpc('register_attribution_publication', {
    p_publication_id: publicationId,
    p_claim_nonce: claimNonce,
    p_content_id: claim.content_id,
    p_source_id: claim.source_id,
    p_campaign_id: claim.campaign_id,
    p_offer_id: claim.offer_id,
    p_source_platform: claim.source_platform,
    p_expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
  });
  if (error) {
    console.error('[Attribution Publication] Registration failed:', error.code);
    return new Response(JSON.stringify({ error: 'Publication registration failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  return ok({
    ok: true,
    publication_id: publicationId,
    expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
    actp_publication_claim: signedClaim,
    tracked_url: trackedUrl,
  }, req);
}
