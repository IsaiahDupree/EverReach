/**
 * RevenueCat Webhook Processing Library
 * Handles webhook signature verification and event processing
 */

import * as crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { emitAll } from '@/lib/analytics/emitters';
import type { NormalizedRcEvent } from '@/lib/analytics/emitters/base';

// ============================================================================
// Types
// ============================================================================

export type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'EXPIRATION'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'PRODUCT_CHANGE'
  | 'REFUND'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS';

// Enhanced subscription statuses for better frontend discernment
export type SubscriptionStatus = 
  | 'NOT_LOGGED_IN'
  | 'NO_SUBSCRIPTION'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'ACTIVE'
  | 'ACTIVE_CANCELED'  // Canceled but access until period_end
  | 'GRACE'             // Billing issue, in grace period
  | 'PAUSED'            // Google Play pause
  | 'EXPIRED'
  | 'LIFETIME';

// Legacy status for backwards compatibility
export type LegacyStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'refunded';

export interface RevenueCatWebhookEvent {
  event: {
    type: RevenueCatEventType;
    id: string;
    app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    environment: 'SANDBOX' | 'PRODUCTION';
    purchased_at_ms: number;
    expiration_at_ms: number;
    period_type: 'TRIAL' | 'NORMAL' | 'INTRO';
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    country_code?: string;
    presented_offering_id?: string;
    original_transaction_id?: string;
    transaction_id?: string;
    purchase_token?: string;
    cancellation_date_ms?: number;
  };
}

export interface ProcessedSubscription {
  user_id: string;
  original_transaction_id: string;
  transaction_id: string;
  product_id: string;
  status: SubscriptionStatus;
  platform: 'app_store' | 'play';
  environment: string;
  purchased_at: Date;
  current_period_end: Date;
  trial_ends_at: Date | null;
  canceled_at: Date | null;
  expires_at: Date | null;
  period_type: string | null;
  presented_offering_id: string | null;
  country_code: string | null;
  last_event_id: string;
  last_event_type: string;
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify RevenueCat webhook signature
 * @param rawBody - Raw request body as string
 * @param signature - X-RevenueCat-Signature header value
 * @param secret - REVENUECAT_WEBHOOK_SECRET from env
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined
): boolean {
  // If no secret configured, skip verification (not recommended for production)
  if (!secret) {
    console.warn('[RevenueCat] Webhook secret not configured - skipping signature verification');
    return true;
  }

  if (!signature) {
    console.error('[RevenueCat] Missing X-RevenueCat-Signature header');
    return false;
  }

  try {
    // RevenueCat uses HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[RevenueCat] Signature verification failed:', error);
    return false;
  }
}

// ============================================================================
// Event Processing
// ============================================================================

/**
 * Check if event has already been processed (idempotency)
 */
export async function isEventProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('revenuecat_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    console.error('[RevenueCat] Error checking event:', error);
    return false;
  }

  return !!data;
}

/**
 * Mark event as processed
 */
export async function markEventProcessed(
  supabase: SupabaseClient,
  event: RevenueCatWebhookEvent['event'],
  payload: any
): Promise<void> {
  const { error } = await supabase
    .from('revenuecat_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      payload: payload,
    });

  if (error) {
    console.error('[RevenueCat] Error marking event as processed:', error);
    throw new Error('Failed to mark event as processed');
  }
}

/**
 * Derive subscription status from event type (legacy, returns uppercase enhanced statuses)
 */
export function deriveSubscriptionStatus(
  eventType: RevenueCatEventType,
  periodType: string | undefined,
  expirationMs: number
): SubscriptionStatus {
  const now = Date.now();
  const hasExpired = expirationMs <= now;

  switch (eventType) {
    case 'INITIAL_PURCHASE':
      // Trial if period type is TRIAL and not expired
      if (periodType === 'TRIAL' && !hasExpired) {
        return 'TRIAL_ACTIVE';
      }
      if (periodType === 'TRIAL' && hasExpired) {
        return 'TRIAL_EXPIRED';
      }
      return 'ACTIVE';

    case 'RENEWAL':
      return 'ACTIVE';

    case 'CANCELLATION':
      // Canceled but still has access until period end
      return 'ACTIVE_CANCELED';

    case 'EXPIRATION':
      return 'EXPIRED';

    case 'REFUND':
      return 'EXPIRED'; // Treat refund as expired

    case 'UNCANCELLATION':
      return 'ACTIVE';

    case 'PRODUCT_CHANGE':
      return 'ACTIVE';

    case 'BILLING_ISSUE':
      // Put in grace period
      return 'GRACE';

    default:
      return 'ACTIVE';
  }
}

/**
 * Map RevenueCat store to platform
 */
export function mapStoreToPlatform(store: string): 'app_store' | 'play' {
  if (store === 'APP_STORE') return 'app_store';
  if (store === 'PLAY_STORE') return 'play';
  // Default to app_store for promotional/stripe
  return 'app_store';
}

/**
 * Convert enhanced status to legacy status for analytics backwards compatibility
 */
function toLegacyStatus(status: SubscriptionStatus): LegacyStatus {
  switch (status) {
    case 'TRIAL_ACTIVE':
    case 'TRIAL_EXPIRED':
      return 'trial';
    case 'ACTIVE':
    case 'ACTIVE_CANCELED':
    case 'GRACE':
    case 'LIFETIME':
      return 'active';
    case 'EXPIRED':
      return 'expired';
    case 'PAUSED':
      return 'canceled';
    default:
      return 'expired';
  }
}

function mapEventToNormalized(event: RevenueCatWebhookEvent['event'], status: SubscriptionStatus): NormalizedRcEvent {
  const kind = (() => {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
        return event.period_type === 'TRIAL' ? 'trial_started' : 'initial_purchase';
      case 'RENEWAL':
        return 'renewal';
      case 'EXPIRATION':
        return 'expiration';
      case 'CANCELLATION':
        return 'cancellation';
      case 'UNCANCELLATION':
        return 'uncancellation';
      case 'PRODUCT_CHANGE':
        return 'product_change';
      case 'REFUND':
        return 'refund';
      case 'BILLING_ISSUE':
        return 'billing_issue';
      default:
        return 'initial_purchase';
    }
  })();

  return {
    kind,
    event_id: event.id,
    user_id: event.app_user_id,
    product_id: event.product_id,
    entitlements: event.entitlement_ids,
    environment: event.environment,
    platform: mapStoreToPlatform(event.store),
    period_type: event.period_type,
    status: toLegacyStatus(status), // Convert to legacy for analytics
    purchased_at_ms: event.purchased_at_ms,
    expiration_at_ms: event.expiration_at_ms,
    country_code: event.country_code || null,
  };
}

/**
 * Process RevenueCat webhook event and update subscription
 */
export async function processWebhookEvent(
  supabase: SupabaseClient,
  webhookData: RevenueCatWebhookEvent
): Promise<ProcessedSubscription> {
  const { event } = webhookData;

  // Check for duplicate event
  const isProcessed = await isEventProcessed(supabase, event.id);
  if (isProcessed) {
    console.log(`[RevenueCat] Event ${event.id} already processed`);
    throw new Error('DUPLICATE_EVENT');
  }

  // Extract data
  const userId = event.app_user_id;
  const platform = mapStoreToPlatform(event.store);
  const status = deriveSubscriptionStatus(event.type, event.period_type, event.expiration_at_ms);

  // Map RevenueCat product_id to App Store product_id (store_identifier)
  // RevenueCat sends their internal product_id, but we need the App Store product_id
  let appStoreProductId = event.product_id; // Fallback to RC product_id
  
  try {
    const revenueCatApiKey = process.env.REVENUECAT_API_KEY || process.env.REVENUECAT_V2_API_KEY;
    const projectId = process.env.REVENUECAT_PROJECT_ID || 'projf143188e';
    
    if (revenueCatApiKey && event.product_id) {
      // Fetch product details from RevenueCat to get store_identifier
      const productResponse = await fetch(`https://api.revenuecat.com/v2/projects/${projectId}/products/${event.product_id}`, {
        headers: {
          'Authorization': `Bearer ${revenueCatApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (productResponse.ok) {
        const productData = await productResponse.json();
        console.log('[RevenueCat Webhook] 📦 Product data:', JSON.stringify(productData, null, 2));
        
        // Get the App Store product identifier (called store_identifier in RevenueCat)
        if (productData.store_identifier) {
          appStoreProductId = productData.store_identifier;
          console.log('[RevenueCat Webhook] ✅ Mapped to App Store product_id:', appStoreProductId);
        } else if (productData.product_id) {
          // Fallback: use product_id if store_identifier not available
          appStoreProductId = productData.product_id;
          console.log('[RevenueCat Webhook] ⚠️ Using product_id (store_identifier not found):', appStoreProductId);
        }
      } else {
        console.warn('[RevenueCat Webhook] Could not fetch product details, using event.product_id');
      }
    }
  } catch (productError: any) {
    console.warn('[RevenueCat Webhook] Error fetching product details:', productError.message);
    // Continue with event.product_id as fallback
  }

  // Build subscription data
  const subscriptionData: Partial<ProcessedSubscription> = {
    user_id: userId,
    original_transaction_id: event.original_transaction_id || event.purchase_token || event.transaction_id || event.id,
    transaction_id: event.transaction_id || event.purchase_token || event.id,
    product_id: appStoreProductId, // Use App Store product_id (store_identifier)
    status,
    platform,
    environment: event.environment,
    purchased_at: new Date(event.purchased_at_ms),
    current_period_end: new Date(event.expiration_at_ms),
    trial_ends_at: event.period_type === 'TRIAL' ? new Date(event.expiration_at_ms) : null,
    canceled_at: event.cancellation_date_ms ? new Date(event.cancellation_date_ms) : null,
    expires_at: status === 'EXPIRED' ? new Date(event.expiration_at_ms) : null,
    period_type: event.period_type || null,
    presented_offering_id: event.presented_offering_id || null,
    country_code: event.country_code || null,
    last_event_id: event.id,
    last_event_type: event.type,
  };

  // Upsert subscription (update if exists, insert if new)
  const { data: subscription, error: upsertError } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id,platform', // User can have one subscription per platform
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (upsertError) {
    console.error('[RevenueCat] Error upserting subscription:', upsertError);
    throw new Error(`Failed to process subscription: ${upsertError.message}`);
  }

  // Mark event as processed
  await markEventProcessed(supabase, event, webhookData);

  console.log(`[RevenueCat] Processed ${event.type} for user ${userId} - status: ${status}`);

  // Analytics fan-out (guarded by feature flags)
  try {
    const normalized = mapEventToNormalized(event, status);
    await emitAll(normalized);
  } catch (e: any) {
    console.error('[RevenueCat] Analytics emit failed:', e?.message || e);
  }

  return subscription as ProcessedSubscription;
}

// ============================================================================
// Enhanced Status Derivation
// ============================================================================

/**
 * Derive enhanced subscription status from subscription data
 * This provides fine-grained status for better frontend discernment
 */
export function deriveEnhancedStatus(sub: any): SubscriptionStatus {
  if (!sub) return 'NO_SUBSCRIPTION';
  
  const now = Date.now();
  
  // Check for lifetime
  if (sub.product_id?.includes('lifetime')) return 'LIFETIME';
  
  // Parse dates
  const trialEnds = sub.trial_ends_at ? Date.parse(sub.trial_ends_at) : null;
  const periodEnd = sub.current_period_end ? Date.parse(sub.current_period_end) : null;
  const graceEnds = sub.grace_ends_at ? Date.parse(sub.grace_ends_at) : null;
  const canceledAt = sub.canceled_at ? Date.parse(sub.canceled_at) : null;
  const pausedAt = sub.paused_at ? Date.parse(sub.paused_at) : null;
  
  // Check trial states
  if (trialEnds) {
    if (trialEnds > now && sub.status === 'TRIAL_ACTIVE') {
      return 'TRIAL_ACTIVE';
    }
    if (trialEnds <= now && (!periodEnd || periodEnd <= now)) {
      return 'TRIAL_EXPIRED';
    }
  }
  
  // Check grace period (billing issue)
  if (graceEnds && graceEnds > now) {
    return 'GRACE';
  }
  
  // Check paused (Google Play)
  if (pausedAt) {
    return 'PAUSED';
  }
  
  // Check canceled but still active
  if (canceledAt && periodEnd && periodEnd > now) {
    return 'ACTIVE_CANCELED';
  }
  
  // Check active
  if (sub.status === 'ACTIVE' || (periodEnd && periodEnd > now)) {
    return 'ACTIVE';
  }
  
  // Check expired
  if (sub.status === 'EXPIRED' || (periodEnd && periodEnd <= now)) {
    return 'EXPIRED';
  }
  
  return 'NO_SUBSCRIPTION';
}

// ============================================================================
// Entitlements Mapping
// ============================================================================

/**
 * Get entitlements for a user based on their active subscription
 */
export async function getEntitlementsFromSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  tier: string;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  payment_platform: 'apple' | 'google' | 'stripe' | null;
  features: Record<string, any>;
}> {
  // Unified subscription across RevenueCat + Stripe
  const { data: subscription, error } = await supabase
    .rpc('get_active_subscription_unified', { p_user_id: userId });

  if (error || !subscription || subscription.length === 0) {
    return {
      tier: 'free',
      subscription_status: null,
      trial_ends_at: null,
      current_period_end: null,
      payment_platform: null,
      features: {
        compose_runs: 50,
        voice_minutes: 30,
        messages: 200,
        contacts: 100,
      },
    };
  }

  const sub = subscription[0];

  // Derive tier from product_id
  let tier = 'free';
  if (sub.product_id.includes('core')) {
    tier = 'core';
  } else if (sub.product_id.includes('pro')) {
    tier = 'pro';
  } else if (sub.product_id.includes('team')) {
    tier = 'team';
  }

  // Map features based on tier
  const featuresMap: Record<string, any> = {
    free: { compose_runs: 50, voice_minutes: 30, messages: 200, contacts: 100 },
    core: { compose_runs: 500, voice_minutes: 120, messages: 1000, contacts: 500 },
    pro: { compose_runs: 1000, voice_minutes: 300, messages: 2000, contacts: -1 },
    team: { compose_runs: -1, voice_minutes: -1, messages: -1, contacts: -1, team_members: 10 },
  };

  // Normalize and use enhanced status derivation
  const normalized = {
    product_id: sub.product_id,
    status: sub.status ? String(sub.status).toUpperCase() : null,
    trial_ends_at: (sub as any).trial_ends_at || null,
    current_period_end: sub.current_period_end || null,
  } as any;
  const enhancedStatus = deriveEnhancedStatus(normalized);

  let platform: 'apple' | 'google' | 'stripe' | null = null;
  if (sub.platform === 'app_store') platform = 'apple';
  else if (sub.platform === 'play') platform = 'google';
  else if (sub.platform === 'stripe') platform = 'stripe';

  return {
    tier,
    subscription_status: enhancedStatus,
    trial_ends_at: (sub as any).trial_ends_at || null,
    current_period_end: sub.current_period_end || null,
    payment_platform: platform,
    features: featuresMap[tier] || featuresMap.free,
  };
}
