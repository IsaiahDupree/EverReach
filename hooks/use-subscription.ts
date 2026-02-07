import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import type { Database } from '@/types/database';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

/**
 * Subscription hook for managing user subscription state
 *
 * Provides subscription status, tier information, and billing methods.
 * Automatically syncs with database changes.
 *
 * @example
 * ```tsx
 * function BillingPage() {
 *   const { subscription, loading, createPortalSession } = useSubscription();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Current Tier: {subscription?.tier}</p>
 *       {subscription?.stripe_customer_id && (
 *         <button onClick={createPortalSession}>Manage Billing</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch subscription data
  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          // If no subscription found, create a default free tier
          if (fetchError.code === 'PGRST116') {
            const { data: newSub, error: createError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: user.id,
                tier: 'free',
                status: 'active',
              })
              .select()
              .single();

            if (createError) {
              throw createError;
            }

            setSubscription(newSub);
          } else {
            throw fetchError;
          }
        } else {
          setSubscription(data);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err as Error);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  /**
   * Create a Stripe billing portal session
   *
   * Redirects user to Stripe's hosted billing portal where they can
   * manage their subscription, update payment methods, and view invoices.
   *
   * @returns Promise that resolves when redirect is initiated
   */
  const createPortalSession = useCallback(async () => {
    try {
      if (!subscription?.stripe_customer_id) {
        throw new Error('No Stripe customer ID found');
      }

      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      // Redirect to Stripe portal
      window.location.href = url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      throw err;
    }
  }, [subscription?.stripe_customer_id]);

  /**
   * Check if user has access to a specific tier
   *
   * @param requiredTier - The tier to check access for
   * @returns true if user has access to the tier or higher
   */
  const hasAccess = useCallback(
    (requiredTier: 'free' | 'pro' | 'business'): boolean => {
      if (!subscription || subscription.status !== 'active') {
        return requiredTier === 'free';
      }

      const tierHierarchy: Record<string, number> = {
        free: 0,
        pro: 1,
        business: 2,
      };

      const currentTierLevel = tierHierarchy[subscription.tier] ?? 0;
      const requiredTierLevel = tierHierarchy[requiredTier] ?? 0;

      return currentTierLevel >= requiredTierLevel;
    },
    [subscription]
  );

  /**
   * Format the subscription tier for display
   *
   * @returns Capitalized tier name
   */
  const getTierName = useCallback((): string => {
    if (!subscription) return 'Free';

    const tierNames: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      business: 'Business',
    };

    return tierNames[subscription.tier] || 'Free';
  }, [subscription]);

  /**
   * Check if subscription is active
   *
   * @returns true if subscription exists and is active
   */
  const isActive = useCallback((): boolean => {
    return subscription?.status === 'active';
  }, [subscription]);

  /**
   * Check if user is on a paid plan
   *
   * @returns true if user has a paid subscription
   */
  const isPaidSubscriber = useCallback((): boolean => {
    return (
      subscription !== null &&
      subscription.tier !== 'free' &&
      subscription.status === 'active' &&
      subscription.stripe_customer_id !== null
    );
  }, [subscription]);

  return {
    subscription,
    loading,
    error,
    createPortalSession,
    hasAccess,
    getTierName,
    isActive,
    isPaidSubscriber,
  };
}
