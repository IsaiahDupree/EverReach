import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActionSheetIOS,
  Platform,
  Image,
  Pressable,
  Linking,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogOut,
  Shield,
  HelpCircle,
  Mail,
  Bell,
  User,
  Code,
  FileText,
  FileCheck,
  Lock,
  ChevronRight,
  Thermometer,
  Users,
  MessageSquare,
  Activity,
  Cloud,
  Palette,
  Play,
  XCircle,
  RefreshCcw,
  Info,
  CheckCircle2,
  Wrench,
  Plus,
  Minus,
  RefreshCw,
  History
} from 'lucide-react-native';
import { useAuth } from "@/providers/AuthProviderV2";
import { useAppSettings, type ThemeMode, type Theme } from "@/providers/AppSettingsProvider";
import { useSubscription } from "@/providers/SubscriptionProvider";
import { usePaywall } from "@/providers/PaywallProvider";
import { usePeople } from "@/providers/PeopleProvider";
import { useWarmth } from "@/providers/WarmthProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { FLAGS } from '@/constants/flags';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { exportAllData, getStorageStats } from '@/tools/backup';

import { router, useFocusEffect } from 'expo-router';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';
import { SHOW_DEV_SETTINGS } from '@/config/dev';

// Show dev/testing settings only when explicitly enabled via environment variable

// Third-party imports (Phase 2) - set to 'false' to disable
const ENABLE_THIRD_PARTY_IMPORTS = process.env.EXPO_PUBLIC_ENABLE_THIRD_PARTY_IMPORTS !== 'false';

type SettingItemToggle = {
  icon: any;
  label: string;
  type: 'toggle';
  value: boolean;
  onToggle: (val: boolean) => void;
};

type SettingItemLink = {
  icon: any;
  label: string;
  type: 'link';
  onPress: () => void;
};

type SettingSection = {
  title: string;
  items: (SettingItemToggle | SettingItemLink)[];
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, orgId } = useAuth();

  // Analytics tracking
  const screenAnalytics = useAnalytics('Settings');
  const { cloudModeEnabled, enableCloudMode, disableCloudMode, themeMode, setTheme, theme, devFeaturesEnabled, enableDevFeatures, disableDevFeatures } = useAppSettings();
  const {
    trialDaysRemaining,
    isPaid: isSubscriptionPaid,
    trialGateStrategy,
    trialUsageSeconds,
    trialUsageSecondsLimit,
    refreshEntitlements,
    restorePurchases,
  } = useSubscription();
  const { people, addPerson, refreshPeople } = usePeople();
  const { refreshBulk } = useWarmth();
  const { resetOnboarding, completeOnboarding, isCompleted, setOnboardingEnabled } = useOnboarding();
  const [onboardingEnabled, setOnboardingEnabledState] = React.useState<boolean>(!isCompleted);
  const [voiceBackup, setVoiceBackup] = React.useState<boolean>(false);
  const [warmthOffsetDays, setWarmthOffsetDays] = React.useState<number>(1);

  const [checkingConn, setCheckingConn] = React.useState<boolean>(false);
  const [connOk, setConnOk] = React.useState<boolean | null>(null);
  const [connErr, setConnErr] = React.useState<string | null>(null);

  // Vercel backend health status
  const [checkingVercel, setCheckingVercel] = React.useState<boolean>(false);
  const [vercelStatus, setVercelStatus] = React.useState<any>(null);
  const [vercelError, setVercelError] = React.useState<string | null>(null);

  // Refresh entitlements when Settings screen is focused (with throttle)
  const lastFocusRefreshRef = React.useRef<number>(0);
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      // Throttle: minimum 10 seconds between screen focus refreshes
      if (now - lastFocusRefreshRef.current > 10000) {
        console.log('[Settings] 🔄 Screen focused - refreshing entitlements');
        lastFocusRefreshRef.current = now;
        refreshEntitlements();
      }
    }, [refreshEntitlements])
  );

  const checkVercelHealth = React.useCallback(async () => {
    try {
      setCheckingVercel(true);
      setVercelError(null);

      // Use the stable alias from env var
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
      const healthUrl = `${baseUrl}/api/health`;

      console.log('[Vercel Health] Checking:', healthUrl);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': 'fesg4t346dgd534g3456rg43t43542gr'
        }
      });

      console.log('[Vercel Health] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Vercel Health] Response data:', data);
      setVercelStatus(data);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.error('[Vercel Health] Error:', msg);
      setVercelError(msg);
      setVercelStatus(null);
    } finally {
      setCheckingVercel(false);
    }
  }, []);

  const checkSupabase = React.useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      setConnOk(null);
      setConnErr(null);
      return;
    }
    try {
      setCheckingConn(true);
      setConnErr(null);
      const { data, error } = await supabase
        .from('message_threads')
        .select('id')
        .limit(1);
      if (error) {
        const msg = String(error.message ?? error);
        const isNetwork = /fetch|network|TypeError/i.test(msg);
        setConnOk(!isNetwork);
        setConnErr(isNetwork ? msg : null);
      } else {
        setConnOk(true);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const isNetwork = /fetch|network|TypeError/i.test(msg);
      setConnOk(false);
      setConnErr(isNetwork ? msg : '');
    } finally {
      setCheckingConn(false);
    }
  }, []);

  React.useEffect(() => {
    void checkSupabase();
    void checkVercelHealth();
  }, [checkSupabase, checkVercelHealth]);

  // Update local onboarding enabled state when isCompleted changes
  React.useEffect(() => {
    setOnboardingEnabledState(!isCompleted);
  }, [isCompleted]);

  const handleToggleSync = async (next: boolean) => {
    if (FLAGS.LOCAL_ONLY) {
      Alert.alert('Mode Locked', 'App is running in local-only mode due to environment settings. Cloud mode is disabled.');
      return;
    }

    if (next) {
      await enableCloudMode();
      screenAnalytics.track('cloud_sync_enabled', { hadUser: !!user });
      if (!user) {
        Alert.alert('Cloud Sync', 'Please sign in to enable sync across devices.', [{ text: 'OK' }]);
      }
    } else {
      Alert.alert(
        'Disable Cloud Sync',
        'This will stop syncing to the cloud and sign you out on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableCloudMode();
              screenAnalytics.track('cloud_sync_disabled');
              // Sign out will happen automatically when cloud mode is disabled
              // due to the updated auth logic
            },
          },
        ]
      );
    }
  };

  const handleRCShowUserId = async () => {
    try {
      if (Platform.OS === 'web') return Alert.alert('Unavailable', 'RevenueCat is not available on web.');
      const { getAppUserId } = await import('@/lib/revenuecat');
      const id = await getAppUserId();
      Alert.alert('RevenueCat App User ID', id || '(none)');
    } catch {
      Alert.alert('Error', 'Failed to get RC user id');
    }
  };

  const handleRCLogOut = async () => {
    try {
      if (Platform.OS === 'web') return;
      const { logOut } = await import('@/lib/revenuecat');
      await logOut();
      Alert.alert('RevenueCat', 'Logged out of RC on this device.');
    } catch {
      Alert.alert('Error', 'Failed to log out of RC');
    }
  };

  const handleRCLogInAsCurrent = async () => {
    try {
      if (Platform.OS === 'web') return;
      if (!user?.id) return Alert.alert('Auth', 'No signed-in user.');
      const { logIn } = await import('@/lib/revenuecat');
      const res = await logIn(String(user.id));
      Alert.alert('RevenueCat', res ? 'Linked to current Supabase user.' : 'Failed to link.');
    } catch {
      Alert.alert('Error', 'Failed to log in to RC');
    }
  };

  const handleRCLogInNewTest = async () => {
    try {
      if (Platform.OS === 'web') return;
      const { logIn } = await import('@/lib/revenuecat');
      const testId = `rc_test_${Platform.OS}_${Date.now()}`;
      const res = await logIn(testId);
      Alert.alert('RevenueCat', res ? `Linked to ${testId}` : 'Failed to link.');
    } catch {
      Alert.alert('Error', 'Failed to create RC test user');
    }
  };

  const handleRCFetchOfferings = async () => {
    try {
      if (Platform.OS === 'web') return;
      const { fetchOfferings } = await import('@/lib/revenuecat');
      const offerings = await fetchOfferings();
      const count = offerings?.current?.availablePackages?.length || 0;
      Alert.alert('Offerings', `${count} packages available`);
    } catch {
      Alert.alert('Error', 'Failed to fetch offerings');
    }
  };

  const handleRCPurchaseMonthly = async () => {
    try {
      if (Platform.OS === 'web') return;
      const { fetchOfferings, purchasePackageById } = await import('@/lib/revenuecat');

      // Fetch offerings to find available packages
      const offerings = await fetchOfferings();
      const packages = offerings?.current?.availablePackages || [];

      if (packages.length === 0) {
        Alert.alert('No Packages', 'No subscription packages available. Check RevenueCat dashboard.');
        return;
      }

      // Find monthly package (try common identifiers)
      const monthlyPkg = packages.find((p: any) =>
        p.identifier?.includes('monthly') ||
        p.identifier === '$rc_monthly' ||
        p.packageType === 'MONTHLY'
      );

      const pkgToUse = monthlyPkg || packages[0]; // Use first package if no monthly found
      const res = await purchasePackageById(pkgToUse.identifier);

      Alert.alert('Purchase', res ? 'Success' : 'Cancelled/Failed');
    } catch (err: any) {
      Alert.alert('Error', `Purchase failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleRCRestore = async () => {
    try {
      if (Platform.OS === 'web') return;
      const { restorePurchases } = await import('@/lib/revenuecat');
      const res = await restorePurchases();
      Alert.alert('Restore', res ? 'Restored purchases' : 'No purchases');
    } catch {
      Alert.alert('Error', 'Restore failed');
    }
  };

  const handleTriggerPaywall = async () => {
    try {
      if (Platform.OS === 'web') return Alert.alert('Unavailable', 'Paywalls are not available on web.');

      // Use RevenueCat's native paywall presentation
      const { fetchOfferings } = await import('@/lib/revenuecat');
      const offerings = await fetchOfferings();

      if (!offerings?.current) {
        Alert.alert('No Offerings', 'No subscription offerings available. Check RevenueCat dashboard.');
        return;
      }

      // Navigate to subscription plans screen which acts as our paywall
      router.push('/subscription-plans');

    } catch (err: any) {
      Alert.alert('Error', `Failed to show paywall: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleBackendRecomputeEntitlements = async () => {
    try {
      const { restorePurchases } = await SubscriptionRepo; // calls /api/v1/billing/restore under the hood
      const res = await restorePurchases();
      if (res.success) {
        // Auto-refresh the frontend SubscriptionProvider state
        await refreshEntitlements();
        Alert.alert('Backend', 'Entitlements recomputed and refreshed.');
      } else {
        Alert.alert('Backend', 'Recompute failed');
      }
    } catch {
      Alert.alert('Backend', 'Recompute failed');
    }
  };

  const handleRefreshEntitlements = async () => {
    try {
      console.log('[Settings] Refreshing entitlements and syncing with RevenueCat...');
      // First restore purchases (syncs with RevenueCat and updates database)
      await restorePurchases();
      // Then refresh entitlements to get the latest from database
      await refreshEntitlements();
      Alert.alert('Entitlements Refreshed', 'Subscription status and trial info updated.');
    } catch (e) {
      console.error('[Settings] Failed to refresh entitlements:', e);
      Alert.alert('Error', 'Failed to refresh entitlements');
    }
  };

  const handleTestRevenueCatPaywall = () => {
    Alert.alert(
      'Test RevenueCat Paywall',
      'This will show the RevenueCat paywall UI. Note: Requires custom dev build (not Expo Go).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Paywall',
          onPress: () => {
            router.push({
              pathname: '/test-paywall',
              params: { provider: 'revenuecat' }
            } as any);
          }
        }
      ]
    );
  };

  const handleTestSuperwallPaywall = () => {
    Alert.alert(
      'Test Superwall Paywall',
      'This will show the Superwall paywall UI. Note: Requires custom dev build (not Expo Go).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Paywall',
          onPress: () => {
            router.push({
              pathname: '/test-paywall',
              params: { provider: 'superwall' }
            } as any);
          }
        }
      ]
    );
  };

  const handleTestSuperwallPaywall2 = () => {
    Alert.alert(
      'Test Superwall Paywall #2',
      'This will show the second Superwall paywall configuration. Note: Requires custom dev build (not Expo Go).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Paywall',
          onPress: () => {
            router.push({
              pathname: '/test-paywall',
              params: { provider: 'superwall2' }
            } as any);
          }
        }
      ]
    );
  };

  const handleTestCustomPaywall = () => {
    router.push({
      pathname: '/test-paywall',
      params: { provider: 'custom' }
    } as any);
  };

  const handleExpireTrialForTesting = async () => {
    try {
      // Set trial end date to yesterday to simulate expiration
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await AsyncStorage.setItem('@trial_start_date', yesterday.toISOString());
      await refreshEntitlements();

      Alert.alert(
        'Trial Expired (Test)',
        'Trial has been set to expired. Restart the app or navigate away to see the paywall gate.',
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to expire trial');
    }
  };

  const handleResetPaymentPlatform = async () => {
    try {
      await AsyncStorage.removeItem('@payment_platform');
      await refreshEntitlements();
      Alert.alert('Success', 'Payment platform cleared. It will be re-detected based on your current platform (iOS = Apple, Android = Google).');
    } catch (e) {
      Alert.alert('Error', 'Failed to reset payment platform');
    }
  };

  const handleShowUpgradeOnboarding = () => {
    router.push('/upgrade-onboarding');
  };

  const handleShowOnboardingV2 = () => {
    router.push('/onboarding-v2');
  };

  const handleManageBillingPortal = async () => {
    if (FLAGS.LOCAL_ONLY) {
      Alert.alert('Unavailable', 'Billing portal is disabled in local-only mode.');
      return;
    }
    try {
      const returnUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/subscription-plans';
      const session = await SubscriptionRepo.createPortalSession({ return_url: returnUrl });
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.href = session.url;
      } else {
        await Linking.openURL(session.url);
      }
    } catch (e: any) {
      console.error('[Settings] Manage billing error:', e?.message || e);
      Alert.alert('Error', 'Unable to open billing portal.');
    }
  };

  const handleImportFromPhoneContacts = () => {
    router.push('/import-contacts');
  };

  const handleImportFromThirdParties = () => {
    router.push('/import-third-party');
  };

  const handleSignOut = () => {
    console.log('[Settings] Sign out button pressed');
    console.log('[Settings] Current user:', !!user, user?.email);

    // Helper to reset welcome and sign out
    const performSignOut = async () => {
      try {
        // Reset welcome seen flag so user sees welcome on next launch
        await AsyncStorage.removeItem('@has_seen_welcome');
        console.log('[Settings] Welcome screen reset');
        
        // Clear onboarding progress so user starts fresh at S1 (Welcome)
        await AsyncStorage.removeItem('onboarding_v2_progress');
        console.log('[Settings] Onboarding progress cleared');

        await signOut();
        console.log('[Settings] Sign out completed successfully');
        screenAnalytics.track('sign_out_completed');

        // Navigate to onboarding-v2 which will show S1 (Welcome) screen
        try { router.replace('/onboarding-v2'); } catch { /**/ }
      } catch (error) {
        console.error('[Settings] Sign out error:', error);
        analytics.errors.occurred(error as Error, 'Settings');
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      try {
        const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out?') : true;
        if (!confirmed) return;
        console.log('[Settings] User confirmed sign out (web)');
        performSignOut();
      } catch (e) {
        console.warn('[Settings] Web confirm failed, proceeding to sign out');
        performSignOut();
      }
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] User confirmed sign out');
            screenAnalytics.track('sign_out_initiated');
            await performSignOut();
          }
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const result = await exportAllData();
      if (result.success) {
        Alert.alert('Export Successful', `Data exported to ${result.fileName}`);
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while exporting data');
    }
  };

  const handleShowStorageStats = async () => {
    try {
      const result = await getStorageStats();
      if (result.success) {
        const statsText = Object.entries(result.stats || {})
          .map(([prefix, count]) => `${prefix}: ${count} items`)
          .join('\n');
        Alert.alert('Storage Statistics', statsText);
      } else {
        Alert.alert('Error', result.error || 'Failed to get storage stats');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get storage statistics');
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset the onboarding flow and show it again on next app launch. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
            Alert.alert('Success', 'Onboarding has been reset. It will show on next launch.');
          },
        },
      ]
    );
  };

  const handleToggleOnboardingAtLaunch = async (next: boolean) => {
    try {
      setOnboardingEnabledState(next);
      await setOnboardingEnabled(next);
      if (next) {
        Alert.alert('Onboarding Enabled', 'Onboarding will show on next launch.');
      } else {
        Alert.alert('Onboarding Disabled', 'Onboarding will be skipped on launch.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to update onboarding preference.');
      // Revert state on error
      setOnboardingEnabledState(!next);
    }
  };

  // DEBUG: Test Emily warmth decay with offset_days (adjustable)
  const handleTestWarmthDecay = async () => {
    try {
      const EMILY_ID = '6d115bd9-de07-4db3-8728-75ec3834b166';

      // Fetch current warmth
      console.log('[Debug] Fetching Emily current warmth...');
      const beforeRes = await apiFetch(`/api/v1/contacts/${EMILY_ID}`, {
        requireAuth: true,
      });

      if (!beforeRes.ok) {
        Alert.alert('Error', `Failed to fetch contact: ${beforeRes.status}`);
        return;
      }

      const before = await beforeRes.json();
      const warmthBefore = before?.contact?.warmth;
      console.log('[Debug] Warmth before:', warmthBefore);

      // Recompute with offset
      console.log(`[Debug] Recomputing with offset_days=${warmthOffsetDays}...`);
      const recomputeRes = await apiFetch(`/api/v1/contacts/${EMILY_ID}/warmth/recompute?offset_days=${warmthOffsetDays}&debug=1`, {
        method: 'POST',
        requireAuth: true,
      });

      if (!recomputeRes.ok) {
        Alert.alert('Error', `Recompute failed: ${recomputeRes.status}`);
        return;
      }

      const recompute = await recomputeRes.json();
      console.log('[Debug] Recompute response:', recompute);
      if (recompute?.metrics) {
        console.log('[Debug] Warmth metrics:', recompute.metrics);
      }
      const warmthAfter = recompute?.contact?.warmth;

      try { await refreshPeople?.(); } catch { }

      Alert.alert(
        'Warmth Decay Test',
        `Emily Watson:\n\nBefore: ${warmthBefore}\nAfter (+${warmthOffsetDays}d): ${warmthAfter}\nChange: ${Number(warmthAfter) - Number(warmthBefore)}\n\nCheck console for full details.`
      );
    } catch (e: any) {
      console.error('[Debug] Warmth decay test failed:', e);
      Alert.alert('Error', e?.message || 'Failed to test warmth decay');
    }
  };

  // DEBUG: Adjust offset days
  const incWarmthOffset = () => setWarmthOffsetDays((d) => Math.min(90, d + 1));
  const decWarmthOffset = () => setWarmthOffsetDays((d) => Math.max(-90, d - 1));

  // ✅ REFACTORED: DEBUG: Bulk recompute warmth for ALL contacts using centralized provider
  const handleBulkWarmthRecompute = async () => {
    try {
      console.log('[Debug] Fetching all contacts for bulk recompute...');

      const response = await apiFetch('/api/v1/contacts?limit=100', {
        requireAuth: true,
        noDedupe: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Debug] Failed to fetch contacts:', response.status, errorText);
        Alert.alert('Error', `Failed to fetch contacts: ${response.status}`);
        return;
      }

      const list = await response.json();
      const items: any[] = Array.isArray(list?.items) ? list.items : [];
      const ids: string[] = items.map((c: any) => c?.id).filter(Boolean);

      if (!ids.length) {
        Alert.alert('No contacts', 'No contacts found to recompute');
        return;
      }

      console.log('[Debug] Bulk recompute for', ids.length, 'contacts using WarmthProvider...');

      // Use centralized provider with force refresh and debug source
      await refreshBulk(ids, { force: true, source: 'debug-bulk-recompute' });

      console.log('[Debug] Refreshing people list...');
      try { await refreshPeople?.(); } catch (e) {
        console.warn('[Debug] Failed to refresh people:', e);
      }

      Alert.alert('Bulk Warmth Recompute', `Recomputed warmth for ${ids.length} contact(s). List refreshed.`);
    } catch (e: any) {
      console.error('[Debug] Bulk warmth recompute failed:', e);
      Alert.alert('Error', e?.message || 'Bulk recompute failed');
    }
  };

  const handleThemeChange = () => {
    const options = [
      { text: 'Light', value: 'light' as ThemeMode },
      { text: 'Dark', value: 'dark' as ThemeMode },
      { text: 'System', value: 'system' as ThemeMode },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...options.map(o => o.text)],
          cancelButtonIndex: 0,
          title: 'Choose Theme',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedTheme = options[buttonIndex - 1].value;
            setTheme(selectedTheme);
            screenAnalytics.track('theme_changed', { theme: selectedTheme });
          }
        }
      );
    } else {
      Alert.alert(
        'Choose Theme',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          ...options.map(option => ({
            text: option.text,
            onPress: () => {
              setTheme(option.value);
              screenAnalytics.track('theme_changed', { theme: option.value });
            },
          })),
        ]
      );
    }
  };

  const getThemeDisplayText = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'System';
    }
  };

  const renderSection = (section: SettingSection, index: number) => (
    <View key={`section-${index}-${section.title}`} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionContent}>
        {section.items.map((item, itemIndex) => (
          <TouchableOpacity
            key={`${section.title}-${item.label}-${itemIndex}`}
            style={[
              styles.settingItem,
              itemIndex < section.items.length - 1 && styles.settingItemBorder,
            ]}
            disabled={item.type === 'toggle'}
            onPress={item.type === 'link' ? (item as SettingItemLink).onPress : undefined}
          >
            <View style={styles.settingLeft}>
              <item.icon size={20} color={theme.colors.text} />
              <View>
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.label === 'Theme' && (
                  <Text style={styles.settingSubtitle}>{getThemeDisplayText()}</Text>
                )}
              </View>
            </View>
            {item.type === 'toggle' ? (
              <Switch
                value={(item as SettingItemToggle).value}
                onValueChange={(item as SettingItemToggle).onToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            ) : (
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Personal Profile',
          type: 'link' as const,
          onPress: () => {
            screenAnalytics.track('profile_viewed', { from: 'settings' });
            router.push('/personal-profile');
          },
        },
      ],
    },
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Payments (Dev)',
      items: [
        { icon: Activity, label: 'RC Show App User ID', type: 'link', onPress: handleRCShowUserId },
        { icon: Activity, label: 'RC Log Out', type: 'link', onPress: handleRCLogOut },
        { icon: Activity, label: 'RC Log In as Current User', type: 'link', onPress: handleRCLogInAsCurrent },
        { icon: Activity, label: 'RC Log In New Test User', type: 'link', onPress: handleRCLogInNewTest },
        { icon: Activity, label: 'RC Fetch Offerings', type: 'link', onPress: handleRCFetchOfferings },
        { icon: Activity, label: 'RC Purchase Monthly', type: 'link', onPress: handleRCPurchaseMonthly },
        { icon: Activity, label: 'RC Restore Purchases', type: 'link', onPress: handleRCRestore },
        { icon: Activity, label: 'Backend Recompute Entitlements', type: 'link', onPress: handleBackendRecomputeEntitlements },
        { icon: Activity, label: 'Show Subscription Plans (Paywall)', type: 'link', onPress: handleTriggerPaywall },
        { icon: Play, label: '▶️ Show Upgrade Onboarding (2nd)', type: 'link', onPress: handleShowUpgradeOnboarding },
        { icon: Play, label: '🎯 Show Onboarding V2 (22 Questions)', type: 'link', onPress: handleShowOnboardingV2 },
        { icon: XCircle, label: '🧪 Expire Trial (Test Paywall Gate)', type: 'link', onPress: handleExpireTrialForTesting },
        { icon: RefreshCcw, label: '🔄 Reset Payment Platform', type: 'link', onPress: handleResetPaymentPlatform },
      ],
    }] : []),
    {
      title: 'Contacts',
      items: [
        {
          icon: Users,
          label: 'Import from Phone Contacts',
          type: 'link' as const,
          onPress: handleImportFromPhoneContacts,
        },
        // Only show third-party imports if enabled (Phase 2)
        ...(ENABLE_THIRD_PARTY_IMPORTS ? [{
          icon: Cloud,
          label: 'Import from Third Parties',
          type: 'link' as const,
          onPress: handleImportFromThirdParties,
        }] : []),
      ],
    },
    {
      title: 'Personal',
      items: [
        {
          icon: FileText,
          label: 'Personal Notes',
          type: 'link' as const,
          onPress: () => router.push('/personal-notes'),
        },
      ],
    },
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Developer',
      items: [
        {
          icon: Code,
          label: 'Developer Settings',
          type: 'link' as const,
          onPress: () => {
            screenAnalytics.track('developer_settings_opened', { from: 'settings' });
            router.push('/settings/developer' as any);
          },
        },
      ],
    }] : []),
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Paywall Testing',
      items: [
        {
          icon: Play,
          label: '🎨 Test Custom Paywall',
          type: 'link' as const,
          onPress: handleTestCustomPaywall,
        },
        {
          icon: Play,
          label: '💳 Test RevenueCat Paywall',
          type: 'link' as const,
          onPress: handleTestRevenueCatPaywall,
        },
        {
          icon: Play,
          label: '🚀 Test Superwall Paywall',
          type: 'link' as const,
          onPress: handleTestSuperwallPaywall,
        },
        {
          icon: Play,
          label: '🎯 Test Superwall Paywall #2',
          type: 'link' as const,
          onPress: handleTestSuperwallPaywall2,
        },
      ],
    }] : []),
    // Removed duplicate 'Subscription' section here; we render the full Subscription block above
    {
      title: 'Messages',
      items: [
        {
          icon: Mail,
          label: 'Message Templates',
          type: 'link' as const,
          onPress: () => router.push('/message-templates'),
        },
      ],
    },
    {
      title: 'Lead Management',
      items: [
        {
          icon: Thermometer,
          label: 'Warmth Settings',
          type: 'link' as const,
          onPress: () => router.push('/warmth-settings'),
        },
      ],
    },
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Developer Features',
      items: [
        {
          icon: Wrench,
          label: 'Enable Dev Features',
          type: 'toggle' as const,
          value: devFeaturesEnabled,
          onToggle: (val: boolean) => {
            if (val) {
              enableDevFeatures();
              Alert.alert('Dev Features Enabled', 'Test warmth mode (~12 hours) is now available when creating/editing contacts.');
            } else {
              disableDevFeatures();
              Alert.alert('Dev Features Disabled', 'Test warmth mode has been hidden.');
            }
            screenAnalytics.track('dev_features_toggled', { enabled: val });
          },
        },
      ],
    }] : []),
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Debug (QA)',
      items: [
        {
          icon: Activity,
          label: `Test Warmth Decay (+${warmthOffsetDays}d)`,
          type: 'link' as const,
          onPress: handleTestWarmthDecay,
        },
        {
          icon: RefreshCcw,
          label: 'Bulk Recompute All Contacts',
          type: 'link' as const,
          onPress: handleBulkWarmthRecompute,
        },
        {
          icon: Minus,
          label: 'Decrease Offset (−1d)',
          type: 'link' as const,
          onPress: decWarmthOffset,
        },
        {
          icon: Plus,
          label: 'Increase Offset (+1d)',
          type: 'link' as const,
          onPress: incWarmthOffset,
        },
      ],
    }] : []),
    ...(FLAGS.LOCAL_ONLY ? [{
      title: 'Data Management',
      items: [
        {
          icon: Cloud,
          label: 'Export Data',
          type: 'link' as const,
          onPress: handleExportData,
        },
        {
          icon: HelpCircle,
          label: 'Storage Statistics',
          type: 'link' as const,
          onPress: handleShowStorageStats,
        },
      ],
    }] : []),
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          type: 'link' as const,
          onPress: () => router.push('/notifications'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: FileCheck,
          label: 'Terms & Conditions',
          type: 'link' as const,
          onPress: () => router.push('/terms-of-service'),
        },
        {
          icon: Lock,
          label: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => router.push('/privacy-policy'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          type: 'link' as const,
          onPress: () => console.log('Help Center pressed'),
        },
        {
          icon: MessageSquare,
          label: 'Feature Request & Feedback',
          type: 'link' as const,
          onPress: () => router.push('/feature-request'),
        },
      ],
    },
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Appearance',
      items: [
        {
          icon: Palette,
          label: 'Theme',
          type: 'link' as const,
          onPress: handleThemeChange,
        },
      ],
    }] : []),
    ...(SHOW_DEV_SETTINGS ? [{
      title: 'Testing & Development',
      items: [
        {
          icon: RefreshCw,
          label: 'Reset Welcome Screen',
          type: 'link' as const,
          onPress: async () => {
            await AsyncStorage.removeItem('@has_seen_welcome');
            Alert.alert('Success', 'Welcome screen reset. Reload the app to see it.');
          },
        },
        // Primary testers differ by mode
        {
          icon: Wrench,
          label: FLAGS.LOCAL_ONLY ? 'Open Local Tester' : 'Open Supabase Tester',
          type: 'link' as const,
          onPress: () => router.push(FLAGS.LOCAL_ONLY ? '/audio-test' : '/supabase-test'),
        },
        // Cloud-only test tools
        ...(!FLAGS.LOCAL_ONLY ? [
          {
            icon: Wrench,
            label: 'Warmth Alerts Tests',
            type: 'link' as const,
            onPress: () => router.push('/warmth-alerts-test'),
          },
          {
            icon: Wrench,
            label: 'Contact Import Tests',
            type: 'link' as const,
            onPress: () => router.push('/contact-import-test'),
          },
          {
            icon: Wrench,
            label: 'API Test Suite',
            type: 'link' as const,
            onPress: () => router.push('/api-test-suite'),
          },
          {
            icon: Activity,
            label: 'Payment Events Monitor',
            type: 'link' as const,
            onPress: () => router.push('/payment-events-test'),
          },
          {
            icon: FileText,
            label: 'Notes API Tests',
            type: 'link' as const,
            onPress: () => router.push('/notes-test'),
          },
          {
            icon: Users,
            label: 'Contact Save Test',
            type: 'link' as const,
            onPress: () => router.push('/contact-save-test'),
          },
          {
            icon: Activity,
            label: 'Contacts Load Test',
            type: 'link' as const,
            onPress: () => router.push('/contacts-load-test'),
          },
          {
            icon: History,
            label: 'Contact History',
            type: 'link' as const,
            onPress: () => {
              if (people.length > 0) {
                router.push(`/contact-history/${people[0].id}`);
              } else {
                Alert.alert('No Contacts', 'Add a contact first to view their history.');
              }
            },
          },
        ] : []),
        // Common test utilities
        {
          icon: Wrench,
          label: 'OpenAI Generation Test',
          type: 'link' as const,
          onPress: () => router.push('/openai-test'),
        },
        {
          icon: Activity,
          label: 'API Health Dashboard',
          type: 'link' as const,
          onPress: () => router.push('/health-status'),
        },
      ],
    }] : []),
  ];

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="EverReach logo"
            testID="everreach-logo-settings"
          />
          <Text style={styles.brandTitle}>EverReach</Text>
          <Text style={styles.brandSubtitle}>Never drop the ball with people again</Text>
        </View>

        {/* Trial Banner (if not paid) */}
        {!isSubscriptionPaid && (
          <View style={[styles.section, { marginTop: 0 }]}>
            <View style={[styles.sectionContent, { padding: 16 }]}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Free Trial</Text>
              <Text style={{ marginTop: 6, fontSize: 14, color: theme.colors.textSecondary }}>
                {trialGateStrategy === 'screen_time' && typeof trialUsageSecondsLimit === 'number'
                  ? `${Math.max(0, Math.ceil(((trialUsageSecondsLimit ?? 0) - (trialUsageSeconds ?? 0)) / 3600))} hours left`
                  : `${Math.max(0, trialDaysRemaining ?? 0)} days left`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Subscription Section */}
        {!FLAGS.LOCAL_ONLY && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/subscription-plans')}
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Shield size={20} color={theme.colors.text} />
                  <View>
                    <Text style={styles.settingLabel}>View Plans</Text>
                    <Text style={styles.settingSubtitle}>
                      {isSubscriptionPaid ? 'Pro (active)' : (trialDaysRemaining > 0 ? `Trial (${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left)` : 'Free')}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {/* Refresh entitlements quick action */}
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemBorder]}
                onPress={handleRefreshEntitlements}
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Info size={20} color={theme.colors.text} />
                  <View>
                    <Text style={styles.settingLabel}>Refresh Entitlements</Text>
                    <Text style={styles.settingSubtitle}>Update subscription and trial status</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(() => {
          const testIndex = settingSections.findIndex(s => s.title === 'Testing & Development');
          const appearanceIndex = settingSections.findIndex(s => s.title === 'Appearance');

          // Get references to specific sections
          const appearanceSection = appearanceIndex >= 0 ? settingSections[appearanceIndex] : null;

          // Filter out sections that are handled specially to avoid duplication
          const standardSections = settingSections.filter((s, i) =>
            i !== testIndex && i !== appearanceIndex
          );

          // Split standard sections into before and after "Testing & Development" logical position
          // We want standard sections (Account, Contacts, Personal, Messages, Lead Management) first
          // Then Appearance
          // Then Testing & Development
          // Then App Mode
          // Then remaining standard sections (Notifications, Legal, Support)

          const splitIndex = standardSections.findIndex(s => s.title === 'Notifications');
          const before = splitIndex >= 0 ? standardSections.slice(0, splitIndex) : standardSections;
          const after = splitIndex >= 0 ? standardSections.slice(splitIndex) : [];

          return (
            <>
              {before.map((s, i) => renderSection(s, i))}

              {/* Appearance */}
              {appearanceSection && renderSection(appearanceSection, before.length)}

              {/* Testing & Development */}
              {testIndex >= 0 && renderSection(settingSections[testIndex], before.length + (appearanceSection ? 1 : 0))}

              {/* App Mode - only visible in dev mode */}
              {SHOW_DEV_SETTINGS && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>App Mode</Text>
                  <View style={styles.sectionContent}>
                    <TouchableOpacity
                      style={[styles.settingItem, styles.settingItemBorder]}
                      onPress={() => router.push('/mode-settings')}
                      accessibilityRole="button"
                    >
                      <View style={styles.settingLeft}>
                        <Shield size={20} color={(FLAGS.LOCAL_ONLY || !cloudModeEnabled) ? theme.colors.success : theme.colors.primary} />
                        <View>
                          <Text style={styles.settingLabel}>Mode Settings</Text>
                          <Text style={styles.settingSubtitle}>
                            {FLAGS.LOCAL_ONLY || !cloudModeEnabled
                              ? 'Local-only mode - data stays on device'
                              : 'Cloud sync mode - data syncs with Supabase'
                            }
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    {!FLAGS.LOCAL_ONLY && (
                      <>
                        <View style={[styles.settingItem, styles.settingItemBorder]}>
                          <View style={styles.settingLeft}>
                            {checkingConn ? (
                              <Activity size={20} color={theme.colors.textSecondary} />
                            ) : connOk ? (
                              <CheckCircle2 size={20} color={theme.colors.success} />
                            ) : (
                              <XCircle size={20} color={theme.colors.error} />
                            )}
                            <View>
                              <Text style={styles.settingLabel} testID="supabaseStatusLabel">
                                {checkingConn ? 'Checking Supabase…' : connOk ? 'Connected to Supabase' : 'Not connected'}
                              </Text>
                              <Text style={styles.settingSubtitle} numberOfLines={1} testID="supabaseStatusSub">
                                Key: {process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'set' : 'unset'}{connErr ? ` · ${connErr}` : ''}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={checkSupabase} accessibilityRole="button" testID="refreshSupabaseBtn">
                            <Text style={[styles.settingSubtitle, { color: theme.colors.primary }]}>Refresh</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.settingItem}>
                          <View style={styles.settingLeft}>
                            {checkingVercel ? (
                              <Activity size={20} color={theme.colors.textSecondary} />
                            ) : vercelStatus ? (
                              <CheckCircle2 size={20} color={theme.colors.success} />
                            ) : (
                              <XCircle size={20} color={theme.colors.error} />
                            )}
                            <View>
                              <Text style={styles.settingLabel} testID="vercelStatusLabel">
                                {checkingVercel ? 'Checking Vercel Backend…' : vercelStatus ? 'Vercel Backend Online' : 'Backend Unavailable'}
                              </Text>
                              <Text style={styles.settingSubtitle} numberOfLines={2} testID="vercelStatusSub">
                                {vercelStatus ? (
                                  `Status: ${vercelStatus.status || 'OK'}${vercelStatus.message ? ` · ${vercelStatus.message}` : ''}${vercelStatus.timestamp ? ` · ${new Date(vercelStatus.timestamp).toLocaleTimeString()}` : ''}`
                                ) : vercelError ? (
                                  `Error: ${vercelError}`
                                ) : (
                                  'No response'
                                )}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={checkVercelHealth} accessibilityRole="button" testID="refreshVercelBtn">
                            <Text style={[styles.settingSubtitle, { color: theme.colors.primary }]}>Refresh</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )}

              {after.map((s, i) => renderSection(s, (before.length + (appearanceSection ? 1 : 0) + 1 + i)))}
            </>
          );
        })()}

        {user && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleSignOut}
            testID="sign-out-button"
            accessibilityState={{ disabled: !user }}
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
          >
            <LogOut size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>EverReach · v1.0.0 {(FLAGS.LOCAL_ONLY || !cloudModeEnabled) ? '(Local-Only)' : '(Cloud)'}</Text>
          <Text style={styles.footerText}>Made with love for meaningful connections</Text>
          {FLAGS.LOCAL_ONLY && (
            <Text style={[styles.footerText, { color: theme.colors.success, marginTop: 8 }]}>
              ✓ All data stays on your device
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  brandHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  brandSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});