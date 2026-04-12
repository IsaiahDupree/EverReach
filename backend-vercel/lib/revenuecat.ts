/**
 * SunTrace — RevenueCat Server-Side Entitlements Validator
 *
 * Uses RevenueCat REST API v1 to validate subscriber entitlements.
 * Called from protected API routes to gate Pro/Family features server-side.
 *
 * Docs: https://www.revenuecat.com/docs/api-v1
 */

export type Entitlement = 'pro' | 'family';

export interface RevenueCatSubscription {
  expires_date: string | null;
  purchase_date: string;
  product_identifier: string;
  is_sandbox: boolean;
}

export interface RevenueCatEntitlementInfo {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
  is_active: boolean;
  will_renew: boolean;
  period_type: 'normal' | 'trial' | 'intro';
  is_sandbox: boolean;
}

export interface RevenueCatSubscriberInfo {
  request_date: string;
  subscriber: {
    original_app_user_id: string;
    entitlements: Record<string, RevenueCatEntitlementInfo>;
    subscriptions: Record<string, RevenueCatSubscription>;
    non_subscriptions: Record<string, unknown>;
    first_seen: string;
    last_seen: string;
    original_purchase_date?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRevenueCatApiKey(): string {
  const key = process.env.REVENUECAT_SECRET_KEY || process.env.REVENUECAT_API_KEY;
  if (!key) throw new Error('Missing REVENUECAT_SECRET_KEY env var');
  return key;
}

// ── Core: fetch subscriber ─────────────────────────────────────────────────────

/**
 * Fetch subscriber info from RevenueCat for a given app user ID.
 * app_user_id should be the Supabase user.id (configured in SDK via logIn()).
 */
export async function getSubscriber(appUserId: string): Promise<RevenueCatSubscriberInfo> {
  const apiKey = getRevenueCatApiKey();
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Platform': 'ios',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RevenueCat API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ── Entitlement check ──────────────────────────────────────────────────────────

/**
 * Check if a user has an active entitlement.
 *
 * @param appUserId  Supabase user.id (logged in via Purchases.logIn())
 * @param entitlement  'pro' | 'family'
 * @returns true if the entitlement exists and is active
 */
export async function hasEntitlement(
  appUserId: string,
  entitlement: Entitlement,
): Promise<boolean> {
  try {
    const info = await getSubscriber(appUserId);
    const ent = info.subscriber.entitlements[entitlement];
    return ent?.is_active === true;
  } catch {
    // If RevenueCat is unreachable, fail open (don't block legitimate users)
    // — consider fail-closed for high-security scenarios
    return false;
  }
}

/**
 * Returns the set of active entitlements for a user as a string array.
 * Empty array means free tier.
 */
export async function getActiveEntitlements(appUserId: string): Promise<Entitlement[]> {
  try {
    const info = await getSubscriber(appUserId);
    const active: Entitlement[] = [];

    for (const [key, ent] of Object.entries(info.subscriber.entitlements)) {
      if (ent.is_active && (key === 'pro' || key === 'family')) {
        active.push(key as Entitlement);
      }
    }

    return active;
  } catch {
    return [];
  }
}

// ── Webhook signature verification ────────────────────────────────────────────

/**
 * Verify a RevenueCat webhook payload using the HMAC-SHA256 signature.
 * RevenueCat sends: X-RevenueCat-Signature: v1=<hex>
 *
 * @param rawBody  Raw UTF-8 request body string
 * @param signature  Value from the X-RevenueCat-Signature header
 * @returns true if valid
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[revenuecat] REVENUECAT_WEBHOOK_SECRET not set');
    return false;
  }

  // Extract v1=<hex> portion
  const hexSig = signature.startsWith('v1=') ? signature.slice(3) : signature;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );

    const sigBytes = hexToBytes(hexSig);
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(rawBody),
    );

    return verified;
  } catch (e) {
    console.error('[revenuecat] signature verification error:', e);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
