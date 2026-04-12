// POST /api/v1/revenuecat-webhook
// RevenueCat webhook handler for SunTrace subscription lifecycle events.
//
// Validates the X-RevenueCat-Signature HMAC header, then maps event types to
// entitlement records in Supabase.
//
// Handled events:
//   INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION,
//   BILLING_ISSUE, UNCANCELLATION

import { ok, unauthorized, serverError, options } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'UNCANCELLATION'
  | 'PRODUCT_CHANGE'
  | 'REFUND'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIBER_ALIAS';

interface RCWebhookPayload {
  event: {
    type: RCEventType;
    id: string;
    app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    environment: 'SANDBOX' | 'PRODUCTION';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    period_type?: 'TRIAL' | 'NORMAL' | 'INTRO';
    store?: string;
    cancellation_date_ms?: number | null;
  };
}

// ── Signature verification (Web Crypto API — edge compatible) ─────────────────

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    // Convert ArrayBuffer to hex string
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return expected === signature.toLowerCase();
  } catch {
    return false;
  }
}

// ── Entitlement status derivation ─────────────────────────────────────────────

type EntitlementStatus = 'active' | 'trial' | 'canceled' | 'expired' | 'billing_issue';

function deriveStatus(event: RCWebhookPayload['event']): EntitlementStatus {
  switch (event.type) {
    case 'INITIAL_PURCHASE':
      return event.period_type === 'TRIAL' ? 'trial' : 'active';
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
      return 'active';
    case 'CANCELLATION':
      return 'canceled';
    case 'EXPIRATION':
    case 'REFUND':
      return 'expired';
    case 'BILLING_ISSUE':
      return 'billing_issue';
    default:
      return 'active';
  }
}

function derivePlan(productId: string, entitlementIds: string[]): string {
  const all = [productId, ...entitlementIds].join(' ').toLowerCase();
  if (all.includes('premium') || all.includes('pro')) return 'premium';
  if (all.includes('plus')) return 'plus';
  return 'free';
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET not set');
    return serverError('Server misconfigured', req);
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('x-revenuecat-signature');

  if (!(await verifySignature(rawBody, signature, secret))) {
    console.warn('[revenuecat-webhook] Invalid signature');
    return unauthorized('Invalid webhook signature', req);
  }

  let payload: RCWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return serverError('Invalid JSON body', req);
  }

  const event = payload?.event;
  if (!event?.type || !event?.app_user_id) {
    return serverError('Malformed webhook payload', req);
  }

  const supabase = getServiceClient();

  const userId = event.app_user_id;
  const status = deriveStatus(event);
  const plan = derivePlan(event.product_id, event.entitlement_ids ?? []);
  const valid_until = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  try {
    const { error } = await supabase
      .from('entitlements')
      .upsert(
        {
          user_id: userId,
          plan,
          status,
          valid_until,
          source: 'revenuecat',
          product_id: event.product_id,
          environment: event.environment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[revenuecat-webhook] Supabase upsert error:', error);
      return serverError(`Failed to update entitlements: ${error.message}`, req);
    }

    console.log(
      `[revenuecat-webhook] Processed ${event.type} for user=${userId} plan=${plan} status=${status}`
    );

    return ok({ success: true, event_type: event.type, user_id: userId }, req);
  } catch (err: any) {
    console.error('[revenuecat-webhook] Unexpected error:', err?.message ?? err);
    return serverError(`Webhook processing failed: ${err?.message ?? 'Unknown error'}`, req);
  }
}
