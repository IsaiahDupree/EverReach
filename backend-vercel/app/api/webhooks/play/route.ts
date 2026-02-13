import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

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
