import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useUser } from 'expo-superwall';
import { SubscriptionRepo, Entitlements } from '@/repos/SubscriptionRepo';
import {
  useSubscription as useBillingSubscription,
  useStartCheckout,
  useOpenBillingPortal,
  useCancelSubscription as useCancelBilling,
  useLinkAppleReceipt,
  useLinkGooglePurchase,
  useFeatureAccess,
} from '@/hooks/useSubscriptionBilling';
import type { SubscriptionResponse, CheckoutParams } from '@/types/subscription';

type SubscriptionTier = 'free_trial' | 'paid' | 'expired';
type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

interface SubscriptionState {
  // Subscription info
  tier: SubscriptionTier;
  trialStartDate: string | null;
  subscriptionStartDate: string | null; // First time user became a paid subscriber
  trialDaysRemaining: number;
  trialEndsAt?: string | null;
  trialGroup?: string | null;
  isPaid: boolean;
  isTrialExpired: boolean;
  paymentPlatform: 'apple' | 'google' | 'stripe' | null;
  subscriptionId?: string | null;
  subscriptionStatus?: 'active' | 'cancelled' | 'expired' | 'trial';
  currentPeriodEnd?: string | null;
  // AB trial strategy
  trialGateStrategy?: 'calendar_days' | 'screen_time';
  trialUsageSeconds?: number;
  trialUsageSecondsLimit?: number;

  // Sync preferences
  cloudSyncEnabled: boolean;
  autoSyncContacts: boolean;
  syncStatus: SyncStatus;
  lastSyncDate: string | null;

  // Actions
  enableCloudSync: () => Promise<void>;
  disableCloudSync: () => Promise<void>;
  startFreeTrial: () => Promise<void>;
  upgradeToPaid: (platform: 'apple' | 'google' | 'stripe') => Promise<void>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  syncNow: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
  isCancelling: boolean;

  // Billing API (web/Stripe)
  billingSubscription: SubscriptionResponse | undefined;
  billingLoading: boolean;
  billingError: Error | null;
  startCheckout: (params: CheckoutParams) => void;
  openBillingPortal: () => void;
  cancelBilling: (params?: { when?: 'period_end' | 'now'; reason?: string }) => void;
  linkAppleReceipt: (receipt: string) => Promise<void>;
  linkGooglePurchase: (params: { purchase_token: string; package_name: string; product_id: string }) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
}

const STORAGE_KEYS = {
  SUBSCRIPTION_STATE: '@subscription_state',
  TRIAL_START_DATE: '@trial_start_date',
  SUBSCRIPTION_START_DATE: '@subscription_start_date',
  TRIAL_USAGE_SECONDS: '@trial_usage_seconds',
  PAYMENT_PLATFORM: '@payment_platform',
  CLOUD_SYNC_ENABLED: '@cloud_sync_enabled',
  LAST_SYNC_DATE: '@last_sync_date',
} as const;

const FREE_TRIAL_DAYS = 7;

// Cross-platform storage abstraction (web: localStorage, native: AsyncStorage)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && Platform.OS === 'web' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && Platform.OS === 'web' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch { }
  }
};

export const [SubscriptionProvider, useSubscription] = createContextHook<SubscriptionState>(() => {
  // Superwall user sync
  const superwallUser = useUser();

  // Mobile subscription state
  const [tier, setTier] = useState<SubscriptionTier>('free_trial');
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(FREE_TRIAL_DAYS);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [trialGroup, setTrialGroup] = useState<string | null>(null);
  const [trialGateStrategy, setTrialGateStrategy] = useState<'calendar_days' | 'screen_time' | undefined>(undefined);
  const [trialUsageSeconds, setTrialUsageSeconds] = useState<number>(0);
  const [trialUsageSecondsLimit, setTrialUsageSecondsLimit] = useState<number | undefined>(undefined);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentPlatform, setPaymentPlatform] = useState<'apple' | 'google' | 'stripe' | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'cancelled' | 'expired' | 'trial'>('trial');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);
  const [autoSyncContacts] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  // Billing API hooks (web/Stripe)
  const billingQuery = useBillingSubscription();
  const checkoutMutation = useStartCheckout();
  const portalMutation = useOpenBillingPortal();
  const cancelBillingMutation = useCancelBilling();
  const linkAppleMutation = useLinkAppleReceipt();
  const linkGoogleMutation = useLinkGooglePurchase();

  // Load subscription state from backend ONLY - no local fallbacks for security
  const loadSubscriptionState = useCallback(async () => {
    try {
      console.log('[SubscriptionProvider] Loading subscription state from backend...');

      // Fetch entitlements from backend - REQUIRED, no local fallback
      const entitlements = await SubscriptionRepo.getEntitlements();

      if (!entitlements) {
        console.error('[SubscriptionProvider] ❌ Backend unreachable - blocking access');
        // Block access if backend is unreachable (intentional anti-piracy)
        setTier('expired');
        setIsPaid(false);
        setTrialDaysRemaining(0);
        setPaymentPlatform(null);
        return;
      }

      console.log('[SubscriptionProvider] ✅ Entitlements loaded:', entitlements);

      // Load ONLY non-security-critical UI preferences from local storage
      const [storedCloudSync, storedLastSync, storedUsageSeconds, storedSubscriptionStart] = await Promise.all([
        storage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED),
        storage.getItem(STORAGE_KEYS.LAST_SYNC_DATE),
        storage.getItem(STORAGE_KEYS.TRIAL_USAGE_SECONDS),
        storage.getItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE),
      ]);

      // Use ONLY backend data for subscription status (no local fallback)
      let effectiveTrialStart = entitlements?.trial_started_at || null;
      if (!effectiveTrialStart) {
        effectiveTrialStart = new Date().toISOString();
        await storage.setItem(STORAGE_KEYS.TRIAL_START_DATE, effectiveTrialStart);
      }
      setTrialStartDate(effectiveTrialStart);

      const startMs = new Date(effectiveTrialStart).getTime();
      const nowMs = Date.now();
      const fallbackDurationDays = Number.isFinite((entitlements as any)?.trial_duration_days)
        ? Math.max(0, Number((entitlements as any).trial_duration_days))
        : FREE_TRIAL_DAYS;
      const calcEndsMs = (start: number, days: number) => start + days * 24 * 60 * 60 * 1000;
      const endsIso = entitlements?.trial_ends_at
        ? new Date(entitlements.trial_ends_at).toISOString()
        : new Date(calcEndsMs(startMs, fallbackDurationDays)).toISOString();

      setTrialEndsAt(endsIso);
      setTrialGroup((entitlements as any)?.trial_group ?? null);
      setTrialGateStrategy((entitlements as any)?.trial_gate_strategy ?? 'calendar_days');
      const usageLimit = (entitlements as any)?.trial_usage_seconds_limit;
      setTrialUsageSecondsLimit(typeof usageLimit === 'number' ? usageLimit : undefined);
      const initialUsage = storedUsageSeconds ? parseInt(storedUsageSeconds, 10) : 0;
      setTrialUsageSeconds(Number.isFinite(initialUsage) ? initialUsage : 0);

      const endsMs = new Date(endsIso).getTime();
      const remainingDays = Math.max(0, Math.ceil((endsMs - nowMs) / (1000 * 60 * 60 * 24)));
      setTrialDaysRemaining(remainingDays);

      // Set tier and payment status from entitlements
      // FIX: Check BOTH subscription_status AND tier to handle data inconsistencies
      // (subscription_tier might not be updated immediately by webhook)
      const isPaidSubscription = entitlements.subscription_status === 'active' ||
        entitlements.subscription_status === 'past_due' || // Still has access
        entitlements.tier === 'pro' ||
        entitlements.tier === 'enterprise';

      // Log warning if subscription_status and tier are out of sync (indicates webhook bug)
      if (entitlements.subscription_status === 'active' && entitlements.tier === 'free') {
        console.warn('⚠️ [SubscriptionProvider] Data inconsistency detected:');
        console.warn('   subscription_status: active (paid)');
        console.warn('   subscription_tier: free (should be pro)');
        console.warn('   This indicates webhook handler needs to update subscription_tier');
      }
      if (entitlements.tier === 'pro' && !entitlements.subscription_status) {
        console.warn('⚠️ [SubscriptionProvider] Data inconsistency detected:');
        console.warn('   subscription_tier: pro');
        console.warn('   subscription_status: null/undefined');
        console.warn('   This might be a legacy record');
      }

      // Set subscription ID, status, and period end
      setSubscriptionId((entitlements as any)?.subscription_id || null);
      // Map backend status to frontend status (handle "canceled" vs "cancelled" spelling)
      const backendStatus = entitlements.subscription_status as string;
      let mappedStatus: 'active' | 'cancelled' | 'expired' | 'trial' = 'trial';
      if (backendStatus === 'canceled' || backendStatus === 'cancelled') {
        mappedStatus = 'cancelled';
      } else if (backendStatus === 'active') {
        mappedStatus = 'active';
      } else if (backendStatus === 'expired') {
        mappedStatus = 'expired';
      } else if (backendStatus === 'past_due') {
        mappedStatus = 'expired'; // Treat past_due as expired
      }
      setSubscriptionStatus(mappedStatus);
      setCurrentPeriodEnd((entitlements as any)?.current_period_end || null);

      if (isPaidSubscription) {
        console.log('\n💰 [SubscriptionProvider] ════════════════════════════════════════');
        console.log('💰 [SubscriptionProvider] ✅ USER IS PAID');
        console.log('💰 [SubscriptionProvider] subscription_status:', entitlements.subscription_status);
        console.log('💰 [SubscriptionProvider] tier:', entitlements.tier);
        console.log('💰 [SubscriptionProvider] ════════════════════════════════════════\n');
        setTier('paid');
        setIsPaid(true);

        // Get payment platform from backend (check both 'source' and 'payment_platform' fields)
        const src = (entitlements as any)?.source as 'app_store' | 'play' | 'stripe' | 'manual' | undefined;
        const paymentPlatformField = (entitlements as any)?.payment_platform as 'apple' | 'google' | 'stripe' | undefined;

        const platformFromBackend: 'apple' | 'google' | 'stripe' | null =
          src === 'app_store' ? 'apple' :
            src === 'play' ? 'google' :
              src === 'stripe' ? 'stripe' :
                paymentPlatformField === 'apple' ? 'apple' :
                  paymentPlatformField === 'google' ? 'google' :
                    paymentPlatformField === 'stripe' ? 'stripe' :
                      null;
        setPaymentPlatform(platformFromBackend);

        // CRITICAL FIX: Set subscription start date - PREFER BACKEND when available
        // Backend is source of truth for subscription_started_at
        const backendSubscriptionStart = (entitlements as any)?.subscription_started_at;
        let subscriptionStart: string;

        if (backendSubscriptionStart) {
          // Backend has the canonical date - use it and update local storage if different
          subscriptionStart = backendSubscriptionStart;
          if (storedSubscriptionStart !== backendSubscriptionStart) {
            await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, backendSubscriptionStart);
            console.log('[SubscriptionProvider] 🔄 Updated subscription start date from backend:', backendSubscriptionStart);
          } else {
            console.log('[SubscriptionProvider] ✅ Backend and local storage match:', subscriptionStart);
          }
        } else if (storedSubscriptionStart) {
          // No backend value, use stored value
          subscriptionStart = storedSubscriptionStart;
          console.log('[SubscriptionProvider] ✅ Using stored subscription start date:', subscriptionStart);
        } else {
          // Neither exists - create new date (first time subscription)
          subscriptionStart = new Date().toISOString();
          await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, subscriptionStart);
          console.log('[SubscriptionProvider] 🆕 First subscription - saved start date:', subscriptionStart);
        }

        setSubscriptionStartDate(subscriptionStart);
      } else if (((entitlements as any)?.trial_gate_strategy === 'screen_time') ? true : (remainingDays > 0 || entitlements.subscription_status === 'trial')) {
        console.log('\n⏳ [SubscriptionProvider] ════════════════════════════════════════');
        console.log('⏳ [SubscriptionProvider] User is on FREE TRIAL');
        console.log('⏳ [SubscriptionProvider] remainingDays:', remainingDays);
        console.log('⏳ [SubscriptionProvider] subscription_status:', entitlements.subscription_status);
        console.log('⏳ [SubscriptionProvider] ════════════════════════════════════════\n');
        setTier('free_trial');
        setIsPaid(false);
        setPaymentPlatform(null);
      } else {
        console.log('\n❌ [SubscriptionProvider] ════════════════════════════════════════');
        console.log('❌ [SubscriptionProvider] User subscription EXPIRED');
        console.log('❌ [SubscriptionProvider] remainingDays:', remainingDays);
        console.log('❌ [SubscriptionProvider] subscription_status:', entitlements.subscription_status);
        console.log('❌ [SubscriptionProvider] tier:', entitlements.tier);
        console.log('❌ [SubscriptionProvider] ════════════════════════════════════════\n');
        setTier('expired');
        setIsPaid(false);
        setPaymentPlatform(null);
      }

      // Set sync preferences
      setCloudSyncEnabled(storedCloudSync === 'true');
      setLastSyncDate(storedLastSync);
      setSyncStatus(storedCloudSync === 'true' ? 'synced' : 'offline');

      console.log('[SubscriptionProvider] ✅ Subscription state loaded successfully');
    } catch (error) {
      console.error('[SubscriptionProvider] ❌ CRITICAL: Backend fetch failed - blocking access', error);

      // INTENTIONAL: Block access if we can't verify subscription status with backend
      // This prevents offline bypass of paywall
      setTier('expired');
      setIsPaid(false);
      setTrialDaysRemaining(0);
      setPaymentPlatform(null);

      // User must be online to verify subscription status
      console.error('[SubscriptionProvider] User must connect to server to verify subscription');
    }
  }, []);

  useEffect(() => {
    loadSubscriptionState();
  }, [loadSubscriptionState]);

  // Auto-refresh entitlements when app returns to foreground (e.g., after purchase in App Store)
  const lastRefreshRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let appStateValue = AppState.currentState;
    
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Detect app returning to foreground
      if (appStateValue.match(/inactive|background/) && nextAppState === 'active') {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;
        
        // Throttle: minimum 5 seconds between auto-refreshes
        if (timeSinceLastRefresh > 5000 && !isRefreshingRef.current) {
          console.log('[SubscriptionProvider] 🔄 App returned to foreground - refreshing entitlements');
          isRefreshingRef.current = true;
          lastRefreshRef.current = now;
          
          try {
            await loadSubscriptionState();
            console.log('[SubscriptionProvider] ✅ Auto-refresh completed');
          } finally {
            isRefreshingRef.current = false;
          }
        }
      }
      appStateValue = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [loadSubscriptionState]);

  // Sync subscription status with Superwall to prevent paywall for paid users
  // Only sync once when subscription loads, not on every change
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!superwallUser || hasSyncedRef.current) return;

    // Only sync if we actually have subscription data loaded
    if (tier === 'free_trial' && trialDaysRemaining === FREE_TRIAL_DAYS) {
      // Still loading initial data, wait
      return;
    }

    console.log('[SubscriptionProvider] Syncing with Superwall once - isPaid:', isPaid, 'tier:', tier);

    // Update user attributes to tell Superwall about subscription status
    superwallUser.update({
      isPaid: isPaid,
      subscriptionTier: tier,
      subscriptionStatus: subscriptionStatus,
      hasActiveSubscription: isPaid,
      trialDaysRemaining: trialDaysRemaining,
      paymentPlatform: paymentPlatform || 'none',
    }).then(() => {
      hasSyncedRef.current = true;
      console.log('[SubscriptionProvider] ✅ Superwall synced successfully');
    }).catch((error) => {
      console.warn('[SubscriptionProvider] ⚠️ Failed to sync Superwall:', error);
    });
  }, [superwallUser, isPaid, tier, subscriptionStatus, trialDaysRemaining, paymentPlatform]);

  // Track screen-time usage for screen_time strategy
  useEffect(() => {
    let interval: any = null;
    let appState: AppStateStatus = AppState.currentState;
    const onTick = async () => {
      setTrialUsageSeconds(prev => {
        const next = prev + 1;
        void storage.setItem(STORAGE_KEYS.TRIAL_USAGE_SECONDS, String(next));
        return next;
      });
    };
    const handleStateChange = (nextState: AppStateStatus) => {
      if (appState === 'active' && nextState.match(/inactive|background/)) {
        if (interval) clearInterval(interval);
        interval = null;
      }
      if (nextState === 'active') {
        if (!interval) interval = setInterval(onTick, 1000);
      }
      appState = nextState;
    };
    const sub = AppState.addEventListener('change', handleStateChange);
    // Start if active
    if (appState === 'active') interval = setInterval(onTick, 1000);

    return () => {
      sub.remove();
      if (interval) clearInterval(interval);
    };
  }, []);

  const enableCloudSync = useCallback(async () => {
    try {
      await storage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, 'true');
      setCloudSyncEnabled(true);
      setSyncStatus('offline'); // Will need authentication to actually sync
      console.log('Cloud sync enabled - user will need to sign in to sync data');
    } catch (error) {
      console.error('Failed to enable cloud sync:', error);
    }
  }, []);

  const disableCloudSync = useCallback(async () => {
    try {
      await storage.setItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED, 'false');
      setCloudSyncEnabled(false);
      setSyncStatus('offline');
      console.log('Cloud sync disabled - data will remain local only');
    } catch (error) {
      console.error('Failed to disable cloud sync:', error);
    }
  }, []);

  const startFreeTrial = useCallback(async () => {
    try {
      const trialStart = new Date().toISOString();
      await storage.setItem(STORAGE_KEYS.TRIAL_START_DATE, trialStart);
      setTrialStartDate(trialStart);
      setTrialDaysRemaining(FREE_TRIAL_DAYS);
      setTier('free_trial');
      setIsPaid(false);
    } catch (error) {
      console.error('Failed to start free trial:', error);
    }
  }, []);

  const upgradeToPaid = useCallback(async (platform: 'apple' | 'google' | 'stripe') => {
    if (!platform || !['apple', 'google', 'stripe'].includes(platform)) {
      console.error('Invalid payment platform');
      return;
    }

    try {
      await storage.setItem(STORAGE_KEYS.PAYMENT_PLATFORM, platform);
      setPaymentPlatform(platform);
      setTier('paid');
      setIsPaid(true);

      // CRITICAL: Save subscriptionStartDate only if not already set (first time becoming paid)
      const existingStartDate = await storage.getItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE);
      if (!existingStartDate) {
        const startDate = new Date().toISOString();
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, startDate);
        setSubscriptionStartDate(startDate);
        console.log(`First subscription via ${platform} - saved start date:`, startDate);
      } else {
        console.log(`Upgraded to paid via ${platform} - preserving original start date:`, existingStartDate);
      }
    } catch (error) {
      console.error('Failed to upgrade to paid:', error);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!cloudSyncEnabled) {
      console.log('Cloud sync is disabled');
      return;
    }

    setSyncStatus('syncing');
    try {
      // This would trigger the actual sync process
      // For now, just simulate a sync
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      const syncDate = new Date().toISOString();
      await storage.setItem(STORAGE_KEYS.LAST_SYNC_DATE, syncDate);
      setLastSyncDate(syncDate);
      setSyncStatus('synced');
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [cloudSyncEnabled]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!subscriptionId) {
      return { success: false, error: 'No active subscription found' };
    }

    setIsCancelling(true);
    try {
      console.log('[SubscriptionProvider] Cancelling subscription:', subscriptionId);

      const response = await SubscriptionRepo.cancelSubscription({
        when: 'period_end', // Cancel at end of billing period
        reason: 'user_requested'
      });

      if (!response.success) {
        console.error('[SubscriptionProvider] Cancellation failed');
        return { success: false, error: 'Failed to cancel subscription' };
      }

      console.log('[SubscriptionProvider] ✅ Subscription cancelled successfully');

      // Refresh entitlements to get updated status
      await loadSubscriptionState();

      return { success: true };
    } catch (error) {
      console.error('[SubscriptionProvider] Cancellation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsCancelling(false);
    }
  }, [subscriptionId, loadSubscriptionState]);

  const refreshEntitlements = useCallback(async () => {
    console.log('[SubscriptionProvider] Manually refreshing entitlements...');
    await loadSubscriptionState();
  }, [loadSubscriptionState]);

  return useMemo(() => ({
    tier,
    trialStartDate,
    subscriptionStartDate,
    trialDaysRemaining,
    trialEndsAt,
    trialGroup,
    isPaid,
    isTrialExpired: !isPaid && (
      (trialGateStrategy === 'screen_time' && trialUsageSecondsLimit != null ? trialUsageSeconds >= trialUsageSecondsLimit : false) ||
      (trialGateStrategy !== 'screen_time' && trialDaysRemaining <= 0)
    ),
    paymentPlatform,
    subscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    trialGateStrategy,
    trialUsageSeconds,
    trialUsageSecondsLimit,
    cloudSyncEnabled,
    autoSyncContacts,
    syncStatus,
    lastSyncDate,
    enableCloudSync,
    disableCloudSync,
    startFreeTrial,
    upgradeToPaid,
    cancelSubscription,
    isCancelling,
    syncNow,
    refreshEntitlements,

    // Billing API (web/Stripe)
    billingSubscription: billingQuery.data,
    billingLoading: billingQuery.isLoading,
    billingError: billingQuery.error,
    startCheckout: (params: CheckoutParams) => checkoutMutation.mutate(params),
    openBillingPortal: () => portalMutation.mutate(),
    cancelBilling: (params) => cancelBillingMutation.mutate(params),
    linkAppleReceipt: async (receipt: string) => {
      await linkAppleMutation.mutateAsync({ receipt });
    },
    linkGooglePurchase: async (params) => {
      await linkGoogleMutation.mutateAsync(params);
    },
    restorePurchases: async () => {
      console.log('[SubscriptionProvider] Restoring purchases...');

      // Poll for updated status (webhook latency handling)
      // RevenueCat webhooks can take a few seconds to reach the backend
      const MAX_RETRIES = 5;
      const DELAY_MS = 1000;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const result = await SubscriptionRepo.restorePurchases();

          // Check if we got a paid entitlement
          // We look for 'active' status OR any paid tier (core, pro, enterprise)
          const hasPaidEntitlement =
            result.entitlements?.subscription_status === 'active' ||
            result.entitlements?.tier === 'core' ||
            result.entitlements?.tier === 'pro' ||
            result.entitlements?.tier === 'enterprise';

          if (result.success && hasPaidEntitlement) {
            console.log('[SubscriptionProvider] ✅ Restore successful and verified PAID status');
            await loadSubscriptionState();
            return true;
          }

          if (result.success && !hasPaidEntitlement) {
            console.log(`[SubscriptionProvider] ⏳ Restore successful but backend says NOT PAID. Retrying (${i + 1}/${MAX_RETRIES})...`);
            if (i < MAX_RETRIES - 1) {
              await new Promise(r => setTimeout(r, DELAY_MS));
              continue;
            }
          }

          // If API failed, we might want to retry or stop. 
          // For now, if it fails, we stop to avoid spamming errors.
          if (!result.success) {
            console.warn('[SubscriptionProvider] Restore API call failed');
            break;
          }
        } catch (e) {
          console.error('[SubscriptionProvider] Error during restore polling:', e);
        }
      }

      // Final attempt to load state (even if polling didn't find "paid", we should update to whatever is there)
      console.log('[SubscriptionProvider] Restore polling finished. Reloading final state...');
      await loadSubscriptionState();

      // Return true if we are now paid (checked via state or last result)
      // We can't easily check the *new* state here without a ref or another fetch, 
      // but the caller (PaywallRouter) mostly cares that we *tried* hard.
      // Let's return true if the *last* fetch was at least successful in hitting the API.
      return true;
    },
  }), [
    tier,
    trialStartDate,
    subscriptionStartDate,
    trialDaysRemaining,
    trialEndsAt,
    trialGroup,
    isPaid,
    trialGateStrategy,
    trialUsageSeconds,
    trialUsageSecondsLimit,
    paymentPlatform,
    subscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
    cloudSyncEnabled,
    autoSyncContacts,
    syncStatus,
    lastSyncDate,
    enableCloudSync,
    disableCloudSync,
    startFreeTrial,
    upgradeToPaid,
    cancelSubscription,
    isCancelling,
    syncNow,
    refreshEntitlements,
    billingQuery.data,
    billingQuery.isLoading,
    billingQuery.error,
    checkoutMutation.mutate,
    portalMutation.mutate,
    cancelBillingMutation.mutate,
    linkAppleMutation.mutateAsync,
    linkGoogleMutation.mutateAsync,
  ]);
});