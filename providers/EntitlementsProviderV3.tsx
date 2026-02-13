/**
 * Entitlements Provider V3 - Production Ready
 * 
 * Matches backend API structure from ever-reach-be.vercel.app
 * Provides feature gates, tier checks, and quota management
 * 
 * Backend Endpoints:
 * - GET /api/v1/me/entitlements - Primary endpoint
 * - POST /api/v1/billing/restore - Restore purchases
 * - GET /api/v1/billing/subscription - Detailed info
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { apiFetch } from '@/lib/api';
import analytics from '@/lib/analytics';

// Types matching backend API
export type SubscriptionTier = 'free' | 'core' | 'pro' | 'team';
export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'paused' | 'past_due' | 'canceled' | 'expired' | 'refunded';
export type PaymentPlatform = 'apple' | 'google' | 'stripe' | 'revenuecat';

export interface FeatureLimits {
  compose_runs: number;
  voice_minutes: number;
  messages: number;
  contacts: number;
}

export interface Entitlements {
  tier: SubscriptionTier;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  payment_platform: PaymentPlatform | null;
  features: FeatureLimits;

  // Additional fields from detailed endpoint
  canceled_at?: string | null;
  environment?: 'PRODUCTION' | 'SANDBOX';
  
  // Billing period information
  product_id?: string | null;
  billing_period?: 'monthly' | 'annual' | null;
}

interface EntitlementsContextValue {
  // Data
  entitlements: Entitlements | null;
  loading: boolean;
  error: Error | null;

  // Feature gates
  hasFeature: (feature: keyof FeatureLimits, amount?: number) => boolean;
  requireFeature: (feature: keyof FeatureLimits, origin?: string) => Promise<boolean>;
  getFeatureLimit: (feature: keyof FeatureLimits) => number;

  // Tier checks
  isFree: boolean;
  isCore: boolean;
  isPro: boolean;
  isTeam: boolean;
  isPaid: boolean; // core, pro, or team

  // Status checks
  isTrial: boolean;
  isActive: boolean;
  isGrace: boolean;
  isPaused: boolean;
  isCanceled: boolean;
  isExpired: boolean;
  hasAccess: boolean; // active, trial, grace, or past_due

  // Actions
  refreshEntitlements: () => Promise<void>;
  restorePurchases: () => Promise<{ restored: boolean; tier?: SubscriptionTier; message: string }>;
}

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(undefined);

export function EntitlementsProviderV3({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch entitlements from backend
  const {
    data: entitlements,
    isLoading,
    error,
    refetch,
  } = useQuery<Entitlements>({
    queryKey: ['entitlements', 'v3'],
    queryFn: async () => {
      console.log('[Entitlements] Fetching from backend...');

      const response = await apiFetch('/api/v1/me/entitlements', {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[Entitlements] User not authenticated, checking RevenueCat directly...');
          
          // When user isn't authenticated, check RevenueCat for any purchases
          // This handles the case where user purchases before signing in
          if (Platform.OS !== 'web') {
            try {
              const customerInfo = await Purchases.getCustomerInfo();
              const activeSubscriptions = customerInfo.activeSubscriptions || [];
              const entitlements = customerInfo.entitlements?.active || {};
              
              console.log('[Entitlements] RevenueCat check (pre-auth):', {
                activeSubscriptions,
                entitlementKeys: Object.keys(entitlements),
              });
              
              // If user has any active subscription or entitlement, treat them as paid
              if (activeSubscriptions.length > 0 || Object.keys(entitlements).length > 0) {
                console.log('[Entitlements] ✅ Pre-auth user has active subscription via RevenueCat');
                return {
                  tier: 'core' as SubscriptionTier,
                  subscription_status: 'active' as SubscriptionStatus,
                  trial_ends_at: null,
                  current_period_end: null,
                  payment_platform: 'revenuecat' as PaymentPlatform,
                  features: TIER_LIMITS.core,
                } as Entitlements;
              }
            } catch (rcError) {
              console.log('[Entitlements] RevenueCat check failed:', rcError);
            }
          }
          
          console.log('[Entitlements] User not authenticated, returning free tier');
          return {
            tier: 'free',
            subscription_status: null,
            trial_ends_at: null,
            current_period_end: null,
            payment_platform: null,
            features: TIER_LIMITS.free,
          } as Entitlements;
        }
        console.error('[Entitlements] Fetch failed:', response.status);
        throw new Error('Failed to fetch entitlements');
      }

      const data = await response.json();
      console.log('[Entitlements] Loaded:', {
        tier: data.tier,
        status: data.subscription_status,
        platform: data.payment_platform,
      });

      // FALLBACK: If backend says free but RevenueCat has active subscription (StoreKit testing scenario)
      // This handles the case where purchase was made but webhook hasn't synced yet
      if (data.tier === 'free' && Platform.OS !== 'web') {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const activeSubscriptions = customerInfo.activeSubscriptions || [];
          const entitlements = customerInfo.entitlements?.active || {};
          
          console.log('[Entitlements] RevenueCat fallback check:', {
            activeSubscriptions,
            entitlementKeys: Object.keys(entitlements),
          });
          
          // If RevenueCat has active subscription but backend doesn't, use RevenueCat data
          if (activeSubscriptions.length > 0 || Object.keys(entitlements).length > 0) {
            console.log('[Entitlements] ✅ RevenueCat has active subscription - overriding backend free tier');
            return {
              ...data,
              tier: 'core' as SubscriptionTier,
              subscription_status: 'active' as SubscriptionStatus,
              payment_platform: 'revenuecat' as PaymentPlatform,
              features: TIER_LIMITS.core,
            } as Entitlements;
          }
        } catch (rcError) {
          console.log('[Entitlements] RevenueCat fallback check failed:', rcError);
        }
      }

      return data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  // Listen to RevenueCat updates (native only) with debounce to prevent rapid-fire during sign out
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRefetch = 0;
    const DEBOUNCE_MS = 1000; // Only allow one refresh per second

    const listener = Purchases.addCustomerInfoUpdateListener(async (_info: any) => {
      const now = Date.now();
      
      // Skip if we just refreshed
      if (now - lastRefetch < DEBOUNCE_MS) {
        console.log('[RC] Customer info updated, skipping (debounced)');
        return;
      }
      
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Debounce the refresh
      debounceTimer = setTimeout(async () => {
        console.log('[RC] Customer info updated, refreshing entitlements');
        lastRefetch = Date.now();
        await refetch();
      }, 100);
    });

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [refetch]);

  /**
   * Check if user has access to a feature
   * @param feature - Feature key to check
   * @param amount - Amount needed (for quota features)
   * @returns true if user has access
   */
  const hasFeature = (feature: keyof FeatureLimits, amount = 1): boolean => {
    if (!entitlements) return false;

    const limit = entitlements.features[feature];

    // -1 means unlimited
    if (limit === -1) return true;

    // Check if amount is within limit
    return amount <= limit;
  };

  /**
   * Require a feature - shows paywall if user doesn't have access
   * @param feature - Feature key to require
   * @param origin - Where the request came from (for analytics)
   * @returns true if user has access, false if redirected to paywall
   */
  const requireFeature = async (
    feature: keyof FeatureLimits,
    origin?: string
  ): Promise<boolean> => {
    if (hasFeature(feature)) {
      return true;
    }

    // Track feature lock event
    analytics.capture('feature_locked_clicked', {
      feature,
      origin: origin || 'unknown',
      tier: entitlements?.tier || 'free',
      status: entitlements?.subscription_status,
      payment_platform: entitlements?.payment_platform,
    });

    console.log(`[Entitlements] Feature '${feature}' locked, redirecting to paywall`);

    // Navigate to paywall/upgrade screen
    router.push({
      pathname: '/subscription-plans',
      params: {
        feature,
        origin: origin || 'unknown',
      },
    });

    return false;
  };

  /**
   * Get the limit for a specific feature
   */
  const getFeatureLimit = (feature: keyof FeatureLimits): number => {
    return entitlements?.features[feature] ?? 0;
  };

  /**
   * Refresh entitlements from backend
   */
  const refreshEntitlements = async () => {
    console.log('[Entitlements] Manually refreshing...');
    await refetch();
  };

  /**
   * Restore purchases (native only)
   * Calls backend endpoint to sync with RevenueCat/Apple/Google
   */
  const restorePurchases = async (): Promise<{
    restored: boolean;
    tier?: SubscriptionTier;
    message: string;
  }> => {
    try {
      analytics.capture('restore_purchases_initiated', {
        platform: Platform.OS,
      });

      console.log('[Entitlements] Restoring purchases...');

      const response = await apiFetch('/api/v1/billing/restore', {
        method: 'POST',
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(`Restore failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.restored) {
        analytics.capture('restore_purchases_success', {
          tier: data.tier,
          platform: Platform.OS,
        });

        // Refresh entitlements
        await refetch();

        return {
          restored: true,
          tier: data.tier,
          message: data.message || 'Subscription restored successfully!',
        };
      } else {
        analytics.capture('restore_purchases_no_subscription');

        return {
          restored: false,
          message: 'No previous purchases found',
        };
      }
    } catch (error: any) {
      console.error('[Entitlements] Restore failed:', error);

      analytics.capture('restore_purchases_failed', {
        error: error.message,
        platform: Platform.OS,
      });

      return {
        restored: false,
        message: error.message || 'Failed to restore purchases',
      };
    }
  };

  // Computed tier checks
  const isFree = entitlements?.tier === 'free';
  const isCore = entitlements?.tier === 'core';
  const isPro = entitlements?.tier === 'pro';
  const isTeam = entitlements?.tier === 'team';
  const isPaid = isCore || isPro || isTeam;

  // Computed status checks
  const isTrial = entitlements?.subscription_status === 'trial';
  const isActive = entitlements?.subscription_status === 'active';
  const isGrace = entitlements?.subscription_status === 'grace';
  const isPaused = entitlements?.subscription_status === 'paused';
  const isCanceled = entitlements?.subscription_status === 'canceled';
  const isExpired = entitlements?.subscription_status === 'expired';
  const hasAccess = isActive || isTrial || isGrace || entitlements?.subscription_status === 'past_due';

  const value: EntitlementsContextValue = {
    entitlements: entitlements || null,
    loading: isLoading,
    error: error as Error | null,

    hasFeature,
    requireFeature,
    getFeatureLimit,

    isFree,
    isCore,
    isPro,
    isTeam,
    isPaid,

    isTrial,
    isActive,
    isGrace,
    isPaused,
    isCanceled,
    isExpired,
    hasAccess,

    refreshEntitlements,
    restorePurchases,
  };

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

/**
 * Hook to access entitlements context
 */
export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within EntitlementsProviderV3');
  }
  return context;
}

/**
 * Feature tier mapping
 * Based on backend limits
 */
export const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    compose_runs: 50,
    voice_minutes: 30,
    messages: 200,
    contacts: 100,
  },
  core: {
    compose_runs: 500,
    voice_minutes: 120,
    messages: 1000,
    contacts: 500,
  },
  pro: {
    compose_runs: 1000,
    voice_minutes: 300,
    messages: 2000,
    contacts: -1, // unlimited
  },
  team: {
    compose_runs: -1, // unlimited
    voice_minutes: -1, // unlimited
    messages: -1, // unlimited
    contacts: -1, // unlimited
  },
};
