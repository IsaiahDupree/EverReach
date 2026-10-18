/**
 * RevenueCat Webhook Handler
 * POST /api/webhooks/revenuecat
 *
 * Handles incoming webhooks from RevenueCat for mobile subscription events.
 * Verifies webhook authorization and updates subscription data in the database.
 *
 * Supported Events:
 * - INITIAL_PURCHASE: New subscription purchased
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: Subscription canceled
 * - EXPIRATION: Subscription expired
 *
 * Usage:
 * Configure this endpoint in your RevenueCat Dashboard:
 * https://app.revenuecat.com/settings/integrations/webhooks
 *
 * Webhook URL: https://your-domain.com/api/webhooks/revenuecat
 * Authorization: Bearer token configured in REVENUECAT_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * RevenueCat webhook event types
 */
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'TEST';

/**
 * RevenueCat webhook event structure
 */
interface RevenueCatEvent {
  event: {
    type: RevenueCatEventType;
    app_user_id: string;
    product_id?: string;
    price_in_purchased_currency?: number;
    purchased_at_ms?: number;
    entitlement_ids?: string[];
    period_type?: string;
    cancellation_reason?: string;
    cancelled_at_ms?: number;
    expiration_reason?: string;
    expired_at_ms?: number;
  };
}

/**
 * Custom error for validation failures
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * POST handler for RevenueCat webhooks
 *
 * Verifies the authorization header and processes subscription events
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret configuration
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('REVENUECAT_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'REVENUECAT_WEBHOOK_SECRET is not configured',
        },
        { status: 500 }
      );
    }

    // Get the authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      console.error('Missing authorization header');
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing authorization header',
        },
        { status: 400 }
      );
    }

    // Verify the authorization token
    const token = authorization.replace('Bearer ', '');
    if (token !== webhookSecret) {
      console.error('Invalid authorization token');
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Unauthorized: Invalid authorization token',
        },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    let payload: RevenueCatEvent;
    try {
      payload = await request.json();
    } catch (err) {
      console.error('Invalid JSON payload');
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    // Validate event structure
    if (!payload.event || !payload.event.type) {
      console.error('Invalid event structure');
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid event structure: missing event or event.type',
        },
        { status: 400 }
      );
    }

    // Handle the event
    const eventType = payload.event.type;
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(payload.event);
        break;

      case 'RENEWAL':
        await handleRenewal(payload.event);
        break;

      case 'CANCELLATION':
        await handleCancellation(payload.event);
        break;

      case 'EXPIRATION':
        await handleExpiration(payload.event);
        break;

      default:
        // Acknowledge other event types without processing
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error('Webhook handler error:', error);

    // Handle validation errors with 400 status
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: error.message,
        },
        { status: 400 }
      );
    }

    // All other errors return 500
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle INITIAL_PURCHASE event
 *
 * This event is triggered when a customer makes their first purchase
 * and subscribes to a tier.
 */
async function handleInitialPurchase(
  event: RevenueCatEvent['event']
): Promise<void> {
  // Extract event data
  const userId = event.app_user_id;
  const entitlementIds = event.entitlement_ids || [];

  // Map entitlement to tier
  const tier = mapEntitlementToTier(entitlementIds);

  // Update subscription in database
  const supabase = createAdminClient();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier: tier,
      status: 'active',
      revenuecat_product_id: event.product_id,
      metadata: {
        purchased_at_ms: event.purchased_at_ms,
        price: event.price_in_purchased_currency,
        period_type: event.period_type,
      },
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Failed to update subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Initial purchase for user ${userId} - tier: ${tier}`);
}

/**
 * Handle RENEWAL event
 *
 * This event is triggered when a subscription is automatically renewed
 */
async function handleRenewal(event: RevenueCatEvent['event']): Promise<void> {
  // Extract event data
  const userId = event.app_user_id;
  const entitlementIds = event.entitlement_ids || [];

  // Map entitlement to tier
  const tier = mapEntitlementToTier(entitlementIds);

  // Update subscription in database
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      tier: tier,
      metadata: {
        renewed_at_ms: event.purchased_at_ms,
        price: event.price_in_purchased_currency,
        period_type: event.period_type,
      },
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription renewed for user ${userId} - tier: ${tier}`);
}

/**
 * Handle CANCELLATION event
 *
 * This event is triggered when a subscription is canceled
 */
async function handleCancellation(
  event: RevenueCatEvent['event']
): Promise<void> {
  // Extract event data
  const userId = event.app_user_id;

  // Update subscription status to canceled
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      tier: 'free',
      canceled_at: new Date().toISOString(),
      metadata: {
        cancellation_reason: event.cancellation_reason,
        cancelled_at_ms: event.cancelled_at_ms,
      },
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription canceled for user ${userId}`);
}

/**
 * Handle EXPIRATION event
 *
 * This event is triggered when a subscription expires
 */
async function handleExpiration(
  event: RevenueCatEvent['event']
): Promise<void> {
  // Extract event data
  const userId = event.app_user_id;

  // Update subscription status to expired
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      tier: 'free',
      metadata: {
        expiration_reason: event.expiration_reason,
        expired_at_ms: event.expired_at_ms,
      },
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to expire subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription expired for user ${userId}`);
}

/**
 * Map RevenueCat entitlement IDs to subscription tiers
 *
 * @param entitlementIds - Array of entitlement IDs from RevenueCat
 * @returns The subscription tier
 */
function mapEntitlementToTier(entitlementIds: string[]): string {
  // Check for highest tier first
  if (entitlementIds.includes('enterprise') || entitlementIds.includes('premium')) {
    return 'enterprise';
  }

  if (entitlementIds.includes('pro')) {
    return 'pro';
  }

  if (entitlementIds.includes('basic')) {
    return 'basic';
  }

  // Default to free if no recognized entitlements
  return 'free';
}
