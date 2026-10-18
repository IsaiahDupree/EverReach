/**
 * Subscription Status Endpoint
 * GET /api/subscriptions/status
 *
 * Returns the authenticated user's current subscription status including
 * tier, status, and expiration date.
 *
 * @requires Authentication - Bearer token in Authorization header
 * @returns {SubscriptionStatusResponse} Current subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createServerClient } from '@/lib/supabase/server';
import {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionStatusResponse,
} from '@/types/subscription';

/**
 * GET /api/subscriptions/status
 *
 * Returns the current user's subscription status.
 * If no subscription exists, returns a default free tier subscription.
 */
export const GET = withAuth(async (request, context) => {
  try {
    const { user } = context;
    const supabase = createServerClient();

    // Query the subscriptions table for the user's subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Handle database errors (except "no rows found" which is expected for free users)
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to fetch subscription status',
        },
        { status: 500 }
      );
    }

    // If no subscription exists, return default free tier
    if (!subscription || error?.code === 'PGRST116') {
      const freeSubscription: SubscriptionStatusResponse = {
        subscription: {
          id: 'free-' + user.id,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          expires_at: null,
          is_active: true,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.created_at || new Date().toISOString(),
        },
      };

      return NextResponse.json(freeSubscription, { status: 200 });
    }

    // Determine if subscription is active based on status
    const activeStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];
    const is_active = activeStatuses.includes(
      subscription.status as SubscriptionStatus
    );

    // Format response
    const response: SubscriptionStatusResponse = {
      subscription: {
        id: subscription.id,
        tier: subscription.tier as SubscriptionTier,
        status: subscription.status as SubscriptionStatus,
        expires_at: subscription.expires_at,
        is_active,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in subscription status endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});
