import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRemotePaywallConfig } from './useRemotePaywallConfig';
import { useAnalyticsTracking } from './useAnalyticsTracking';
import { useSubscription } from '@/providers/SubscriptionProvider';

const HARD_PAYWALL_COMPLETED_KEY = '@everreach/hard_paywall_completed';

export function usePaywall() {
  const router = useRouter();
  const { config } = useRemotePaywallConfig();
  const { trackEvent } = useAnalyticsTracking();
  const { isPaid } = useSubscription();

  const showPaywall = useCallback(
    async (placement: string, metadata?: any) => {
      trackEvent('paywall_shown', {
        placement,
        variant: config?.paywall_variant,
        ...metadata,
      });
      
      // Navigate to subscription plans screen (has RevenueCat integration)
      console.log('[Paywall] Showing paywall:', placement, metadata);
      router.push('/subscription-plans');
    },
    [config, trackEvent, router]
  );

  const shouldShowHardPaywall = useCallback(async () => {
    if (!config?.hard_paywall_mode) return false;
    if (isPaid) return false;

    // Check if user already completed hard paywall
    const completed = await AsyncStorage.getItem(HARD_PAYWALL_COMPLETED_KEY);
    return completed !== 'true';
  }, [config, isPaid]);

  const markHardPaywallCompleted = useCallback(async () => {
    await AsyncStorage.setItem(HARD_PAYWALL_COMPLETED_KEY, 'true');
  }, []);

  return {
    showPaywall,
    shouldShowHardPaywall,
    markHardPaywallCompleted,
    config,
  };
}
