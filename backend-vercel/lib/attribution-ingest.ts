export const ATTRIBUTION_TEXT_LIMIT = 512;
export const ATTRIBUTION_URL_LIMIT = 2048;
export const SOURCE_PLATFORM_LIMIT = 100;
export const TOUCH_TOKEN_LIMIT = 256;

const RFC3339_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type ParseSuccess = {
  ok: true;
  expectedUserId: string | null;
  rpcParameters: Record<string, string | null>;
};

type ParseFailure = { ok: false; error: string };

export type AttributionIngestParseResult = ParseSuccess | ParseFailure;

type AnonymousTouchSuccess = {
  ok: true;
  rpcParameters: Record<string, string | null>;
};

export type AnonymousTouchParseResult = AnonymousTouchSuccess | ParseFailure;

function optionalText(
  body: Record<string, unknown>,
  field: string,
  maximum: number,
): string | null | ParseFailure {
  const raw = body[field];
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    return { ok: false, error: `${field} must be a string` };
  }
  const value = raw.trim();
  if (!value) return null;
  if (value.length > maximum) {
    return { ok: false, error: `${field} must be at most ${maximum} characters` };
  }
  return value;
}

export function parseAttributionIngestBody(
  input: unknown,
): AttributionIngestParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const body = input as Record<string, unknown>;
  const fields: Array<[string, number]> = [
    ['expected_user_id', ATTRIBUTION_TEXT_LIMIT],
    ['utm_source', SOURCE_PLATFORM_LIMIT],
    ['utm_medium', ATTRIBUTION_TEXT_LIMIT],
    ['utm_campaign', ATTRIBUTION_TEXT_LIMIT],
    ['utm_term', ATTRIBUTION_TEXT_LIMIT],
    ['utm_content', ATTRIBUTION_TEXT_LIMIT],
    ['referrer', ATTRIBUTION_URL_LIMIT],
    ['landing_page', ATTRIBUTION_URL_LIMIT],
    ['actp_content_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_published_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_campaign_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_offer_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_source_platform', SOURCE_PLATFORM_LIMIT],
    ['actp_touch_token', TOUCH_TOKEN_LIMIT],
    ['captured_at', ATTRIBUTION_TEXT_LIMIT],
  ];
  const values: Record<string, string | null> = {};
  for (const [field, maximum] of fields) {
    const value = optionalText(body, field, maximum);
    if (typeof value === 'object' && value !== null) return value;
    values[field] = value;
  }

  const capturedAt = values.captured_at;
  if (capturedAt && (
    !RFC3339_WITH_ZONE.test(capturedAt)
    || Number.isNaN(Date.parse(capturedAt))
  )) {
    return {
      ok: false,
      error: 'captured_at must be an RFC3339 timestamp with a timezone',
    };
  }

  return {
    ok: true,
    expectedUserId: values.expected_user_id,
    rpcParameters: {
      p_utm_source: values.utm_source,
      p_utm_medium: values.utm_medium,
      p_utm_campaign: values.utm_campaign,
      p_utm_term: values.utm_term,
      p_utm_content: values.utm_content,
      p_referrer: values.referrer,
      p_landing_page: values.landing_page,
      p_content_id: values.actp_content_id,
      p_source_id: values.actp_published_id,
      p_campaign_id: values.actp_campaign_id,
      p_offer_id: values.actp_offer_id,
      p_source_platform: values.actp_source_platform,
      p_touch_token: values.actp_touch_token,
      p_captured_at: capturedAt,
    },
  };
}

export function parseAnonymousAttributionTouchBody(
  input: unknown,
): AnonymousTouchParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const body = input as Record<string, unknown>;
  if (body.actp_touch_token !== undefined && body.actp_touch_token !== null) {
    return {
      ok: false,
      error: 'actp_touch_token is server-minted and must not be submitted',
    };
  }
  const fields: Array<[string, number]> = [
    ['utm_source', SOURCE_PLATFORM_LIMIT],
    ['utm_medium', ATTRIBUTION_TEXT_LIMIT],
    ['utm_campaign', ATTRIBUTION_TEXT_LIMIT],
    ['utm_term', ATTRIBUTION_TEXT_LIMIT],
    ['utm_content', ATTRIBUTION_TEXT_LIMIT],
    ['referrer', ATTRIBUTION_URL_LIMIT],
    ['landing_page', ATTRIBUTION_URL_LIMIT],
    ['actp_content_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_published_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_campaign_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_offer_id', ATTRIBUTION_TEXT_LIMIT],
    ['actp_source_platform', SOURCE_PLATFORM_LIMIT],
  ];
  const values: Record<string, string | null> = {};
  for (const [field, maximum] of fields) {
    const value = optionalText(body, field, maximum);
    if (typeof value === 'object' && value !== null) return value;
    values[field] = value;
  }
  const missing = [
    'actp_content_id',
    'actp_published_id',
    'actp_campaign_id',
    'actp_offer_id',
    'actp_source_platform',
  ].filter((field) => !values[field]);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing exact attribution fields: ${missing.join(', ')}`,
    };
  }
  return {
    ok: true,
    rpcParameters: {
      p_content_id: values.actp_content_id,
      p_source_id: values.actp_published_id,
      p_campaign_id: values.actp_campaign_id,
      p_offer_id: values.actp_offer_id,
      p_source_platform: values.actp_source_platform,
      p_utm_source: values.utm_source,
      p_utm_medium: values.utm_medium,
      p_utm_campaign: values.utm_campaign,
      p_utm_term: values.utm_term,
      p_utm_content: values.utm_content,
      p_referrer: values.referrer,
      p_landing_page: values.landing_page,
    },
  };
}
