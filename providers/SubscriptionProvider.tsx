import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { SubscriptionRepo, Entitlements } from '@/repos/SubscriptionRepo';

type SubscriptionTier = 'free_trial' | 'paid' | 'expired';
type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

interface SubscriptionState {
  // Subscription info
  tier: SubscriptionTier;
  trialStartDate: string | null;
  subscriptionStartDate: string | null;  // When user first became paid (never changes)
  trialDaysRemaining: number;
  isPaid: boolean;
  paymentPlatform: 'apple' | 'google' | 'stripe' | null;
  
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
  syncNow: () => Promise<void>;
}

const STORAGE_KEYS = {
  SUBSCRIPTION_STATE: '@subscription_state',
  TRIAL_START_DATE: '@trial_start_date',
  SUBSCRIPTION_START_DATE: '@subscription_start_date',  // When user first subscribed
  PAYMENT_PLATFORM: '@payment_platform',
  CLOUD_SYNC_ENABLED: '@cloud_sync_enabled',
  LAST_SYNC_DATE: '@last_sync_date',
} as const;

const FREE_TRIAL_DAYS = 7;

// Simple storage abstraction
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }
};

export const [SubscriptionProvider, useSubscription] = createContextHook<SubscriptionState>(() => {
  const [tier, setTier] = useState<SubscriptionTier>('free_trial');
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(FREE_TRIAL_DAYS);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentPlatform, setPaymentPlatform] = useState<'apple' | 'google' | 'stripe' | null>(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);
  const [autoSyncContacts] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  // Load subscription state from backend and storage
  const loadSubscriptionState = useCallback(async () => {
    try {
      console.log('[SubscriptionProvider] Loading subscription state');

      // Fetch entitlements from backend
      const entitlements = await SubscriptionRepo.getEntitlements();
      console.log('[SubscriptionProvider] Entitlements:', entitlements);

      // Load local preferences
      const [storedTrialStart, storedSubscriptionStart, storedPaymentPlatform, storedCloudSync, storedLastSync] = await Promise.all([
        storage.getItem(STORAGE_KEYS.TRIAL_START_DATE),
        storage.getItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE),
        storage.getItem(STORAGE_KEYS.PAYMENT_PLATFORM),
        storage.getItem(STORAGE_KEYS.CLOUD_SYNC_ENABLED),
        storage.getItem(STORAGE_KEYS.LAST_SYNC_DATE),
      ]);

      // Process trial dates
      let trialStart = storedTrialStart || new Date().toISOString();
      if (entitlements.trial_ends_at) {
        // Use backend trial date if available
        const trialEndsAt = new Date(entitlements.trial_ends_at);
        const trialDuration = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
        trialStart = new Date(trialEndsAt.getTime() - trialDuration).toISOString();
      } else if (!storedTrialStart) {
        await storage.setItem(STORAGE_KEYS.TRIAL_START_DATE, trialStart);
      }
      setTrialStartDate(trialStart);

      // Calculate trial days remaining
      const trialStartTime = new Date(trialStart).getTime();
      const currentTime = Date.now();
      const daysPassed = Math.floor((currentTime - trialStartTime) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, FREE_TRIAL_DAYS - daysPassed);
      setTrialDaysRemaining(daysRemaining);

      // CRITICAL FIX: Load subscription start date (when user first became paid)
      // Check in order: 1) Stored local value, 2) Backend value, 3) Create new if needed
      let subscriptionStart = storedSubscriptionStart || 
                             (entitlements as any)?.subscription_started_at;
      
      if (!subscriptionStart && entitlements.subscription_status === 'active') {
        // First time user became paid - save the date
        subscriptionStart = new Date().toISOString();
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, subscriptionStart);
        console.log('[SubscriptionProvider] First subscription - saved start date:', subscriptionStart);
      } else if (subscriptionStart) {
        console.log('[SubscriptionProvider] Using stored subscription start date:', subscriptionStart);
      }
      
      setSubscriptionStartDate(subscriptionStart);

      // Set tier and payment status from entitlements
      const isPaidSubscription = entitlements.subscription_status === 'active' || 
                                  entitlements.tier === 'pro' || 
                                  entitlements.tier === 'enterprise';
      
      if (isPaidSubscription) {
        setTier('paid');
        setIsPaid(true);
        const platform = (storedPaymentPlatform as 'apple' | 'google' | 'stripe') || 'stripe';
        setPaymentPlatform(platform);
      } else if (daysRemaining > 0 || entitlements.subscription_status === 'trial') {
        setTier('free_trial');
        setIsPaid(false);
        setPaymentPlatform(null);
      } else {
        setTier('expired');
        setIsPaid(false);
        setPaymentPlatform(null);
      }

      // Set sync preferences
      setCloudSyncEnabled(storedCloudSync === 'true');
      setLastSyncDate(storedLastSync);
      setSyncStatus(storedCloudSync === 'true' ? 'synced' : 'offline');
      
      console.log('[SubscriptionProvider] Subscription state loaded');
    } catch (error) {
      console.error('[SubscriptionProvider] Failed to load subscription state:', error);
    }
  }, []);

  useEffect(() => {
    loadSubscriptionState();
  }, [loadSubscriptionState]);

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
      
      // CRITICAL: Save subscriptionStartDate only if not already set
      const existingStartDate = await storage.getItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE);
      if (!existingStartDate) {
        const startDate = new Date().toISOString();
        await storage.setItem(STORAGE_KEYS.SUBSCRIPTION_START_DATE, startDate);
        setSubscriptionStartDate(startDate);
        console.log(`[SubscriptionProvider] First subscription via ${platform} - saved start date:`, startDate);
      } else {
        console.log(`[SubscriptionProvider] Subscription already exists since:`, existingStartDate);
      }
      
      console.log(`Upgraded to paid via ${platform}`);
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

  return useMemo(() => ({
    tier,
    trialStartDate,
    subscriptionStartDate,
    trialDaysRemaining,
    isPaid,
    paymentPlatform,
    cloudSyncEnabled,
    autoSyncContacts,
    syncStatus,
    lastSyncDate,
    enableCloudSync,
    disableCloudSync,
    startFreeTrial,
    upgradeToPaid,
    syncNow,
  }), [
    tier,
    trialStartDate,
    subscriptionStartDate,
    trialDaysRemaining,
    isPaid,
    paymentPlatform,
    cloudSyncEnabled,
    autoSyncContacts,
    syncStatus,
    lastSyncDate,
    enableCloudSync,
    disableCloudSync,
    startFreeTrial,
    upgradeToPaid,
    syncNow,
  ]);
});