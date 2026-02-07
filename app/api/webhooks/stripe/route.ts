/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles incoming webhooks from Stripe for subscription events.
 * Verifies webhook signatures and updates subscription data in the database.
 *
 * Supported Events:
 * - checkout.session.completed: New subscription purchased
 * - customer.subscription.updated: Subscription status changed
 * - customer.subscription.deleted: Subscription canceled
 *
 * Usage:
 * Configure this endpoint in your Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 *
 * Webhook URL: https://your-domain.com/api/webhooks/stripe
 * Events to send: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

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
 * POST handler for Stripe webhooks
 *
 * Verifies the webhook signature and processes subscription events
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret configuration
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'STRIPE_WEBHOOK_SECRET is not configured',
        },
        { status: 500 }
      );
    }

    // Get the signature from headers
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing stripe-signature header',
        },
        { status: 400 }
      );
    }

    // Get the raw body
    const rawBody = await request.text();

    // Verify webhook signature and construct event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Webhook signature verification failed: ${error.message}`,
        },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      default:
        // Acknowledge other event types without processing
        console.log(`Unhandled event type: ${event.type}`);
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
 * Handle checkout.session.completed event
 *
 * This event is triggered when a customer completes a checkout session
 * and successfully subscribes to a tier.
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Extract metadata
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const billingPeriod = session.metadata?.billing_period || 'monthly';

  // Validate required metadata
  if (!userId) {
    console.error('Missing user_id in session metadata');
    throw new ValidationError('Missing user_id in session metadata');
  }
  if (!tier) {
    console.error('Missing tier in session metadata');
    throw new ValidationError('Missing tier in session metadata');
  }

  // Get subscription details
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Update subscription in database
  const supabase = createAdminClient();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      tier: tier,
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      metadata: {
        billing_period: billingPeriod,
      },
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Failed to update subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription created/updated for user ${userId} - tier: ${tier}`);
}

/**
 * Handle customer.subscription.updated event
 *
 * This event is triggered when a subscription is updated (e.g., plan changed, status changed)
 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Get subscription details
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Update subscription status in database
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: mapStripeStatus(status),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription ${subscriptionId} updated - status: ${status}`);
}

/**
 * Handle customer.subscription.deleted event
 *
 * This event is triggered when a subscription is canceled or deleted
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  // Get subscription details
  const subscriptionId = subscription.id;

  // Update subscription status to canceled and downgrade to free tier
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      tier: 'free',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Subscription ${subscriptionId} canceled`);
}

/**
 * Map Stripe subscription status to our database status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'canceled' | 'expired' | 'trialing' | 'incomplete' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'past_due':
    case 'unpaid':
      return 'expired';
    case 'trialing':
      return 'trialing';
    default:
      return 'inactive' as any; // Fallback for any unknown status
  }
}
