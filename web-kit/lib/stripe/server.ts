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
 *
 * Feature: WEB-PAY-004 - Stripe Webhook API (dependency)
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
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  business_monthly: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_monthly',
} as const;

/**
 * Get the Stripe Price ID for a given tier
 *
 * @param tier - The subscription tier
 * @returns The Stripe Price ID
 */
export function getStripePriceId(tier: string): string {
  const key = `${tier}_monthly` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key] || tier;
}
