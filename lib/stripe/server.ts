/**
 * Stripe Server Client
 *
 * Server-side Stripe client configuration for payment processing.
 * Uses the Stripe secret key to perform server-side operations.
 *
 * Usage:
 * ```typescript
 * import { stripe } from '@/lib/stripe/server';
 *
 * const session = await stripe.checkout.sessions.create({...});
 * ```
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is not defined. Please add it to your .env file.'
  );
}

/**
 * Stripe client instance
 * Configured with the secret key for server-side operations
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Price ID mappings for subscription tiers
 * Developers should replace these with their own Stripe Price IDs
 */
export const STRIPE_PRICE_IDS = {
  basic_monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
  basic_yearly: process.env.STRIPE_PRICE_BASIC_YEARLY || 'price_basic_yearly',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  enterprise_monthly:
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
  enterprise_yearly:
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
} as const;

/**
 * Get the Stripe Price ID for a given tier and billing period
 *
 * @param tier - The subscription tier
 * @param billingPeriod - The billing period (monthly or yearly)
 * @returns The Stripe Price ID
 */
export function getStripePriceId(
  tier: string,
  billingPeriod: 'monthly' | 'yearly'
): string {
  const key = `${tier}_${billingPeriod}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key];
}
