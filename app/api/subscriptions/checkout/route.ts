/**
 * Checkout Session Endpoint
 * POST /api/subscriptions/checkout
 *
 * Creates a Stripe checkout session for a subscription purchase.
 * Redirects the user to Stripe's hosted checkout page.
 *
 * @requires Authentication - Bearer token in Authorization header
 * @returns {CheckoutSessionResponse} Stripe checkout session URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { stripe, getStripePriceId } from '@/lib/stripe/server';
import {
  SubscriptionTier,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  BillingPeriod,
} from '@/types/subscription';

/**
 * POST /api/subscriptions/checkout
 *
 * Creates a Stripe checkout session for the specified tier and billing period.
 * Returns the checkout URL where the user should be redirected.
 */
export const POST = withAuth(async (request, context) => {
  try {
    const { user } = context;

    // Parse and validate request body
    let body: CheckoutSessionRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { tier, billing_period = 'monthly' } = body;

    // Validate tier is provided
    if (!tier) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required field: tier',
        },
        { status: 400 }
      );
    }

    // Validate tier is a valid subscription tier
    const validTiers = Object.values(SubscriptionTier);
    if (!validTiers.includes(tier as SubscriptionTier)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid tier. Must be one of: ${validTiers.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Prevent checkout for FREE tier
    if (tier === SubscriptionTier.FREE) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Cannot create checkout session for FREE tier',
        },
        { status: 400 }
      );
    }

    // Validate billing period
    const validBillingPeriods: BillingPeriod[] = ['monthly', 'yearly'];
    if (!validBillingPeriods.includes(billing_period)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid billing_period. Must be one of: ${validBillingPeriods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get the Stripe Price ID for this tier and billing period
    const priceId = getStripePriceId(tier, billing_period);

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/settings/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        tier: tier,
        billing_period: billing_period,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier,
        },
      },
    });

    // Validate that checkout session was created successfully
    if (!session.url) {
      console.error('Stripe checkout session created but no URL returned');
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to create checkout session',
        },
        { status: 500 }
      );
    }

    // Return the checkout URL
    const response: CheckoutSessionResponse = {
      url: session.url,
      session_id: session.id,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          {
            error: 'Payment Error',
            message: stripeError.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while creating checkout session',
      },
      { status: 500 }
    );
  }
});
