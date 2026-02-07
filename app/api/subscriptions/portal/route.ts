/**
 * Billing Portal Endpoint
 * POST /api/subscriptions/portal
 *
 * Creates a Stripe billing portal session for managing subscriptions.
 * Redirects the user to Stripe's hosted billing portal where they can
 * manage their subscription, payment methods, and billing history.
 *
 * @requires Authentication - Bearer token in Authorization header
 * @returns {BillingPortalResponse} Stripe billing portal URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { stripe } from '@/lib/stripe/server';
import { createServerClient } from '@/lib/supabase/server';
import { BillingPortalResponse } from '@/types/subscription';

/**
 * POST /api/subscriptions/portal
 *
 * Creates a Stripe billing portal session for the authenticated user.
 * If the user doesn't have a Stripe customer ID, creates one first.
 * Returns the portal URL where the user should be redirected.
 */
export const POST = withAuth(async (request, context) => {
  try {
    const { user } = context;

    // Get the base URL for the return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    // Get user's Stripe customer ID from database
    const supabase = createServerClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is acceptable
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to fetch user data',
        },
        { status: 500 }
      );
    }

    let customerId = userData?.stripe_customer_id;

    // If user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            user_id: user.id,
          },
        });

        customerId = customer.id;

        // Update user record with new customer ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user with customer ID:', updateError);
          // Continue anyway - we can still create the portal session
        }
      } catch (error) {
        console.error('Error creating Stripe customer:', error);
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Failed to create billing customer',
          },
          { status: 500 }
        );
      }
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/settings/billing`,
    });

    // Return the portal URL
    const response: BillingPortalResponse = {
      url: session.url,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error creating billing portal session:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        {
          error: 'Billing Portal Error',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while creating billing portal session',
      },
      { status: 500 }
    );
  }
});
