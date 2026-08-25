import {
  badRequest,
  ok,
  options,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/cors';
import { getUser } from '@/lib/auth';
import {
  installHandoffMaxAgeMs,
  installRecoveryCodeToTouchToken,
  isInstallHandoffCapturedAtRedeemable,
} from '@/lib/attribution-install-handoff';
import { checkRateLimit } from '@/lib/rateLimit';
import { getOwnedOutcomeServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) { return options(req); }

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

type StoredAnonymousTouch = {
  touch_token: string;
  content_id: string;
  source_id: string;
  campaign_id: string;
  offer_id: string;
  source_platform: string;
  captured_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string | null;
  claimed_user_id: string | null;
};

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);
  const rate = checkRateLimit(
    `u:${user.id}:POST:/v1/attribution/handoff/redeem`,
    10,
    5 * 60_000,
  );
  if (!rate.allowed) {
    return tooManyRequests('Install recovery request limit exceeded', req);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON', req);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return badRequest('Request body must be a JSON object', req);
  }
  const record = body as Record<string, unknown>;
  const expectedUserId = optionalString(record.expected_user_id);
  if (!expectedUserId || expectedUserId !== user.id) {
    return badRequest('Attribution subject does not match authenticated user', req);
  }
  const recoveryCode = optionalString(record.recovery_code);
  const token = recoveryCode
    ? installRecoveryCodeToTouchToken(recoveryCode)
    : null;
  if (!token) return badRequest('Install recovery code is invalid or expired', req);

  try {
    const ownedOutcomeSupabase = getOwnedOutcomeServiceClient();
    const { data: storedTouchData, error: lookupError } = await ownedOutcomeSupabase
      .from('anonymous_attribution_touches')
      .select([
        'touch_token',
        'content_id',
        'source_id',
        'campaign_id',
        'offer_id',
        'source_platform',
        'captured_at',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'referrer',
        'landing_page',
        'claimed_user_id',
      ].join(','))
      .eq('touch_token', token)
      .maybeSingle();
    if (lookupError) {
      console.error('[Attribution Handoff] Lookup failed:', lookupError.code || lookupError.message);
      return serverError('Unable to recover install attribution', req);
    }
    if (!storedTouchData) {
      return badRequest('Install recovery code is invalid or expired', req);
    }
    const storedTouch = storedTouchData as unknown as StoredAnonymousTouch;
    if (storedTouch.claimed_user_id && storedTouch.claimed_user_id !== user.id) {
      return badRequest('Install recovery code is invalid or expired', req);
    }
    if (!isInstallHandoffCapturedAtRedeemable(
      storedTouch.captured_at,
      Date.now(),
      installHandoffMaxAgeMs(process.env.ATTRIBUTION_HANDOFF_MAX_AGE_DAYS),
    )) {
      return badRequest('Install recovery code is invalid or expired', req);
    }
    if (typeof storedTouch.landing_page !== 'string'
      || typeof storedTouch.captured_at !== 'string') {
      return serverError('Stored install attribution is incomplete', req);
    }

    const { data: result, error: persistError } = await ownedOutcomeSupabase.rpc(
      'upsert_attribution',
      {
        p_user_id: user.id,
        p_utm_source: storedTouch.utm_source,
        p_utm_medium: storedTouch.utm_medium,
        p_utm_campaign: storedTouch.utm_campaign,
        p_utm_term: storedTouch.utm_term,
        p_utm_content: storedTouch.utm_content,
        p_referrer: storedTouch.referrer,
        p_landing_page: storedTouch.landing_page,
        p_content_id: storedTouch.content_id,
        p_source_id: storedTouch.source_id,
        p_campaign_id: storedTouch.campaign_id,
        p_offer_id: storedTouch.offer_id,
        p_source_platform: storedTouch.source_platform,
        p_touch_token: storedTouch.touch_token,
        p_captured_at: storedTouch.captured_at,
      },
    );
    if (persistError) {
      console.error('[Attribution Handoff] Persist failed:', persistError.code || persistError.message);
      return badRequest('Install recovery code could not be associated with this account', req);
    }
    const rpcResult = result && typeof result === 'object' && !Array.isArray(result)
      ? result as Record<string, unknown>
      : {};
    return ok({
      ok: true,
      status: storedTouch.claimed_user_id ? 'idempotent_replay' : 'claimed',
      touch: {
        ...(optionalString(storedTouch.utm_source)
          ? { utm_source: storedTouch.utm_source }
          : {}),
        ...(optionalString(storedTouch.utm_medium)
          ? { utm_medium: storedTouch.utm_medium }
          : {}),
        ...(optionalString(storedTouch.utm_campaign)
          ? { utm_campaign: storedTouch.utm_campaign }
          : {}),
        ...(optionalString(storedTouch.utm_term)
          ? { utm_term: storedTouch.utm_term }
          : {}),
        ...(optionalString(storedTouch.utm_content)
          ? { utm_content: storedTouch.utm_content }
          : {}),
        ...(optionalString(storedTouch.referrer)
          ? { referrer: storedTouch.referrer }
          : {}),
        actp_content_id: storedTouch.content_id,
        actp_published_id: storedTouch.source_id,
        actp_campaign_id: storedTouch.campaign_id,
        actp_offer_id: storedTouch.offer_id,
        actp_source_platform: storedTouch.source_platform,
        actp_touch_token: storedTouch.touch_token,
        captured_at: storedTouch.captured_at,
        landing_page: storedTouch.landing_page,
      },
      owned_outcome_click: {
        status: rpcResult.outbox_status,
        event_id: rpcResult.outbox_event_id,
      },
    }, req);
  } catch (error) {
    console.error(
      '[Attribution Handoff] Unexpected failure:',
      error instanceof Error ? error.message : String(error),
    );
    return serverError('Unable to recover install attribution', req);
  }
}
