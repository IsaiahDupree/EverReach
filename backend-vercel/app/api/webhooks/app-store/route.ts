import { NextRequest, NextResponse } from 'next/server';
import { compactVerify, createRemoteJWKSet } from 'jose';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { normalizeSubscriptionStatus } from '@/lib/receipt-validation';

/**
 * POST /api/webhooks/app-store
 * 
 * Handles Apple App Store Server-to-Server Notifications (V2)
 * Documentation: https://developer.apple.com/documentation/appstoreservernotifications
 * 
 * Event types:
 * - DID_RENEW: Subscription renewed
 * - DID_CHANGE_RENEWAL_STATUS: Auto-renew status changed
 * - DID_FAIL_TO_RENEW: Renewal failed (billing issue)
 * - EXPIRED: Subscription expired
 * - REFUND: Refund issued
 * - REVOKE: Subscription revoked
 * - GRACE_PERIOD_EXPIRED: Grace period ended
 */

export const runtime = 'nodejs';

interface AppleNotification {
  notificationType: string;
  subtype?: string;
  data: {
    bundleId: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string; // JWT
    signedRenewalInfo?: string; // JWT
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notification: AppleNotification = body;

    console.log('[App Store Webhook] Received:', notification.notificationType);

    // Verify + decode the Apple-signed JWTs. This is the only thing standing
    // between "Apple told us this happened" and "an attacker's HTTP client
    // told us this happened" — do not trust the payload before this passes.
    let transactionInfo: any;
    let renewalInfo: any = null;
    try {
      transactionInfo = await decodeVerifiedAppleJWT(notification.data.signedTransactionInfo);
      renewalInfo = notification.data.signedRenewalInfo
        ? await decodeVerifiedAppleJWT(notification.data.signedRenewalInfo)
        : null;
    } catch (verifyError: any) {
      console.error('[App Store Webhook] Signature verification failed:', verifyError?.message || verifyError);
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }

    const originalTransactionId = transactionInfo.originalTransactionId;
    const productId = transactionInfo.productId;
    const expiresDate = transactionInfo.expiresDate 
      ? new Date(parseInt(transactionInfo.expiresDate)).toISOString()
      : null;

    // Find subscription in database
    const supabase = getSupabaseServiceClient();
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('origin', 'app_store')
      .eq('provider_subscription_id', originalTransactionId)
      .maybeSingle();

    if (!sub) {
      console.warn(`[App Store Webhook] Subscription not found: ${originalTransactionId}`);
      return NextResponse.json({ received: true, warning: 'subscription_not_found' });
    }

    // Handle different notification types
    let newStatus = sub.status;
    let updates: any = {};

    switch (notification.notificationType) {
      case 'DID_RENEW':
        newStatus = 'active';
        updates = {
          status: 'active',
          current_period_end: expiresDate,
          cancel_at_period_end: false,
          canceled_at: null
        };
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        const autoRenewEnabled = renewalInfo?.autoRenewStatus === 1;
        if (!autoRenewEnabled) {
          // User canceled (will remain active until period end)
          updates = {
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString()
          };
        } else {
          // User reactivated
          updates = {
            cancel_at_period_end: false,
            canceled_at: null
          };
        }
        break;

      case 'DID_FAIL_TO_RENEW':
        newStatus = 'billing_issue';
        updates = {
          status: 'billing_issue'
        };
        break;

      case 'EXPIRED':
        newStatus = 'expired';
        updates = {
          status: 'expired'
        };
        break;

      case 'REFUND':
        newStatus = 'canceled';
        updates = {
          status: 'canceled',
          canceled_at: new Date().toISOString()
        };
        break;

      case 'GRACE_PERIOD_EXPIRED':
        newStatus = 'expired';
        updates = {
          status: 'expired'
        };
        break;

      default:
        console.log(`[App Store Webhook] Unhandled type: ${notification.notificationType}`);
    }

    // Update subscription
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', sub.id);

      // Log audit event
      await supabase.rpc('log_subscription_audit', {
        p_user_id: sub.user_id,
        p_event_type: 'provider_webhook',
        p_provider: 'app_store',
        p_provider_subscription_id: originalTransactionId,
        p_old_status: sub.status,
        p_new_status: newStatus,
        p_payload: {
          notification_type: notification.notificationType,
          subtype: notification.subtype,
          product_id: productId,
          environment: notification.data.environment
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[App Store Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// IMPORTANT — this is a fail-closed stopgap, not Apple's real verification
// protocol. Apple does NOT publish a public JWKS for signedTransactionInfo /
// signedRenewalInfo JWS payloads; those are signed with a leaf certificate
// whose x5c chain must be validated against Apple's pinned Root CA (see
// https://www.apple.com/certificateauthority/), which is what Apple's own
// `app-store-server-library` (SignedDataVerifier) does. Confirmed by probe:
// every path under api.storekit.itunes.apple.com — including nonexistent
// ones — returns 401 "Unauthenticated" (it's an authenticated App Store
// Server API host, not a JWKS host), so createRemoteJWKSet() against it can
// NEVER resolve a key. That makes this handler fail-closed for EVERY
// notification, forged or genuine: forged payloads are correctly rejected
// (closing the entitlement-bypass hole), but genuine Apple renewal/refund/
// expiration notifications will also 401 and never update subscription
// state until real x5c chain verification (pinned Apple Root CA +
// APPLE_APPSTORE_BUNDLE_ID) replaces this. The identical gap exists in the
// sibling /api/v1/webhooks/app-store handler.
const APPLE_JWKS_URL =
  process.env.APPLE_JWKS_URL || 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/jwsKeys';
// Verification is only skippable in local/dev via APPLE_ASN_VERIFY=false; it
// defaults to ON (fail-closed) everywhere else, matching /api/v1/webhooks/app-store.
const APPLE_ASN_VERIFY = (process.env.APPLE_ASN_VERIFY || 'true').toLowerCase() !== 'false';
const appleJWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

/**
 * Verify an Apple-signed JWS against Apple's published keys and decode its
 * payload. Throws if the signature is missing, malformed, or does not
 * verify — callers must NOT act on the payload unless this resolves.
 */
async function decodeVerifiedAppleJWT(token: string): Promise<any> {
  if (APPLE_ASN_VERIFY) {
    const verified = await compactVerify(token, appleJWKS);
    return JSON.parse(new TextDecoder().decode(verified.payload));
  }

  // Verification explicitly disabled — local/dev only (APPLE_ASN_VERIFY=false).
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
}
