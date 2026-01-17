/**
 * Subscription Billing Hooks
 * React Query hooks for subscription management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  SubscriptionResponse,
  CheckoutParams,
  CheckoutResponse,
  BillingPortalResponse,
  CancelSubscriptionParams,
  CancelSubscriptionResponse,
  LinkAppleReceiptParams,
  LinkGooglePurchaseParams,
  LinkStoreResponse,
} from '@/types/subscription';

/**
 * Fetch current subscription details
 * 
 * TEMPORARILY DISABLED: Backend endpoint /api/v1/billing/subscription doesn't exist yet
 * See MISSING_BACKEND_ENDPOINTS.md for details
 */
export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      // TEMPORARILY DISABLED - endpoint returns 204 causing CORS errors
      // const res = await apiFetch('/api/v1/billing/subscription', {
      //   requireAuth: true,
      // });
      
      // if (!res.ok) {
      //   throw new Error('Failed to load subscription');
      // }
      
      // return res.json() as Promise<SubscriptionResponse>;
      
      // Return empty data until backend is ready
      return null as any;
    },
    enabled: false, // Disable query entirely
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });
}

/**
 * Start Stripe Checkout session
 */
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (params: CheckoutParams) => {
      const res = await apiFetch('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          price_id: params.priceId,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        }),
        requireAuth: true,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Checkout failed' }));
        throw new Error(error.error || 'Checkout failed');
      }
      
      return res.json() as Promise<CheckoutResponse>;
    },
    onSuccess: ({ url }) => {
      // Redirect to Stripe Checkout
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    },
  });
}

/**
 * Open Stripe Billing Portal
 */
export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/v1/billing/portal', {
        method: 'POST',
        requireAuth: true,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Portal failed' }));
        throw new Error(error.error || 'Failed to open billing portal');
      }
      
      return res.json() as Promise<BillingPortalResponse>;
    },
    onSuccess: ({ url }) => {
      // Redirect to Stripe Billing Portal
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    },
  });
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params?: CancelSubscriptionParams) => {
      const res = await apiFetch('/api/v1/billing/cancel', {
        method: 'POST',
        body: JSON.stringify(params ?? {}),
        requireAuth: true,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Cancellation failed' }));
        throw new Error(error.error || 'Failed to cancel subscription');
      }
      
      return res.json() as Promise<CancelSubscriptionResponse>;
    },
    onSuccess: (data) => {
      // For App Store/Play Store, open manage URL
      if (data.cancel_method === 'store' && data.manage_url) {
        if (typeof window !== 'undefined') {
          window.open(data.manage_url, '_blank');
        }
      }
      
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Link Apple App Store receipt
 */
export function useLinkAppleReceipt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: LinkAppleReceiptParams) => {
      const res = await apiFetch('/api/v1/link/apple', {
        method: 'POST',
        body: JSON.stringify({ receipt: params.receipt }),
        requireAuth: true,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Apple link failed' }));
        throw new Error(error.error || 'Failed to link Apple receipt');
      }
      
      return res.json() as Promise<LinkStoreResponse>;
    },
    onSuccess: () => {
      // Refresh subscription data after linking
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Link Google Play Store purchase
 */
export function useLinkGooglePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: LinkGooglePurchaseParams) => {
      const res = await apiFetch('/api/v1/link/google', {
        method: 'POST',
        body: JSON.stringify({
          purchase_token: params.purchase_token,
          package_name: params.package_name,
          product_id: params.product_id,
        }),
        requireAuth: true,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Google link failed' }));
        throw new Error(error.error || 'Failed to link Google purchase');
      }
      
      return res.json() as Promise<LinkStoreResponse>;
    },
    onSuccess: () => {
      // Refresh subscription data after linking
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

/**
 * Helper function to check if user has access to a feature
 */
export function useFeatureAccess() {
  const { data } = useSubscription();
  
  return {
    isPaid: data?.subscription?.plan !== 'free' && data?.subscription?.status === 'active',
    isPro: data?.subscription?.plan === 'pro' && data?.subscription?.status === 'active',
    isTeam: data?.subscription?.plan === 'team' && data?.subscription?.status === 'active',
    canUpgrade: data?.can_upgrade ?? false,
    canManage: data?.can_manage ?? false,
    limits: data?.subscription?.limits,
    features: data?.subscription?.features ?? [],
  };
}
