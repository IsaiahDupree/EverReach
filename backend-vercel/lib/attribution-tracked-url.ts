import { parse as parseQuery, stringify as stringifyQuery } from 'node:querystring';

import { ATTRIBUTION_URL_LIMIT } from '@/lib/attribution-ingest';

export interface AttributionTrackedUrlDimensions {
  contentId: string;
  publishedId: string;
  campaignId: string;
  offerId: string;
  sourcePlatform: string;
}

export interface AttributionTrackedUrlMarketing {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
}

export class InvalidAttributionDestinationError extends Error {}

type QueryRecord = ReturnType<typeof parseQuery>;

const CONTROLLED_QUERY_PARAMETERS = new Set([
  'actp_content_id',
  'actp_published_id',
  'actp_campaign_id',
  'actp_offer_id',
  'actp_source_platform',
  'actp_publication_claim',
  'actp_touch_token',
]);

function parseDestination(value: unknown): globalThis.URL {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidAttributionDestinationError(
      'destination_url must be a non-empty HTTPS URL',
    );
  }
  const normalized = value.trim();
  if (normalized.length > ATTRIBUTION_URL_LIMIT) {
    throw new InvalidAttributionDestinationError(
      `destination_url must be at most ${ATTRIBUTION_URL_LIMIT} characters`,
    );
  }
  let destination: globalThis.URL;
  try {
    destination = new globalThis.URL(normalized);
  } catch {
    throw new InvalidAttributionDestinationError(
      'destination_url must be a valid absolute HTTPS URL',
    );
  }
  if (destination.protocol !== 'https:') {
    throw new InvalidAttributionDestinationError(
      'destination_url must use HTTPS',
    );
  }
  if (destination.username || destination.password) {
    throw new InvalidAttributionDestinationError(
      'destination_url must not contain credentials',
    );
  }
  return destination;
}

function queryRecord(value: string): QueryRecord {
  return parseQuery(value);
}

function removeReservedKeys(query: QueryRecord): void {
  for (const key of Object.keys(query)) {
    if (CONTROLLED_QUERY_PARAMETERS.has(key.toLowerCase())) delete query[key];
  }
}

export function buildAttributionTrackedUrl(
  destinationValue: unknown,
  dimensions: AttributionTrackedUrlDimensions,
  publicationClaim: string,
  marketing: AttributionTrackedUrlMarketing = {},
): string {
  const destination = parseDestination(destinationValue);
  const canonical = destination.href;
  const hashIndex = canonical.indexOf('#');
  const fragment = hashIndex >= 0 ? canonical.slice(hashIndex) : '';
  const withoutFragment = hashIndex >= 0 ? canonical.slice(0, hashIndex) : canonical;
  const queryIndex = withoutFragment.indexOf('?');
  const base = queryIndex >= 0
    ? withoutFragment.slice(0, queryIndex)
    : withoutFragment;
  const query = queryRecord(
    queryIndex >= 0 ? withoutFragment.slice(queryIndex + 1) : '',
  );
  removeReservedKeys(query);

  Object.assign(query, {
    actp_content_id: dimensions.contentId,
    actp_published_id: dimensions.publishedId,
    actp_campaign_id: dimensions.campaignId,
    actp_offer_id: dimensions.offerId,
    actp_source_platform: dimensions.sourcePlatform,
    actp_publication_claim: publicationClaim,
  });

  const optionalMarketing: Record<string, string | null | undefined> = {
    utm_source: marketing.utmSource,
    utm_medium: marketing.utmMedium,
    utm_campaign: marketing.utmCampaign,
    utm_term: marketing.utmTerm,
    utm_content: marketing.utmContent,
  };
  for (const [key, value] of Object.entries(optionalMarketing)) {
    if (value) query[key] = value;
  }

  const encodedQuery = stringifyQuery(query);
  const trackedUrl = `${base}?${encodedQuery}${fragment}`;
  if (trackedUrl.length > ATTRIBUTION_URL_LIMIT) {
    throw new InvalidAttributionDestinationError(
      `tracked_url must be at most ${ATTRIBUTION_URL_LIMIT} characters`,
    );
  }
  return trackedUrl;
}
