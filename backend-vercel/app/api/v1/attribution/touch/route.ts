import { badRequest, ok, options, serverError, tooManyRequests } from '@/lib/cors';
import {
  requesterHash,
  verifyAttributionPublicationClaim,
} from '@/lib/attribution-publication';
import { parseAnonymousAttributionTouchBody } from '@/lib/attribution-ingest';
import { getOwnedOutcomeServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON', req);
  }
  const parsed = parseAnonymousAttributionTouchBody(body);
  if (!parsed.ok) return badRequest(parsed.error, req);

  const signingSecret = process.env.ATTRIBUTION_CLAIM_SIGNING_SECRET?.trim();
  if (!signingSecret) {
    return new Response(JSON.stringify({ error: 'Attribution issuance unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const bodyRecord = body as Record<string, unknown>;
  const compactClaim = typeof bodyRecord.actp_publication_claim === 'string'
    ? bodyRecord.actp_publication_claim.trim()
    : '';
  const claim = verifyAttributionPublicationClaim(compactClaim, signingSecret);
  if (!claim
    || claim.content_id !== parsed.rpcParameters.p_content_id
    || claim.source_id !== parsed.rpcParameters.p_source_id
    || claim.campaign_id !== parsed.rpcParameters.p_campaign_id
    || claim.offer_id !== parsed.rpcParameters.p_offer_id
    || claim.source_platform !== parsed.rpcParameters.p_source_platform) {
    return badRequest('A valid registered publication claim is required', req);
  }
  const forwarded = process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for')
    : req.headers.get('x-forwarded-for');
  const requesterIdentity = forwarded?.split(',')[0].trim() || 'unavailable';

  const { data, error } = await getOwnedOutcomeServiceClient().rpc(
    'create_anonymous_attribution_touch',
    {
      ...parsed.rpcParameters,
      p_publication_id: claim.publication_id,
      p_claim_nonce: claim.claim_nonce,
      p_requester_hash: requesterHash(requesterIdentity, signingSecret),
    },
  );
  if (error) {
    if (error.code === '54000') {
      return tooManyRequests('Anonymous attribution touch rate limit exceeded', req);
    }
    console.error('[Attribution Touch] Create failed:', error.code || error.message);
    return serverError('Unable to record anonymous attribution touch', req);
  }
  const result = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  if (typeof result.touch_token !== 'string'
    || typeof result.captured_at !== 'string') {
    return serverError('Anonymous attribution touch was not persisted', req);
  }
  return ok({
    ok: true,
    touch_token: result.touch_token,
    captured_at: result.captured_at,
    owned_outcome_click: {
      status: result.outbox_status,
      event_id: result.outbox_event_id,
    },
  }, req);
}
