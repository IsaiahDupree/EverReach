import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { google } from 'googleapis';

/**
 * POST /api/webhooks/play
 * 
 * Handles Google Play Real-Time Developer Notifications
 * Documentation: https://developer.android.com/google/play/billing/rtdn-reference
 * 
 * Notification types:
 * - SUBSCRIPTION_PURCHASED: New subscription
 * - SUBSCRIPTION_RENEWED: Subscription renewed
 * - SUBSCRIPTION_CANCELED: User canceled (still active until expiry)
 * - SUBSCRIPTION_IN_GRACE_PERIOD: Payment failed, in grace period
 * - SUBSCRIPTION_ON_HOLD: Subscription on hold (billing retry)
 * - SUBSCRIPTION_PAUSED: Subscription paused by user
 * - SUBSCRIPTION_REVOKED: Subscription refunded/revoked
 * - SUBSCRIPTION_EXPIRED: Subscription expired
 */

export const runtime = 'nodejs';

interface PlayNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: {
    version: string;
  };
}

// Notification type constants
const NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
};

// A Pub/Sub push envelope proves nothing by itself — Google's own RTDN docs
// require treating the notification purely as a "something changed, go
// check" signal and re-fetching the real state from the Play Developer API
// before acting on it. purchaseToken/notificationType in the POST body are
// entirely attacker-controlled (this endpoint has no push-auth check), so we
// MUST NOT grant/extend entitlement based on them directly. This mirrors the
// verification already done by the sibling /api/v1/webhooks/play handler.
interface VerifiedPlaySubscription {
  isActiveNow: boolean;
  autoRenewing: boolean;
  cancelReason: number | null;
  expiryTimeMillis: number | null;
}

async function verifyPlaySubscription(
  subscriptionId: string,
  purchaseToken: string
): Promise<VerifiedPlaySubscription> {
  const packageName = process.env.PLAY_PACKAGE_NAME;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!packageName || !serviceAccountJson) {
    throw new Error('Server misconfigured: PLAY_PACKAGE_NAME or GOOGLE_SERVICE_ACCOUNT_JSON not set');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const publisher = google.androidpublisher({ version: 'v3', auth });

  // Throws (404/400/401) if the token is forged, revoked, or belongs to a
  // different app/subscription — callers must not act on the notification
  // unless this resolves.
  const resp = await publisher.purchases.subscriptions.get({
    packageName,
    subscriptionId,
    token: purchaseToken,
  });

  const data = resp.data || {};
  const expiryTimeMillis = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : null;
  const isActiveNow = expiryTimeMillis != null && expiryTimeMillis > Date.now();

  return {
    isActiveNow,
    autoRenewing: Boolean(data.autoRenewing),
    cancelReason: data.cancelReason ?? null,
    expiryTimeMillis,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Google sends base64-encoded message in Pub/Sub format
    const body = await req.json();
    const message = body.message;
    
    if (!message || !message.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Decode base64 data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification: PlayNotification = JSON.parse(decodedData);

    // Handle test notifications
    if (notification.testNotification) {
      console.log('[Play Webhook] Test notification received');
      return NextResponse.json({ received: true, test: true });
    }

    if (!notification.subscriptionNotification) {
      return NextResponse.json({ received: true, warning: 'not_subscription' });
    }

    const subNotif = notification.subscriptionNotification;
    const notificationType = NOTIFICATION_TYPES[subNotif.notificationType] || 'UNKNOWN';
    const purchaseToken = subNotif.purchaseToken;

    console.log(`[Play Webhook] Received: ${notificationType}`);

    // Re-fetch the authoritative purchase state from the Play Developer API
    // using the (subscriptionId, purchaseToken) pair. This is the only thing
    // standing between "the Pub/Sub envelope claims this happened" and "an
    // attacker's HTTP client claims this happened" — do not touch the DB
    // before this resolves.
    let verified: VerifiedPlaySubscription;
    try {
      verified = await verifyPlaySubscription(subNotif.subscriptionId, purchaseToken);
    } catch (verifyError: any) {
      console.error('[Play Webhook] Purchase verification failed:', verifyError?.message || verifyError);
      return NextResponse.json({ error: 'unverified_purchase' }, { status: 401 });
    }

    // Find subscription in database
    const supabase = getSupabaseServiceClient();
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('origin', 'play')
      .eq('provider_subscription_id', purchaseToken)
      .maybeSingle();

    if (!sub) {
      console.warn(`[Play Webhook] Subscription not found: ${purchaseToken}`);
      return NextResponse.json({ received: true, warning: 'subscription_not_found' });
    }

    // Handle different notification types
    let newStatus = sub.status;
    let updates: any = {};

    switch (notificationType) {
      case 'SUBSCRIPTION_PURCHASED':
      case 'SUBSCRIPTION_RENEWED':
      case 'SUBSCRIPTION_RECOVERED':
      case 'SUBSCRIPTION_RESTARTED':
        // Only grant 'active' if Google's own record of this purchase token
        // confirms it is actually unexpired right now. A notification body
        // claiming a renewal is not sufficient on its own — it must be
        // backed by the verified expiry, otherwise this is exactly the
        // forged-renewal entitlement bypass this check exists to close.
        if (!verified.isActiveNow) {
          console.warn(
            `[Play Webhook] Rejected ${notificationType} for ${purchaseToken}: ` +
            `Play API reports not active (expiryTimeMillis=${verified.expiryTimeMillis})`
          );
          return NextResponse.json({ received: true, warning: 'verification_mismatch' });
        }
        newStatus = 'active';
        updates = {
          status: 'active',
          cancel_at_period_end: false,
          canceled_at: null
        };
        break;

      case 'SUBSCRIPTION_CANCELED':
        // User canceled (still active until expiry)
        updates = {
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString()
        };
        break;

      case 'SUBSCRIPTION_IN_GRACE_PERIOD':
        newStatus = 'in_grace';
        updates = {
          status: 'in_grace'
        };
        break;

      case 'SUBSCRIPTION_ON_HOLD':
        newStatus = 'billing_issue';
        updates = {
          status: 'billing_issue'
        };
        break;

      case 'SUBSCRIPTION_PAUSED':
        newStatus = 'paused';
        updates = {
          status: 'paused'
        };
        break;

      case 'SUBSCRIPTION_REVOKED':
        newStatus = 'canceled';
        updates = {
          status: 'canceled',
          canceled_at: new Date().toISOString()
        };
        break;

      case 'SUBSCRIPTION_EXPIRED':
        newStatus = 'expired';
        updates = {
          status: 'expired'
        };
        break;

      default:
        console.log(`[Play Webhook] Unhandled type: ${notificationType}`);
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
        p_provider: 'play',
        p_provider_subscription_id: purchaseToken,
        p_old_status: sub.status,
        p_new_status: newStatus,
        p_payload: {
          notification_type: notificationType,
          notification_type_code: subNotif.notificationType,
          subscription_id: subNotif.subscriptionId,
          package_name: notification.packageName
        }
      });
    }

    // Acknowledge message
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Play Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
