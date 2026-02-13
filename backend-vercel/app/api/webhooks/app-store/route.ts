import { NextRequest, NextResponse } from 'next/server';
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

    // Decode JWTs (in production, verify signature with Apple's public key)
    const transactionInfo = decodeJWT(notification.data.signedTransactionInfo);
    const renewalInfo = notification.data.signedRenewalInfo 
      ? decodeJWT(notification.data.signedRenewalInfo) 
      : null;

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

/**
 * Decode JWT without verification (for development)
 * In production, verify signature with Apple's public key
 */
function decodeJWT(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  
  const payload = parts[1];
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}
