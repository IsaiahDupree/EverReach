import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AttributionPublicationClaim {
  publication_id: string;
  claim_nonce: string;
  content_id: string;
  source_id: string;
  campaign_id: string;
  offer_id: string;
  source_platform: string;
  expires_at: number;
}

function encodedPayload(claim: AttributionPublicationClaim): string {
  return Buffer.from(JSON.stringify(claim), 'utf8').toString('base64url');
}

export function signAttributionPublicationClaim(
  claim: AttributionPublicationClaim,
  secret: string,
): string {
  const encoded = encodedPayload(claim);
  const signature = createHmac('sha256', secret)
    .update(`v1.${encoded}`, 'utf8')
    .digest('hex');
  return `v1.${encoded}.${signature}`;
}

export function verifyAttributionPublicationClaim(
  compact: string,
  secret: string,
  nowMs: number = Date.now(),
): AttributionPublicationClaim | null {
  const parts = compact.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1'
    || !/^[A-Za-z0-9_-]+$/.test(parts[1])
    || !/^[0-9a-f]{64}$/i.test(parts[2])) return null;
  const expected = createHmac('sha256', secret)
    .update(`v1.${parts[1]}`, 'utf8')
    .digest();
  const supplied = Buffer.from(parts[2], 'hex');
  if (supplied.length !== expected.length
    || !timingSafeEqual(supplied, expected)) return null;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const claim = value as Record<string, unknown>;
  const required = [
    'publication_id', 'claim_nonce', 'content_id', 'source_id',
    'campaign_id', 'offer_id', 'source_platform',
  ];
  if (required.some((field) => typeof claim[field] !== 'string'
    || !String(claim[field]).trim())
    || !Number.isInteger(claim.expires_at)
    || Number(claim.expires_at) * 1000 <= nowMs) return null;
  return claim as unknown as AttributionPublicationClaim;
}

export function publicationClaimMatches(
  claim: AttributionPublicationClaim,
  values: Record<string, string | null>,
): boolean {
  return claim.content_id === values.actp_content_id
    && claim.source_id === values.actp_published_id
    && claim.campaign_id === values.actp_campaign_id
    && claim.offer_id === values.actp_offer_id
    && claim.source_platform === values.actp_source_platform;
}

export function requesterHash(identity: string, secret: string): string {
  return createHmac('sha256', secret).update(identity, 'utf8').digest('hex');
}
