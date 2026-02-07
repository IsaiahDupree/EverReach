/**
 * Subscription Tiers Endpoint
 * GET /api/subscriptions/tiers
 *
 * Returns available subscription tiers with pricing, features, and limits.
 * This is a public endpoint - no authentication required.
 *
 * @returns {SubscriptionTiersResponse} List of available subscription tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SubscriptionTier,
  SubscriptionTierConfig,
  SubscriptionTiersResponse,
} from '@/types/subscription';

/**
 * Tier configurations
 * Developers should customize these for their app's pricing structure
 */
const SUBSCRIPTION_TIERS: SubscriptionTierConfig[] = [
  {
    id: SubscriptionTier.FREE,
    name: 'Free',
    description: 'Perfect for getting started and trying out the platform',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Up to 10 items',
      'Basic support',
      'Community access',
      'Standard features',
    ],
    limits: {
      max_items: 10,
      api_calls_per_day: 100,
      storage_gb: 1,
      team_members: 1,
      priority_support: false,
      advanced_analytics: false,
    },
  },
  {
    id: SubscriptionTier.BASIC,
    name: 'Basic',
    description: 'For individuals and small teams getting serious',
    price_monthly: 9.99,
    price_yearly: 99.99, // ~17% discount
    features: [
      'Up to 100 items',
      'Email support',
      'All Free features',
      'Advanced search',
      'Export data',
    ],
    limits: {
      max_items: 100,
      api_calls_per_day: 1000,
      storage_gb: 10,
      team_members: 3,
      priority_support: false,
      advanced_analytics: true,
    },
  },
  {
    id: SubscriptionTier.PRO,
    name: 'Pro',
    description: 'For power users and growing teams',
    price_monthly: 29.99,
    price_yearly: 299.99, // ~17% discount
    features: [
      'Unlimited items',
      'Priority support',
      'All Basic features',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Team collaboration',
    ],
    limits: {
      max_items: -1, // unlimited
      api_calls_per_day: 10000,
      storage_gb: 100,
      team_members: 10,
      priority_support: true,
      advanced_analytics: true,
    },
  },
  {
    id: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price_monthly: 99.99,
    price_yearly: 999.99, // ~17% discount
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom SLAs',
      'On-premise deployment option',
      'Advanced security',
      'Custom integrations',
      'Unlimited team members',
      'Custom training',
    ],
    limits: {
      max_items: -1, // unlimited
      api_calls_per_day: -1, // unlimited
      storage_gb: -1, // unlimited
      team_members: -1, // unlimited
      priority_support: true,
      advanced_analytics: true,
    },
  },
];

/**
 * GET /api/subscriptions/tiers
 *
 * Returns the list of available subscription tiers.
 * This endpoint is public and does not require authentication.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const response: SubscriptionTiersResponse = {
      tiers: SUBSCRIPTION_TIERS,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in subscription tiers endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
