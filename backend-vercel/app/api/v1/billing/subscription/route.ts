/**
 * Billing Subscription Endpoint
 * GET /api/v1/billing/subscription
 * 
 * Returns user's subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() { return getServiceClient(); }

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;

    // Get user's subscription from metadata (from Stripe webhook)
    // For now, return based on user metadata or default to free
    const { data: userData } = await supabase.auth.admin.getUserById(userId);

    const subscription = {
      plan: userData?.user?.user_metadata?.subscription_tier || 'free',
      status: userData?.user?.user_metadata?.subscription_status || 'active',
      current_period_end: userData?.user?.user_metadata?.subscription_period_end || null,
      cancel_at_period_end: userData?.user?.user_metadata?.cancel_at_period_end || false,
      stripe_customer_id: userData?.user?.user_metadata?.stripe_customer_id || null,
    };

    // Define plan limits
    const planLimits: Record<string, any> = {
      free: {
        name: 'Free',
        price: 0,
        billing_period: null,
        features: [
          '100 contacts',
          '50 AI messages/month',
          '10 screenshot analyses/month',
          'Basic warmth tracking',
          'Email support',
        ],
        limits: {
          contacts: 100,
          ai_messages: 50,
          screenshots: 10,
          team_members: 1,
        },
      },
      pro: {
        name: 'Pro',
        price: 29,
        billing_period: 'monthly',
        features: [
          'Unlimited contacts',
          '500 AI messages/month',
          '100 screenshot analyses/month',
          'Advanced warmth tracking',
          'Priority support',
          'Export data',
          'Custom fields',
        ],
        limits: {
          contacts: -1, // unlimited
          ai_messages: 500,
          screenshots: 100,
          team_members: 1,
        },
      },
      team: {
        name: 'Team',
        price: 99,
        billing_period: 'monthly',
        features: [
          'Everything in Pro',
          'Unlimited AI messages',
          'Unlimited screenshots',
          'Team management',
          'Up to 10 team members',
          'Shared contacts',
          'API access',
        ],
        limits: {
          contacts: -1,
          ai_messages: -1,
          screenshots: -1,
          team_members: 10,
        },
      },
    };

    const planDetails = planLimits[subscription.plan] || planLimits.free;

    return NextResponse.json({
      subscription: {
        ...subscription,
        ...planDetails,
      },
      next_billing_date: subscription.current_period_end,
      can_upgrade: subscription.plan === 'free',
      can_manage: !!subscription.stripe_customer_id,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=15' },
    });
  } catch (error) {
    console.error('[Billing Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
