/**
 * useSubscription Hook
 * Features: IOS-DATA-006, IOS-PAY-002, IOS-PAY-003
 *
 * React hook for managing subscription status and operations.
 * Provides methods to check subscription tier access, status, purchase subscriptions,
 * and restore previous purchases.
 *
 * This hook uses Supabase for data persistence and RevenueCat for in-app purchases.
 * It manages loading/error states and provides tier-based access control.
 *
 * @returns Object containing:
 *   - subscription: Subscription object or null
 *   - tier: Current subscription tier (defaults to FREE)
 *   - loading: Boolean indicating if operation is in progress
 *   - error: Error object if operation failed
 *   - hasAccess: Function to check if user has access to a tier
 *   - isActive: Boolean indicating if subscription is active
 *   - refetch: Function to manually refetch subscription
 *   - purchasePackage: Function to purchase a subscription via RevenueCat
 *   - restorePurchases: Function to restore previous purchases
 *
 * @example
 * ```tsx
 * import { useSubscription } from '@/hooks/useSubscription';
 * import { SubscriptionTier } from '@/types/subscription';
 *
 * function FeatureScreen() {
 *   const { tier, hasAccess, isActive, loading, purchasePackage, restorePurchases } = useSubscription();
 *
 *   if (loading) return <LoadingSpinner />;
 *
 *   const canAccessProFeature = hasAccess(SubscriptionTier.PRO);
 *
 *   const handlePurchase = async (pkg) => {
 *     const result = await purchasePackage(pkg);
 *     if (result.success) {
 *       console.log('Purchase successful!');
 *     } else {
 *       console.error('Purchase failed:', result.error);
 *     }
 *   };
 *
 *   const handleRestore = async () => {
 *     const result = await restorePurchases();
 *     if (result.success) {
 *       console.log('Purchases restored!');
 *     } else {
 *       console.error('Restore failed:', result.error);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Text>Current tier: {tier}</Text>
 *       <Text>Active: {isActive ? 'Yes' : 'No'}</Text>
 *       {canAccessProFeature ? (
 *         <ProFeature />
 *       ) : (
 *         <UpgradePrompt onPurchase={handlePurchase} />
 *       )}
 *       <Button onPress={handleRestore}>Restore Purchases</Button>
 *     </View>
 *   );
 * }
 * ```
 *
 * @module hooks/useSubscription
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription, SubscriptionTier, SubscriptionStatus, PurchaseResult } from '../types/subscription';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

/**
 * Tier hierarchy for access control
 * Lower index = lower tier
 */
const TIER_HIERARCHY = [
  SubscriptionTier.FREE,
  SubscriptionTier.BASIC,
  SubscriptionTier.PRO,
  SubscriptionTier.PREMIUM,
];

/**
 * Return type for useSubscription hook
 */
interface UseSubscriptionReturn {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  loading: boolean;
  error: Error | null;
  hasAccess: (requiredTier: SubscriptionTier) => boolean;
  isActive: boolean;
  refetch: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
}

/**
 * Hook to manage subscription status and operations
 */
export const useSubscription = (): UseSubscriptionReturn => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch user subscription from database
   */
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch subscription from database
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no subscription found, that's not an error - user is on free tier
        if (fetchError.code === 'PGRST116') {
          setSubscription(null);
          return;
        }
        throw fetchError;
      }

      setSubscription(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch subscription');
      setError(error);
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current subscription tier
   * Defaults to FREE if no subscription exists or subscription is inactive
   */
  const tier: SubscriptionTier = (() => {
    if (!subscription) {
      return SubscriptionTier.FREE;
    }

    // If subscription is not active, treat as FREE tier
    const activeStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];
    if (!activeStatuses.includes(subscription.status)) {
      return SubscriptionTier.FREE;
    }

    return subscription.tier;
  })();

  /**
   * Check if user has access to a specific tier
   * Returns true if user's tier is equal to or higher than required tier
   *
   * @param requiredTier - The tier level required for access
   * @returns boolean indicating if user has access
   */
  const hasAccess = useCallback(
    (requiredTier: SubscriptionTier): boolean => {
      const currentTierIndex = TIER_HIERARCHY.indexOf(tier);
      const requiredTierIndex = TIER_HIERARCHY.indexOf(requiredTier);

      // User has access if their tier index is >= required tier index
      return currentTierIndex >= requiredTierIndex;
    },
    [tier]
  );

  /**
   * Check if subscription is currently active
   * Returns true for ACTIVE and TRIALING statuses
   */
  const isActive: boolean = (() => {
    if (!subscription) {
      return false;
    }

    const activeStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];
    return activeStatuses.includes(subscription.status);
  })();

  /**
   * Manually refetch subscription
   */
  const refetch = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Purchase a subscription package via RevenueCat
   * Feature: IOS-PAY-002
   *
   * @param pkg - RevenueCat package to purchase
   * @returns Promise containing success status and entitlements or error
   */
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
    try {
      // Attempt to purchase the package
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Extract entitlements from customer info
      const entitlements = customerInfo.entitlements;

      // Refetch subscription from database to sync with RevenueCat
      await fetchSubscription();

      return {
        success: true,
        entitlements,
      };
    } catch (err) {
      // Handle user cancellation gracefully
      const error = err as any;
      if (error.userCancelled) {
        return {
          success: false,
          error: 'Purchase was cancelled',
        };
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      console.error('Purchase error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [fetchSubscription]);

  /**
   * Restore purchases for the current user
   * Feature: IOS-PAY-003
   *
   * This method contacts RevenueCat to restore any previously purchased subscriptions.
   * Useful when users switch devices or reinstall the app.
   *
   * @returns Promise containing success status and entitlements or error
   */
  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    try {
      // Call RevenueCat to restore purchases
      const customerInfo = await Purchases.restorePurchases();

      // Extract entitlements from customer info
      const entitlements = customerInfo.entitlements;

      // Refetch subscription from database to sync with RevenueCat
      await fetchSubscription();

      return {
        success: true,
        entitlements,
      };
    } catch (err) {
      // Handle errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      console.error('Restore purchases error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [fetchSubscription]);

  // Fetch subscription on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    tier,
    loading,
    error,
    hasAccess,
    isActive,
    refetch,
    purchasePackage,
    restorePurchases,
  };
};
