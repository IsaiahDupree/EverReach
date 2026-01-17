/**
 * Superwall Webhook Processing Library
 * Handles Superwall webhook events and syncs with subscription system
 * Integrates with existing RevenueCat subscriptions
 */

import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SuperwallWebhookEvent {
  event_name: string; // e.g., "transaction.start", "subscription_status.did_change"
  timestamp: string; // ISO 8601
  user_id: string; // Your app's user ID
  aliases?: Record<string, string>; // User aliases
  subscription?: {
    id: string;
    product_id: string;
    status: string; // "active", "canceled", "expired", "trial"
    period_type: string; // "normal", "trial", "intro"
    purchased_at?: string;
    expires_at?: string;
    current_period_start?: string;
    current_period_end?: string;
    trial_ends_at?: string;
    canceled_at?: string;
    platform: string; // "ios", "android"
    environment: string; // "sandbox", "production"
  };
  transaction?: {
    id: string;
    product_id: string;
    purchased_at: string;
    platform: string;
  };
  paywall?: {
    id: string;
    name: string;
    variant_id?: string;
    presented_at: string;
  };
}

// Superwall Event Types
export const SUPERWALL_EVENTS = {
  // Transaction Events
  TRANSACTION_START: 'transaction.start',
  TRANSACTION_COMPLETE: 'transaction.complete',
  TRANSACTION_FAIL: 'transaction.fail',
  TRANSACTION_ABANDON: 'transaction.abandon',
  TRANSACTION_RESTORE: 'transaction.restore',
  
  // Subscription Events
  SUBSCRIPTION_START: 'subscription_status.did_change', 
  SUBSCRIPTION_RENEW: 'subscription.renew',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  SUBSCRIPTION_EXPIRE: 'subscription.expire',
  SUBSCRIPTION_BILLING_ISSUE: 'subscription.billing_issue',
  
  // Paywall Events
  PAYWALL_OPEN: 'paywall.open',
  PAYWALL_CLOSE: 'paywall.close',
  PAYWALL_DECLINE: 'paywall.decline',
  
  // Trial Events
  TRIAL_START: 'trial.start',
  TRIAL_CONVERT: 'trial.convert',
  TRIAL_CANCEL: 'trial.cancel',
} as const;

/**
 * Verify Superwall webhook signature using HMAC SHA256
 */
export function verifySuperwallSignature(
  payload: string,
  signature: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!signature || !secret) {
    console.warn('[Superwall] Missing signature or secret for verification');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Superwall] Signature verification error:', error);
    return false;
  }
}

/**
 * Determine subscription status from Superwall event
 */
function deriveSubscriptionStatus(event: SuperwallWebhookEvent): string {
  const eventName = event.event_name;
  const subStatus = event.subscription?.status;

  // Map Superwall statuses to our internal statuses
  if (eventName === SUPERWALL_EVENTS.TRIAL_START || event.subscription?.period_type === 'trial') {
    return 'trial';
  }
  if (subStatus === 'active' || eventName === SUPERWALL_EVENTS.TRANSACTION_COMPLETE) {
    return 'active';
  }
  if (subStatus === 'canceled' || eventName === SUPERWALL_EVENTS.SUBSCRIPTION_CANCEL) {
    return 'canceled';
  }
  if (subStatus === 'expired' || eventName === SUPERWALL_EVENTS.SUBSCRIPTION_EXPIRE) {
    return 'expired';
  }
  
  return 'active'; // Default for completed transactions
}

/**
 * Process Superwall webhook event and update subscription
 */
export async function processSuperwallEvent(
  supabase: SupabaseClient,
  event: SuperwallWebhookEvent
): Promise<any> {
  const eventId = `sw_${event.timestamp}_${event.user_id}_${event.event_name}`;
  
  // Check for duplicate event (idempotency)
  const { data: existingEvent } = await supabase
    .from('revenuecat_webhook_events') // Reuse same events table
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEvent) {
    throw new Error('DUPLICATE_EVENT');
  }

  // Store event for idempotency
  await supabase.from('revenuecat_webhook_events').insert({
    event_id: eventId,
    event_type: event.event_name,
    app_user_id: event.user_id,
    product_id: event.subscription?.product_id || event.transaction?.product_id || null,
    payload: event as any,
    processed_at: new Date().toISOString(),
  });

  // Only update subscription for relevant events
  const subscriptionEvents = [
    SUPERWALL_EVENTS.TRANSACTION_COMPLETE,
    SUPERWALL_EVENTS.SUBSCRIPTION_START,
    SUPERWALL_EVENTS.SUBSCRIPTION_RENEW,
    SUPERWALL_EVENTS.SUBSCRIPTION_CANCEL,
    SUPERWALL_EVENTS.SUBSCRIPTION_EXPIRE,
    SUPERWALL_EVENTS.TRIAL_START,
    SUPERWALL_EVENTS.TRIAL_CONVERT,
  ];

  if (!subscriptionEvents.includes(event.event_name as any)) {
    console.log(`[Superwall] Event ${event.event_name} does not affect subscription state`);
    return { event_id: eventId, updated: false };
  }

  if (!event.subscription && !event.transaction) {
    console.log(`[Superwall] No subscription or transaction data in event`);
    return { event_id: eventId, updated: false };
  }

  // Map platform names
  const platformMap: Record<string, string> = {
    ios: 'app_store',
    android: 'play',
  };
  const platform = platformMap[event.subscription?.platform || event.transaction?.platform || 'ios'] || 'app_store';

  // Derive status
  const status = deriveSubscriptionStatus(event);

  // Upsert subscription
  const subscriptionData = {
    user_id: event.user_id,
    original_transaction_id: event.subscription?.id || event.transaction?.id || eventId,
    transaction_id: event.transaction?.id || event.subscription?.id || eventId,
    product_id: event.subscription?.product_id || event.transaction?.product_id || 'unknown',
    status,
    platform,
    environment: (event.subscription?.environment || 'PRODUCTION').toUpperCase(),
    purchased_at: event.subscription?.purchased_at || event.transaction?.purchased_at || new Date().toISOString(),
    current_period_end: event.subscription?.current_period_end || null,
    trial_ends_at: event.subscription?.trial_ends_at || null,
    canceled_at: event.subscription?.canceled_at || null,
    expires_at: event.subscription?.expires_at || null,
    last_event_id: eventId,
    last_event_type: event.event_name,
    last_event_at: event.timestamp,
    updated_at: new Date().toISOString(),
  };

  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id,platform', // User can have one subscription per platform
    })
    .select()
    .single();

  if (error) {
    console.error('[Superwall] Error upserting subscription:', error);
    throw error;
  }

  console.log(`[Superwall] Subscription updated for user ${event.user_id}:`, {
    status,
    product_id: subscriptionData.product_id,
    event: event.event_name,
  });

  return subscription;
}

/**
 * Get Superwall event analytics (for dashboard)
 */
export async function getSuperwallAnalytics(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30
): Promise<any> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('revenuecat_webhook_events')
    .select('event_type, created_at')
    .eq('app_user_id', userId)
    .gte('created_at', since.toISOString())
    .like('event_id', 'sw_%') // Filter for Superwall events only
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Superwall] Error fetching analytics:', error);
    return { events: [], total: 0 };
  }

  return {
    events: data,
    total: data.length,
    by_type: data.reduce((acc: any, e: any) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {}),
  };
}
