/**
 * useSubscription
 *
 * Returns the current user's subscription tier from the user store.
 * Convenience hook so components don't need to import userStore directly.
 *
 * Returns:
 *   tier          'free' | 'pro' | 'family'
 *   isPro         true when tier is 'pro' or 'family'
 *   isFamily      true when tier is 'family'
 *   isFree        true when tier is 'free'
 */

import { useUserStore } from '@/store/userStore';

export interface UseSubscriptionResult {
  tier: 'free' | 'pro' | 'family';
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;
}

export function useSubscription(): UseSubscriptionResult {
  const subscriptionTier = useUserStore((state) => state.subscriptionTier);

  return {
    tier: subscriptionTier,
    isPro: subscriptionTier === 'pro' || subscriptionTier === 'family',
    isFamily: subscriptionTier === 'family',
    isFree: subscriptionTier === 'free',
  };
}

export default useSubscription;
