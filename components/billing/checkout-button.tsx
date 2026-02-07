'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { redirectToCheckout } from '@/lib/stripe/client';
import { SubscriptionTier } from '@/types/database';
import { Loader2 } from 'lucide-react';

export interface CheckoutButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The subscription tier to checkout for
   */
  tier: SubscriptionTier;

  /**
   * Optional callback called when checkout is successful
   */
  onSuccess?: () => void;

  /**
   * Optional callback called when checkout fails
   */
  onError?: (error: Error) => void;

  /**
   * Button variant (from shadcn/ui Button component)
   */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';

  /**
   * Button size (from shadcn/ui Button component)
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Checkout Button Component
 *
 * A button component that initiates a Stripe checkout session
 * for the specified subscription tier. Handles loading states
 * and error handling automatically.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CheckoutButton tier={SubscriptionTier.PRO}>
 *   Subscribe to Pro
 * </CheckoutButton>
 *
 * // With callbacks
 * <CheckoutButton
 *   tier={SubscriptionTier.BUSINESS}
 *   onSuccess={() => console.log('Success!')}
 *   onError={(err) => console.error(err)}
 * >
 *   Upgrade to Business
 * </CheckoutButton>
 * ```
 *
 * Feature: WEB-PAY-003 - Checkout Button Component
 */
export function CheckoutButton({
  tier,
  onSuccess,
  onError,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      // Call backend API to create a checkout session
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create checkout session: ${response.statusText}`
        );
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe checkout
      await redirectToCheckout(sessionId);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Checkout error:', error);

      // Call error callback if provided
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      className={className}
      variant={variant}
      size={size}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
