/**
 * Stripe Client Configuration for Browser
 *
 * This module provides a singleton instance of the Stripe client
 * for use in client-side components and pages.
 *
 * Usage:
 * ```tsx
 * import { getStripe } from '@/lib/stripe/client';
 *
 * const stripe = await getStripe();
 * // Use stripe.redirectToCheckout(), stripe.elements(), etc.
 * ```
 *
 * Feature: WEB-PAY-001 - Stripe Client Setup
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Singleton promise to cache the Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get or initialize the Stripe client instance
 *
 * This function ensures that Stripe is only loaded once and returns
 * the cached instance on subsequent calls.
 *
 * @returns Promise resolving to Stripe instance or null if loading fails
 * @throws Error if the Stripe publishable key is not configured
 *
 * @example
 * ```tsx
 * const stripe = await getStripe();
 * if (stripe) {
 *   const result = await stripe.redirectToCheckout({
 *     sessionId: 'session_id_here'
 *   });
 * }
 * ```
 */
export const getStripe = (): Promise<Stripe | null> => {
  // Return cached instance if it exists
  if (stripePromise) {
    return stripePromise;
  }

  // Get the publishable key from environment variables
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Validate the publishable key
  if (!publishableKey || publishableKey.trim() === '') {
    return Promise.reject(
      new Error('Stripe publishable key is not defined')
    );
  }

  // Load and cache the Stripe instance
  stripePromise = loadStripe(publishableKey);

  return stripePromise;
};

/**
 * Helper function to create a checkout session and redirect
 *
 * @param sessionId - The Stripe checkout session ID
 * @returns Promise that resolves when the redirect completes or rejects with an error
 *
 * @example
 * ```tsx
 * try {
 *   await redirectToCheckout('cs_test_...');
 * } catch (error) {
 *   console.error('Checkout failed:', error);
 * }
 * ```
 */
export const redirectToCheckout = async (sessionId: string): Promise<void> => {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Failed to load Stripe');
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });

  if (error) {
    throw error;
  }
};

/**
 * Reset the Stripe instance (mainly for testing purposes)
 * @internal
 */
export const resetStripeInstance = (): void => {
  stripePromise = null;
};
