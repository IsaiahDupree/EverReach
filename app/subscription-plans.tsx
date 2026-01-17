import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Check, ArrowLeft, RefreshCw, Crown, Zap } from 'lucide-react-native';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { apiFetch } from '@/lib/api';
import { usePlacement, useUser } from 'expo-superwall';

import { FLAGS } from '@/constants/flags';
import { SHOW_DEBUG_INFO, SHOW_REFRESH_BUTTONS } from '@/config/dev';
import { useAnalytics } from '@/hooks/useAnalytics';
import analytics from '@/lib/analytics';
import { PaywallRouter } from '@/components/paywall/PaywallRouter';
import { SubscriptionRepo, Entitlements } from '@/repos/SubscriptionRepo';
import { logRevenueCatEvent } from '@/lib/paymentEventLogger';
import { CancelSubscriptionButton } from '@/components/CancelSubscriptionButton';
import { SubscriptionCancellationBanner } from '@/components/SubscriptionCancellationBanner';
import { trackCheckoutEvent, trackViewPricingEvent, trackPurchaseEvent } from '@/lib/metaServerEvents';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  isPopular?: boolean;
  isAvailable: boolean;
}

interface UsageSummaryResponse {
  usage: { 
    compose_runs_used: number; 
    voice_minutes_used: number; 
    screenshot_count: number;
    messages_sent: number;
  };
  limits: { 
    compose_runs: number; 
    voice_minutes: number;
    screenshots: number;
    messages: number;
  };
}

interface AccountInfoResponse {
  user: { id: string; email: string | null; display_name: string | null };
  org: any;
  billing: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    subscription_status: string | null;
    current_period_end: string | null;
  } | null;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'core',
    name: 'EverReach Core',
    price: '$15/month',
    description: 'Perfect for professionals getting started with relationship management',
    isPopular: true,
    isAvailable: true,
    features: [
      { name: 'Voice notes', included: true },
      { name: 'Screenshot-to-reply', included: true },
      { name: 'Goal-based responses (networking/business/personal)', included: true },
      { name: 'Warmth score', included: true },
      { name: 'Search & tags', included: true },
      { name: 'Import/export', included: true },
      { name: 'Unified message history', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced AI insights', included: false },
      { name: 'Team collaboration', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'EverReach Pro',
    price: '$35/month',
    description: 'Advanced features for power users and small teams',
    isAvailable: false,
    features: [
      { name: 'Everything in Core', included: true },
      { name: 'Advanced AI insights', included: true },
      { name: 'Relationship analytics', included: true },
      { name: 'Custom response templates', included: true },
      { name: 'Priority support', included: true },
      { name: 'API access', included: true },
      { name: 'Team collaboration (up to 5)', included: true },
      { name: 'Advanced reporting', included: true },
      { name: 'Custom integrations', included: false },
      { name: 'White-label options', included: false },
      { name: 'Dedicated account manager', included: false },
      { name: 'Custom SLA', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'EverReach Enterprise',
    price: 'Custom pricing',
    description: 'Full-scale solution for large organizations',
    isAvailable: false,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label options', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'Custom SLA', included: true },
      { name: 'On-premise deployment', included: true },
      { name: 'Advanced security features', included: true },
      { name: 'Custom training', included: true },
      { name: 'Priority feature requests', included: true },
      { name: '24/7 phone support', included: true },
      { name: 'Custom reporting dashboard', included: true },
    ],
  },
];

export default function SubscriptionPlansScreen() {
  const { upgradeToPaid, tier, trialStartDate, subscriptionStartDate, trialDaysRemaining, isPaid, isTrialExpired, paymentPlatform, trialGroup, trialEndsAt, trialGateStrategy, trialUsageSeconds, trialUsageSecondsLimit, refreshEntitlements } = useSubscription();
  const params = useLocalSearchParams<{ success?: string; canceled?: string }>();

  // Analytics tracking
  const screenAnalytics = useAnalytics('SubscriptionPlans', {
    screenProperties: {
      current_tier: tier,
      is_paid: isPaid,
      trial_days_remaining: trialDaysRemaining,
    }
  });

  // Ref to hold loadAccountData function (fixes closure issues in callbacks)
  const loadAccountDataRef = React.useRef<(() => Promise<void>) | null>(null);
  
  // Refs to track previous values for subscription state watcher
  const prevIsPaidRef = React.useRef(isPaid);
  const prevTierRef = React.useRef(tier);
  const prevBillingPeriodRef = React.useRef<string | null>(null);
  
  // Superwall hooks - need both useUser (for status) and usePlacement (for triggering)
  const { setSubscriptionStatus: setSuperwallStatus } = useUser();
  
  // Superwall placement hook for main_pay_wall
  const { registerPlacement, state: paywallState } = usePlacement({
    onPresent: (info) => {
      console.log('[SubscriptionPlans] Paywall presented:', info);
      screenAnalytics.track('paywall_viewed', { placement: 'main_pay_wall' });
    },
    onDismiss: async (info, result) => {
      console.log('[SubscriptionPlans] Paywall dismissed:', result);
      console.log('[SubscriptionPlans] Close reason:', info?.closeReason);
      
      // ALWAYS refresh after paywall closes - poll for updated subscription (webhook latency 1-5 seconds)
      console.log('[SubscriptionPlans] Paywall closed, polling for subscription updates...');
      for (let i = 0; i < 5; i++) {
        try {
          await SubscriptionRepo.restorePurchases();
          await refreshEntitlements();
          const entRes = await apiFetch('/api/v1/me/entitlements', { requireAuth: true });
          if (entRes.ok) {
            const freshData = await entRes.json();
            setEntitlements(freshData);
            if (freshData.subscription_status === 'active') {
              console.log('[SubscriptionPlans] Subscription active after', i + 1, 'polls');
              break;
            }
          }
        } catch (e) {
          console.warn('[SubscriptionPlans] Poll error:', e);
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      await loadAccountDataRef.current?.();
    },
    onError: (error) => {
      console.error('[SubscriptionPlans] Paywall error:', error);
    },
  });
  
  // Handler to show Superwall paywall
  const showPaywall = async (forceShow: boolean = false) => {
    try {
      console.log('[SubscriptionPlans] Triggering main_pay_wall placement...', { forceShow, isPaid });
      
      // CRITICAL: Set subscription status BEFORE calling registerPlacement
      // Superwall requires this to determine if paywall should show
      // If forceShow is true (e.g., switching plans), set to INACTIVE to force paywall display
      const shouldShowPaywall = forceShow || !isPaid;
      console.log('[SubscriptionPlans] Setting Superwall subscription status...', { shouldShowPaywall });
      
      if (shouldShowPaywall) {
        await setSuperwallStatus({ status: 'INACTIVE' });
      } else {
        await setSuperwallStatus({
          status: 'ACTIVE',
          entitlements: [{
            id: 'com_everreach_core_monthly',
            type: 'SERVICE_LEVEL' as const
          }]
        });
      }
      console.log('[SubscriptionPlans] ✅ Subscription status set to:', shouldShowPaywall ? 'INACTIVE' : 'ACTIVE');
      
      // Small delay to ensure status is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now trigger the paywall
      await registerPlacement({ 
        placement: 'main_pay_wall',
        feature() {
          // Called if user already has access (already subscribed) AND not forcing show
          if (!forceShow) {
            console.log('[SubscriptionPlans] User already has access - feature unlocked!');
            // Refresh entitlements to ensure UI is up to date
            refreshEntitlements();
          } else {
            // If forcing show (e.g., switching plans), this shouldn't be called
            // but if it is, still refresh
            console.log('[SubscriptionPlans] Feature callback called during forced show - refreshing');
            refreshEntitlements();
          }
        },
      });
      console.log('[SubscriptionPlans] ✅ registerPlacement called');
    } catch (error) {
      console.error('[SubscriptionPlans] Paywall error:', error);
      Alert.alert('Error', 'Failed to show subscription options. Please try again.');
    }
  };
  
  // Stripe price IDs for web checkout
  const STRIPE_PRICES = {
    monthly: 'price_1SCCoND7MP3Gp2rw3dkn4A8g', // $15.00/month
    annual: 'price_1SCreQD7MP3Gp2rwc9mlUnfH',  // $150.00/year
  };

  // Create Stripe checkout session for web
  const createStripeCheckout = async (priceId: string) => {
    console.log('='.repeat(50));
    console.log('[SubscriptionPlans] 🛒 STRIPE CHECKOUT STARTED');
    console.log('[SubscriptionPlans] Price ID:', priceId);
    console.log('[SubscriptionPlans] Platform:', Platform.OS);
    console.log('[SubscriptionPlans] isPaid:', isPaid);
    console.log('[SubscriptionPlans] subscriptionSource:', subscriptionSource);
    console.log('[SubscriptionPlans] entitlements:', JSON.stringify(entitlements, null, 2));
    console.log('='.repeat(50));
    
    // Track checkout initiation with Meta
    const isAnnual = priceId === STRIPE_PRICES.annual;
    const planName = isAnnual ? 'EverReach Core Annual' : 'EverReach Core Monthly';
    const price = isAnnual ? 152.99 : 14.99;
    trackCheckoutEvent(
      accountInfo?.user?.email || '',
      accountInfo?.user?.id || '',
      planName,
      price,
      isAnnual ? 'annual' : 'monthly'
    );
    
    const successUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/subscription-plans?success=true` 
      : '';
    const cancelUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/subscription-plans?canceled=true` 
      : '';

    console.log('[SubscriptionPlans] Success URL:', successUrl);
    console.log('[SubscriptionPlans] Cancel URL:', cancelUrl);
    console.log('[SubscriptionPlans] Calling /api/v1/billing/checkout...');

    const response = await apiFetch('/api/v1/billing/checkout', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });
    
    console.log('[SubscriptionPlans] Response status:', response.status, response.ok ? '✅' : '❌');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[SubscriptionPlans] ❌ Checkout failed:', response.status, errorData);
      console.error('[SubscriptionPlans] Error details:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.error || 'Failed to create checkout session');
    }
    
    const data = await response.json();
    console.log('[SubscriptionPlans] ✅ Checkout session created!');
    console.log('[SubscriptionPlans] Redirecting to Stripe:', data.url);
    
    if (data.url && typeof window !== 'undefined') {
      window.location.href = data.url;
    } else {
      console.error('[SubscriptionPlans] ❌ No URL in response or not in browser');
    }
  };

  // Wrapper for TouchableOpacity onPress - defaults to monthly plan
  const handleShowPaywall = async () => {
    console.log('='.repeat(50));
    console.log('[SubscriptionPlans] 📱 handleShowPaywall called');
    console.log('[SubscriptionPlans] Platform:', Platform.OS);
    console.log('[SubscriptionPlans] FLAGS.LOCAL_ONLY:', FLAGS.LOCAL_ONLY);
    console.log('[SubscriptionPlans] isPaid:', isPaid);
    console.log('[SubscriptionPlans] Will use:', Platform.OS === 'web' && !FLAGS.LOCAL_ONLY ? 'Stripe' : 'Superwall');
    console.log('='.repeat(50));
    
    // WEB: Use Stripe checkout instead of Superwall
    if (Platform.OS === 'web' && !FLAGS.LOCAL_ONLY) {
      console.log('[SubscriptionPlans] 🌐 Web platform detected, starting Stripe checkout for MONTHLY plan');
      try {
        await createStripeCheckout(STRIPE_PRICES.monthly);
      } catch (error: any) {
        console.error('[SubscriptionPlans] ❌ Checkout error:', error);
        if (typeof window !== 'undefined') {
          window.alert(error.message || 'Failed to start checkout. Please try again.');
        }
      }
      return;
    }
    
    // NATIVE: Use Superwall paywall
    console.log('[SubscriptionPlans] 📲 Native platform, showing Superwall paywall');
    showPaywall(false);
  };

  // Handler for annual plan checkout (web) or switch (native)
  const handleAnnualPlanClick = async () => {
    console.log('='.repeat(50));
    console.log('[SubscriptionPlans] 📅 handleAnnualPlanClick called');
    console.log('[SubscriptionPlans] Platform:', Platform.OS);
    console.log('[SubscriptionPlans] FLAGS.LOCAL_ONLY:', FLAGS.LOCAL_ONLY);
    console.log('[SubscriptionPlans] isPaid:', isPaid);
    console.log('[SubscriptionPlans] Will use:', Platform.OS === 'web' && !FLAGS.LOCAL_ONLY ? 'Stripe' : 'Superwall');
    console.log('='.repeat(50));
    
    // WEB: Use Stripe checkout for annual plan
    if (Platform.OS === 'web' && !FLAGS.LOCAL_ONLY) {
      console.log('[SubscriptionPlans] 🌐 Web platform detected, starting Stripe checkout for ANNUAL plan');
      try {
        await createStripeCheckout(STRIPE_PRICES.annual);
      } catch (error: any) {
        console.error('[SubscriptionPlans] ❌ Checkout error:', error);
        if (typeof window !== 'undefined') {
          window.alert(error.message || 'Failed to start checkout. Please try again.');
        }
      }
      return;
    }
    
    // NATIVE: Use Superwall paywall
    console.log('[SubscriptionPlans] 📲 Native platform, showing Superwall paywall');
    showPaywall(true);
  };
  
  // Handler specifically for switching to annual plan (always shows paywall)
  const handleSwitchToAnnual = async () => {
    console.log('[SubscriptionPlans] handleSwitchToAnnual called - Platform:', Platform.OS);
    
    // WEB: For existing Stripe subscribers, redirect to billing portal to switch plans
    if (Platform.OS === 'web' && !FLAGS.LOCAL_ONLY) {
      try {
        // If already paid via Stripe, use billing portal to manage/switch plans
        const subscriptionSource = (entitlements as any)?.source;
        if (isPaid && subscriptionSource === 'stripe') {
          console.log('[SubscriptionPlans] Redirecting to Stripe portal for plan switch...');
          const session = await SubscriptionRepo.createPortalSession({ 
            return_url: (typeof window !== 'undefined' ? window.location.origin : '') + '/subscription-plans' 
          });
          if (typeof window !== 'undefined') {
            window.location.href = session.url;
          }
          return;
        }
        // Otherwise create new checkout for annual plan
        await createStripeCheckout(STRIPE_PRICES.annual);
      } catch (error: any) {
        console.error('[SubscriptionPlans] Switch to annual error:', error);
        if (typeof window !== 'undefined') {
          window.alert(error.message || 'Failed to switch plans. Please try again.');
        }
      }
      return;
    }
    
    // NATIVE: Use Superwall paywall
    showPaywall(true);
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const resolveRcPackageIdentifier = React.useCallback((planId: string): string | null => {
    try {
      if (!rcOfferings) return null;
      const allPkgs: any[] = [];
      const current = rcOfferings?.current;
      if (current?.availablePackages) allPkgs.push(...current.availablePackages);
      if (rcOfferings?.all) {
        Object.values(rcOfferings.all as any).forEach((off: any) => {
          if (off?.availablePackages) allPkgs.push(...off.availablePackages);
        });
      }
      const monthly = allPkgs.find(p => p?.packageType === 'MONTHLY' || p?.identifier === '$rc_monthly');
      if (planId === 'core' && monthly) return monthly.identifier || '$rc_monthly';
      const first = allPkgs[0];
      if (first?.identifier) return first.identifier;
    } catch (e) {
      console.warn('[SubscriptionPlans] resolveRcPackageIdentifier error:', (e as any)?.message || e);
    }
    return null;
  }, [rcOfferings]);

  useEffect(() => {
    if (!isPaid) {
      const durationDays = trialStartDate && trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - new Date(trialStartDate).getTime()) / (1000 * 60 * 60 * 24)))
        : undefined;
      
      // Track both legacy and standard event names
      screenAnalytics.track('Paywall Viewed', analytics.withTrialProps({
        trigger: 'screen_open',
        plan_shown: 'core',
        trial_group: trialGroup,
        trial_duration_days: durationDays,
        trial_days_remaining: trialDaysRemaining,
        trial_started_at: trialStartDate,
        trial_ends_at: trialEndsAt,
        subscription_status: accountInfo?.billing?.subscription_status || (isPaid ? 'active' : 'trial'),
      }, {
        trial_gate_strategy: trialGateStrategy,
        trial_usage_seconds: trialUsageSeconds,
        trial_usage_seconds_limit: trialUsageSecondsLimit,
        trial_days_remaining: trialDaysRemaining,
        is_paid: isPaid,
      }));
      
      // Track standard event name
      screenAnalytics.track('paywall_shown', {
        plan_shown: 'core',
        trial_days_remaining: trialDaysRemaining,
        source: 'subscription_plans_screen',
      });
    }
  }, [isPaid]);

  // Track pricing page view on mount (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      trackViewPricingEvent(accountInfo?.user?.email || undefined, accountInfo?.user?.id || undefined);
    }
  }, [accountInfo?.user?.email]);

  // On web, if we arrive with ?success=true after Stripe checkout, poll for subscription update
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (params?.success === 'true') {
      (async () => {
        console.log('[SubscriptionPlans] Stripe checkout success, polling for subscription...');
        
        // Track purchase event with Meta (we don't know exact plan here, use default)
        trackPurchaseEvent(
          accountInfo?.user?.email || '',
          accountInfo?.user?.id || '',
          'EverReach Core',
          14.99, // Default to monthly price
          'monthly'
        );
        
        try {
          // Poll for updated subscription (webhook latency 1-5 seconds)
          for (let i = 0; i < 5; i++) {
            try {
              await SubscriptionRepo.restorePurchases();
              await refreshEntitlements();
              const entRes = await apiFetch('/api/v1/me/entitlements', { requireAuth: true });
              if (entRes.ok) {
                const freshData = await entRes.json();
                setEntitlements(freshData);
                if (freshData.subscription_status === 'active') {
                  console.log('[SubscriptionPlans] Subscription active after', i + 1, 'polls');
                  break;
                }
              }
            } catch (e) {
              console.warn('[SubscriptionPlans] Poll error:', e);
            }
            await new Promise(r => setTimeout(r, 1500));
          }
          await loadAccountData();
        } finally {
          if (typeof window !== 'undefined') {
            router.replace('/subscription-plans' as any);
          }
        }
      })();
    }
  }, [params?.success]);

  const loadAccountData = async () => {
    if (FLAGS.LOCAL_ONLY) return;

    setLoadError(null);
    const errors: string[] = [];

    try {
      try {
        const entRes = await apiFetch('/api/v1/me/entitlements', { requireAuth: true });
        if (entRes.ok) {
          const data = await entRes.json();
          console.log('[SubscriptionPlans] Entitlements loaded:', data);
          setEntitlements(data);
        } else {
          console.warn('[Subscription] Failed to load entitlements:', entRes.status);
        }
      } catch (e: any) {
        console.warn('[Subscription] Entitlements error:', e);
      }

      try {
        const usageRes = await apiFetch('/api/me/usage-summary?window=30d', { requireAuth: true });
        if (usageRes.ok) {
          const data: UsageSummaryResponse = await usageRes.json();
          setUsageSummary(data);
        } else {
          console.warn('[Subscription] Failed to load usage:', usageRes.status);
        }
      } catch (e: any) {
        console.warn('[Subscription] Usage error:', e);
      }

      try {
        const meRes = await apiFetch('/api/v1/me', { requireAuth: true });
        if (meRes.ok) {
          const data: AccountInfoResponse = await meRes.json();
          setAccountInfo(data);
        } else if (meRes.status === 401) {
          errors.push('Authentication required');
          console.error('[Subscription] Unauthorized:', meRes.status);
        } else {
          console.warn('[Subscription] Failed to load account:', meRes.status);
        }
      } catch (e: any) {
        console.warn('[Subscription] Account info error:', e);
      }

      if (errors.length > 0) {
        setLoadError(errors.join(', '));
      }
    } catch (e: any) {
      console.error('[Subscription] Unexpected error:', e);
      setLoadError('Unexpected error loading data');
    }
  };

  const handleManageBilling = async () => {
    if (FLAGS.LOCAL_ONLY) return;
    
    console.log('='.repeat(50));
    console.log('[SubscriptionPlans] 💳 handleManageBilling called');
    console.log('[SubscriptionPlans] Platform:', Platform.OS);
    console.log('[SubscriptionPlans] paymentPlatform:', paymentPlatform);
    console.log('[SubscriptionPlans] subscriptionSource:', subscriptionSource);
    console.log('[SubscriptionPlans] isPaid:', isPaid);
    console.log('[SubscriptionPlans] accountInfo?.billing:', JSON.stringify(accountInfo?.billing, null, 2));
    console.log('='.repeat(50));
    
    // Route based on subscription source (entitlements.source) first, then fallback to platform
    if (subscriptionSource === 'app_store' || paymentPlatform === 'apple' || Platform.OS === 'ios') {
      // Handle web platform - show window.alert since Alert.alert doesn't work on web
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert('Manage App Store Subscription\n\nYour subscription was purchased through the Apple App Store.\n\nTo switch plans or cancel, please go to:\n\nSettings → Apple ID → Subscriptions → EverReach');
        }
        return;
      }
      
      // Directly open App Store subscription management (iOS native)
      try {
        if (Platform.OS === 'ios') {
          // Use the App Store subscriptions URL - opens directly to subscription management
          const url = 'https://apps.apple.com/account/subscriptions';
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            console.log('[SubscriptionPlans] Opened App Store subscriptions');
          } else {
            // Fallback: Try opening Settings app to subscriptions
            const settingsUrl = 'app-settings:';
            try {
              await Linking.openURL(settingsUrl);
            } catch {
              Alert.alert(
                'Manage Subscription',
                'Please open the App Store app, tap your profile, then tap "Subscriptions" to manage your EverReach subscription.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to open App Store:', error);
        Alert.alert(
          'Manage Subscription',
          'Please open the App Store app, tap your profile, then tap "Subscriptions" to manage your EverReach subscription.',
          [{ text: 'OK' }]
        );
      }
      return;
    }
    if (subscriptionSource === 'play' || paymentPlatform === 'google') {
      if (Platform.OS === 'android') {
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      } else {
        // On web or iOS, show instructions
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Manage Google Play Subscription\n\nTo manage your subscription, open the Google Play app on your Android device:\n\nPlay Store → Menu → Subscriptions → EverReach');
        } else {
          Alert.alert(
            'Manage Google Subscription',
            'To manage your subscription, go to:\n\nPlay Store → Menu → Subscriptions → EverReach',
            [{ text: 'OK' }]
          );
        }
      }
      return;
    }
    
    // For manual/enterprise subscriptions, show contact support message
    if (subscriptionSource === 'manual') {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Enterprise Subscription\n\nPlease contact support@everreach.app to manage your subscription.');
      } else {
        Alert.alert('Enterprise Subscription', 'Please contact support@everreach.app to manage your subscription.', [{ text: 'OK' }]);
      }
      return;
    }
    
    // Stripe - Open Customer Portal
    try {
      console.log('[SubscriptionPlans] Creating Stripe portal session...');
      const session = await SubscriptionRepo.createPortalSession({ 
        return_url: (typeof window !== 'undefined' ? window.location.origin : '') + '/subscription-plans' 
      });
      
      console.log('[SubscriptionPlans] Portal session created:', session);
      
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          console.log('[SubscriptionPlans] Redirecting to:', session.url);
          window.location.href = session.url;
        }
      } else {
        await Linking.openURL(session.url);
      }
    } catch (e: any) {
      console.error('[SubscriptionPlans] Manage billing error:', e);
      
      // Web-compatible error handling
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(`Error\n\nUnable to open billing portal: ${e?.message || 'Unknown error'}`);
        }
      } else {
        Alert.alert('Error', `Unable to open billing portal: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  // Set ref after function defined (fixes closure issues)
  loadAccountDataRef.current = loadAccountData;

  useEffect(() => {
    void loadAccountData();
  }, []);

  // Subscription state watcher - auto-refresh when isPaid, tier, or billing_period changes
  useEffect(() => {
    const currentBillingPeriod = (entitlements as any)?.billing_period || null;
    const billingPeriodChanged = prevBillingPeriodRef.current !== currentBillingPeriod;
    const isPaidChanged = prevIsPaidRef.current !== isPaid;
    const tierChanged = prevTierRef.current !== tier;
    
    if (isPaidChanged || tierChanged || billingPeriodChanged) {
      console.log('[SubscriptionPlans] Subscription state changed:', {
        isPaid: { from: prevIsPaidRef.current, to: isPaid },
        tier: { from: prevTierRef.current, to: tier },
        billingPeriod: { from: prevBillingPeriodRef.current, to: currentBillingPeriod },
      });
      loadAccountData();
    }
    
    // Update refs
    prevIsPaidRef.current = isPaid;
    prevTierRef.current = tier;
    prevBillingPeriodRef.current = currentBillingPeriod;
  }, [isPaid, tier, entitlements]);

  useFocusEffect(
    useCallback(() => {
      console.log('[SubscriptionPlans] 🔄 Screen focused - refreshing data');
      void loadAccountData();
      
      // CRITICAL FIX: Also refresh entitlements from SubscriptionProvider
      // This ensures subscription status is current after purchase/app return
      void refreshEntitlements();
      
      if (Platform.OS !== 'web') {
        import('@/lib/revenuecat').then(({ fetchOfferings }) => fetchOfferings().catch(console.error));
      }
    }, [refreshEntitlements])
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('@/lib/revenuecat').then(({ fetchOfferings }) => {
        return fetchOfferings();
      }).then((offerings: any) => {
        if (offerings) {
          console.log('[SubscriptionPlans] RevenueCat offerings loaded:', offerings);
          setRcOfferings(offerings);
        }
      }).catch((err: any) => {
        console.warn('[SubscriptionPlans] Failed to load RevenueCat offerings:', err);
      });
    }
  }, []);

  const subscriptionBadge = useMemo(() => {
    const status = accountInfo?.billing?.subscription_status ?? (isPaid ? 'active' : 'trial');
    return status as string;
  }, [accountInfo?.billing?.subscription_status, isPaid]);

  // Determine subscription source for billing management routing
  const subscriptionSource = useMemo(() => {
    const src = (entitlements as any)?.source as 'app_store' | 'play' | 'stripe' | 'revenuecat' | 'manual' | undefined;
    
    // Map revenuecat to specific source based on product_id or platform context
    if (src === 'revenuecat') {
      const productId = (entitlements as any)?.product_id || '';
      if (productId.includes('ios') || productId.startsWith('com.')) return 'app_store';
      if (productId.includes('android')) return 'play';
      // Fallback to paymentPlatform if available
      if (paymentPlatform === 'apple') return 'app_store';
      if (paymentPlatform === 'google') return 'play';
    }
    
    // Fallback: If entitlements.source is not set but we have Stripe billing info, assume Stripe
    // This handles the case where entitlements haven't loaded yet but accountInfo has
    if (!src && accountInfo?.billing?.stripe_subscription_id) {
      return 'stripe';
    }
    
    return src || null;
  }, [entitlements, paymentPlatform, accountInfo?.billing?.stripe_subscription_id]);

  const paymentMethodResolved = useMemo(() => {
    if (subscriptionSource === 'app_store') return 'Apple App Store';
    if (subscriptionSource === 'play') return 'Google Play';
    if (subscriptionSource === 'stripe') return 'Card on file';
    if (subscriptionSource === 'manual') return 'Enterprise';
    if (paymentPlatform === 'apple') return 'Apple App Store';
    if (paymentPlatform === 'google') return 'Google Play';
    if (paymentPlatform === 'stripe') return 'Card on file';
    return 'Unknown';
  }, [subscriptionSource, paymentPlatform]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await loadAccountData();
    setIsRetrying(false);
  };

  const handleSelectPlan = async (planId: string) => {
    console.log('[SubscriptionPlans] handleSelectPlan called', { planId, isPaid, tier, platform: Platform.OS, LOCAL_ONLY: FLAGS.LOCAL_ONLY, subscriptionSource });
    
    // CRITICAL: If user is already paid via App Store/Google Play, show instructions to manage there
    // They cannot switch plans directly in the app - must go to original platform
    if (isPaid && subscriptionSource && subscriptionSource !== 'stripe') {
      console.log('[SubscriptionPlans] Paid user with non-Stripe subscription trying to switch plans');
      
      // Track the attempt
      screenAnalytics.track('plan_switch_blocked', {
        plan_id: planId,
        subscription_source: subscriptionSource,
        current_tier: tier,
        platform: Platform.OS,
      });
      
      // Show platform-specific instructions
      if (subscriptionSource === 'app_store') {
        Alert.alert(
          'Manage Your Subscription',
          'Your subscription was purchased through the Apple App Store.\n\nTo switch plans or cancel, please go to:\n\nSettings → Apple ID → Subscriptions → EverReach',
          [
            { text: 'OK', style: 'cancel' },
            ...(Platform.OS === 'ios' ? [{
              text: 'Open Settings',
              onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions'),
            }] : []),
          ]
        );
        return;
      }
      
      if (subscriptionSource === 'play') {
        Alert.alert(
          'Manage Your Subscription',
          'Your subscription was purchased through Google Play.\n\nTo switch plans or cancel, please go to:\n\nPlay Store → Menu → Subscriptions → EverReach',
          [
            { text: 'OK', style: 'cancel' },
            ...(Platform.OS === 'android' ? [{
              text: 'Open Play Store',
              onPress: () => Linking.openURL('https://play.google.com/store/account/subscriptions'),
            }] : []),
          ]
        );
        return;
      }
      
      if (subscriptionSource === 'manual') {
        Alert.alert(
          'Enterprise Subscription',
          'Your subscription is managed by your organization.\n\nPlease contact support@everreach.app to make changes to your plan.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Track selection
    screenAnalytics.track('plan_selected', analytics.withTrialProps({
      plan_id: planId,
      payment_platform: paymentPlatform || (Platform.OS === 'web' ? 'stripe' : Platform.OS),
      trigger: 'paywall_button',
      trial_group: trialGroup,
      trial_days_remaining: trialDaysRemaining,
      trial_started_at: trialStartDate,
      trial_ends_at: trialEndsAt,
    }, {
      trial_gate_strategy: trialGateStrategy,
      trial_usage_seconds: trialUsageSeconds,
      trial_usage_seconds_limit: trialUsageSecondsLimit,
      trial_days_remaining: trialDaysRemaining,
      is_paid: isPaid,
    }));

    console.log('[SubscriptionPlans] handleSelectPlan:', { planId });
    screenAnalytics.track('subscription_plan_selected', analytics.withTrialProps({
      plan_id: planId,
      current_tier: tier,
      is_upgrade: !isPaid,
      trial_group: trialGroup,
      trial_days_remaining: trialDaysRemaining,
      trial_started_at: trialStartDate,
      trial_ends_at: trialEndsAt,
    }, {
      trial_gate_strategy: trialGateStrategy,
      trial_usage_seconds: trialUsageSeconds,
      trial_usage_seconds_limit: trialUsageSecondsLimit,
      trial_days_remaining: trialDaysRemaining,
      is_paid: isPaid,
    }));

    console.log('[SubscriptionPlans] Setting loading state...');
    setLoading(true);
    
    // Track purchase initiated
    screenAnalytics.track('purchase_initiated', {
      plan_id: planId,
      platform: Platform.OS,
      trial_days_remaining: trialDaysRemaining,
    });
    
    try {
      console.log('[SubscriptionPlans] Platform check:', { platform: Platform.OS, LOCAL_ONLY: FLAGS.LOCAL_ONLY });
      if (Platform.OS !== 'web' && !FLAGS.LOCAL_ONLY) {
        logRevenueCatEvent('purchase_attempt', { plan_id: planId, package_id: resolveRcPackageIdentifier(planId) });
        const { purchasePackageById } = await import('@/lib/revenuecat');
        const rcPkg = resolveRcPackageIdentifier(planId) || '$rc_monthly';
        const result = await purchasePackageById(rcPkg);
        if (result) {
          logRevenueCatEvent('purchase_success', { plan_id: planId, customer_info: result.customerInfo });
          await loadAccountData();
          
          // StoreKit Testing: Auto-sync backend after test purchase
          // In dev/test mode, StoreKit purchases don't trigger webhooks
          // So we manually force backend to query RevenueCat API
          if (__DEV__ && Platform.OS === 'ios') {
            console.log('[SubscriptionPlans] 🧪 StoreKit test detected - auto-syncing backend...');
            try {
              // Wait for RevenueCat to process the purchase
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Force backend to query RevenueCat directly
              const { SubscriptionRepo } = await import('@/repos/SubscriptionRepo');
              const restoreResult = await SubscriptionRepo.restorePurchases();
              
              if (restoreResult.success) {
                console.log('[SubscriptionPlans] ✅ Backend synced successfully with StoreKit purchase');
                // Refresh local state with updated backend data
                await loadAccountData();
              } else {
                console.warn('[SubscriptionPlans] ⚠️ Backend sync failed, user may need to manually refresh');
              }
            } catch (syncError) {
              console.error('[SubscriptionPlans] ❌ Auto-sync failed:', syncError);
              // Don't block the success flow - user can manually sync later
            }
          }
          
          // Track purchase succeeded
          screenAnalytics.track('purchase_succeeded', {
            plan_id: planId,
            payment_platform: Platform.OS === 'ios' ? 'apple' : 'google',
            trial_days_remaining: trialDaysRemaining,
          });
          
          screenAnalytics.track('subscription_upgraded', analytics.withTrialProps({
            plan_id: planId,
            payment_platform: Platform.OS === 'ios' ? 'apple' : 'google',
            trial_group: trialGroup,
            trial_days_remaining: trialDaysRemaining,
            trial_started_at: trialStartDate,
            trial_ends_at: trialEndsAt,
          }, {
            trial_gate_strategy: trialGateStrategy,
            trial_usage_seconds: trialUsageSeconds,
            trial_usage_seconds_limit: trialUsageSecondsLimit,
            trial_days_remaining: trialDaysRemaining,
            is_paid: isPaid,
          }));
          Alert.alert('Subscription Activated!', 'Welcome to EverReach Core! You now have access to all premium features.', [{ text: 'Get Started', onPress: () => router.back() }]);
          return;
        }
        logRevenueCatEvent('purchase_cancelled', { plan_id: planId });
        
        // Track purchase failed (user cancelled)
        screenAnalytics.track('purchase_failed', {
          plan_id: planId,
          error: 'User cancelled',
          platform: Platform.OS,
        });
        
        throw new Error('Purchase was cancelled or failed');
      }

      if (!FLAGS.LOCAL_ONLY && Platform.OS === 'web') {
        console.log('[SubscriptionPlans] Web platform + not LOCAL_ONLY: Creating Stripe checkout session');
        const response = await apiFetch('/api/billing/checkout', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            successUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/billing/success',
            cancelUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/billing/cancel',
          }),
        });
        console.log('[SubscriptionPlans] Checkout API response:', { ok: response.ok, status: response.status });
        if (response.ok) {
          const { url } = (await response.json()) as { url: string };
          console.log('[SubscriptionPlans] Redirecting to Stripe checkout:', url);
          if (typeof window !== 'undefined') window.location.href = url;
          return;
        }
        console.error('[SubscriptionPlans] Checkout API failed:', response.status, response.statusText);
      }

      console.log('[SubscriptionPlans] Fallback: Calling upgradeToPaid with "stripe"');
      await upgradeToPaid('stripe');
      screenAnalytics.track('subscription_upgraded', analytics.withTrialProps({
        plan_id: planId,
        payment_platform: 'stripe',
        trial_group: trialGroup,
        trial_days_remaining: trialDaysRemaining,
        trial_started_at: trialStartDate,
        trial_ends_at: trialEndsAt,
      }, {
        trial_gate_strategy: trialGateStrategy,
        trial_usage_seconds: trialUsageSeconds,
        trial_usage_seconds_limit: trialUsageSecondsLimit,
        trial_days_remaining: trialDaysRemaining,
        is_paid: isPaid,
      }));
      Alert.alert('Subscription Activated!', 'Welcome to EverReach Core! You now have access to all premium features.', [{ text: 'Get Started', onPress: () => router.back() }]);
    } catch (error: any) {
      console.error('[SubscriptionPlans] Purchase error:', error);
      if (!error?.message?.includes?.('cancelled')) {
        Alert.alert('Error', 'Failed to activate subscription. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS === 'web') return;
    setIsRestoring(true);
    
    // Track restore initiated
    screenAnalytics.track('restore_purchases_initiated', {
      platform: Platform.OS,
      current_tier: tier,
    });
    
    try {
      logRevenueCatEvent('restore_attempt', {});
      const { restorePurchases } = await import('@/lib/revenuecat');
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        logRevenueCatEvent('restore_success', { customer_info: customerInfo });
        await loadAccountData();
        
        // Track restore success
        screenAnalytics.track('restore_purchases_success', {
          platform: Platform.OS,
          entitlements: customerInfo?.entitlements || {},
        });
        
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        // Track restore failed (no purchases found)
        screenAnalytics.track('restore_purchases_failed', {
          platform: Platform.OS,
          error: 'No purchases found',
        });
        
        Alert.alert('No Purchases Found', 'We could not find previous purchases to restore.');
      }
    } catch (error: any) {
      console.error('[SubscriptionPlans] Restore error:', error);
      logRevenueCatEvent('restore_error', { error: error?.message || String(error) });
      
      // Track restore failed (error)
      screenAnalytics.track('restore_purchases_failed', {
        platform: Platform.OS,
        error: error?.message || 'Unknown error',
      });
      
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Subscription Plans',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                // Track paywall dismissed
                if (!isPaid) {
                  screenAnalytics.track('paywall_dismissed', {
                    action: 'back_button',
                    trial_days_remaining: trialDaysRemaining,
                  });
                }
                
                // Simple navigation: always go to settings
                // Prevents navigation loops and is predictable
                router.push('/(tabs)/settings');
              }} 
              style={styles.backButton}
              testID="back-button"
            >
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Inline back bar removed; using headerLeft back only */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cancellation Warning Banner */}
        <SubscriptionCancellationBanner entitlements={entitlements ?? undefined} />
        
        {/* Current Subscription Status - shown first if user has one */}
        {/* ... (rest of the code remains the same) */}
        {(isPaid || trialDaysRemaining > 0 || entitlements || accountInfo) && (
          <View style={styles.statusCard} testID="current-subscription-card">
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Current Subscription</Text>
              {(subscriptionBadge === 'active' || isPaid || entitlements?.subscription_status === 'active') ? (
                <View style={styles.activeBadge}>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.activeBadgeText}>Subscribed (Paid)</Text>
                </View>
              ) : (
                <View style={[styles.trialBadge, !isPaid && trialDaysRemaining <= 3 && trialDaysRemaining > 0 && styles.trialBadgeWarning]}>
                  <Text style={styles.trialBadgeText}>
                    {subscriptionBadge === 'trial' ? (trialDaysRemaining > 0 ? 'Free Trial' : 'Trial Expired') : 'Inactive'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statusDetails}>
              {/* Subscription Status - Make this prominent */}
              <View style={[styles.statusRow, styles.statusRowProminent]}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, styles.statusValueBold]}>
                  {/* Check entitlements first for most accurate status */}
                  {entitlements?.subscription_status === 'active' || (entitlements as any)?.tier === 'pro' || (entitlements as any)?.tier === 'core'
                    ? '✅ Subscribed (Paid)'
                    : tier === 'free_trial' || entitlements?.tier === 'free'
                      ? (trialDaysRemaining > 0 
                          ? `🎁 Free Trial (${trialDaysRemaining} days left)` 
                          : '❌ Trial Expired')
                      : tier === 'paid'
                        ? '✅ Subscribed (Paid)' 
                        : tier === 'expired'
                          ? '❌ Trial Expired'
                          : (trialDaysRemaining > 0 
                              ? `🎁 Free Trial Active` 
                              : '❌ Trial Expired')}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Plan:</Text>
                <Text style={styles.statusValue}>
                  {(() => {
                    // Determine billing period from entitlements or Stripe price ID
                    const stripePriceId = accountInfo?.billing?.stripe_price_id;
                    // Use entitlements.source, fallback to 'stripe' if we have Stripe billing info
                    const localSubscriptionSource = (entitlements as any)?.source || 
                      (accountInfo?.billing?.stripe_subscription_id ? 'stripe' : null);
                    let billingPeriod = entitlements?.billing_period || 
                      (stripePriceId === STRIPE_PRICES.monthly ? 'monthly' : 
                       stripePriceId === STRIPE_PRICES.annual ? 'annual' : null);
                    
                    // Check if user is paid from entitlements or isPaid flag
                    const isUserPaid = isPaid || 
                      entitlements?.subscription_status === 'active' || 
                      (entitlements as any)?.tier === 'pro' ||
                      (entitlements as any)?.tier === 'core';
                    
                    // Fallback: if paid via Stripe but billing period unknown, default to monthly
                    if (isUserPaid && localSubscriptionSource === 'stripe' && !billingPeriod) {
                      billingPeriod = 'monthly';
                    }
                    
                    const billingLabel = billingPeriod === 'annual' ? ' (Annual)' : 
                                         billingPeriod === 'monthly' ? ' (Monthly)' : '';
                    
                    if (!entitlements) {
                      return isUserPaid ? `EverReach Core${billingLabel}` : 'Free Trial';
                    }
                    
                    switch (entitlements.tier) {
                      case 'free': return 'Free Plan';
                      case 'pro': return `EverReach Pro${billingLabel}`;
                      case 'core': return `EverReach Core${billingLabel}`;
                      case 'enterprise': return 'EverReach Enterprise';
                      default: return `EverReach Core${billingLabel}`;
                    }
                  })()}
                </Text>
              </View>

              {/* Trial Information - Enhanced */}
              {!isPaid && trialDaysRemaining >= 0 && (
                <>
                  <View style={[styles.statusRow, styles.trialInfoRow]}>
                    <Text style={styles.statusLabel}>Trial Days Remaining:</Text>
                    <Text style={[
                      styles.statusValue, 
                      styles.trialDaysText,
                      { fontSize: 18, fontWeight: '700' },
                      trialDaysRemaining <= 3 && { color: '#EF4444' },
                      trialDaysRemaining > 3 && trialDaysRemaining <= 5 && { color: '#F59E0B' }
                    ]}>
                      {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}
                    </Text>
                  </View>

                  {trialEndsAt && (
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>Trial Expires:</Text>
                      <Text style={[styles.statusValue, trialDaysRemaining <= 3 && { color: '#EF4444', fontWeight: '600' }]}>
                        {new Date(trialEndsAt).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Trial warning for expiring soon */}
                  {trialDaysRemaining <= 3 && trialDaysRemaining > 0 && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        ⚠️ Your trial expires in {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}. Subscribe now to keep access to premium features!
                      </Text>
                    </View>
                  )}

                  {trialDaysRemaining === 0 && (
                    <View style={styles.expiredBox}>
                      <Text style={styles.expiredText}>
                        🔒 Your free trial has expired. Subscribe to regain access to premium features.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {accountInfo?.user?.email && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Account:</Text>
                  <Text style={styles.statusValue}>{accountInfo.user.email}</Text>
                </View>
              )}

              {accountInfo?.billing?.subscription_status && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={styles.statusValue}>{accountInfo.billing.subscription_status}</Text>
                </View>
              )}

              {/* Show renewal date from entitlements.valid_until for paid users */}
              {(entitlements?.subscription_status === 'active' || isPaid) && (entitlements as any)?.valid_until && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Renews:</Text>
                  <Text style={styles.statusValue}>
                    {new Date((entitlements as any).valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {/* Fallback: Show current period end from accountInfo if no entitlements.valid_until */}
              {!(entitlements as any)?.valid_until && accountInfo?.billing?.current_period_end && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Renews:</Text>
                  <Text style={styles.statusValue}>
                    {new Date(accountInfo.billing.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {/* Only show payment method for actually paid users, not trial */}
              {(isPaid || entitlements?.subscription_status === 'active') && (paymentMethodResolved !== 'Unknown' || (entitlements as any)?.source) && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Payment Method:</Text>
                  <Text style={styles.statusValue}>
                    {paymentMethodResolved !== 'Unknown' ? paymentMethodResolved : 
                     (entitlements as any)?.source === 'stripe' ? 'Card on file' : 
                     (entitlements as any)?.source}
                  </Text>
                </View>
              )}

              {/* Show member since date for paid users (optional), trial date for free users */}
              {(entitlements as any)?.subscription_started_at && (entitlements?.subscription_status === 'active' || isPaid) && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Member Since:</Text>
                  <Text style={styles.statusValue}>
                    {new Date((entitlements as any).subscription_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {/* Show trial started for users on trial */}
              {!(entitlements?.subscription_status === 'active' || isPaid) && trialStartDate && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Trial Started:</Text>
                  <Text style={styles.statusValue}>
                    {new Date(trialStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>

            {usageSummary && (
              <View style={styles.usageSection}>
                <Text style={styles.usageTitle}>Usage (Last 30 Days)</Text>
                <View style={styles.usageGrid}>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.voice_minutes_used || 0}</Text>
                    <Text style={styles.usageLabel}>Voice Minutes</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.voice_minutes || 30}</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.screenshot_count || 0}</Text>
                    <Text style={styles.usageLabel}>Screenshots</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.screenshots || 100}</Text>
                  </View>
                  <View style={styles.usageItem}>
                    <Text style={styles.usageValue}>{usageSummary.usage.messages_sent || 0}</Text>
                    <Text style={styles.usageLabel}>Messages Sent</Text>
                    <Text style={styles.usageLimit}>/ {usageSummary.limits.messages || 200}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Debug Information - Show actual gate conditions */}
            {SHOW_DEBUG_INFO && (
              <View style={styles.debugSection}>
                <Text style={styles.debugTitle}>🔧 Debug Info (Dev Only)</Text>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>isPaid:</Text>
                  <Text style={[styles.debugValue, isPaid ? styles.debugTrue : styles.debugFalse]}>
                    {String(isPaid)}
                  </Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>isTrialExpired:</Text>
                  <Text style={[styles.debugValue, isTrialExpired ? styles.debugFalse : styles.debugTrue]}>
                    {String(isTrialExpired)}
                  </Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Gate Condition (isTrialExpired && !isPaid):</Text>
                  <Text style={[styles.debugValue, (isTrialExpired && !isPaid) ? styles.debugFalse : styles.debugTrue]}>
                    {String(isTrialExpired && !isPaid)} {(isTrialExpired && !isPaid) ? '🔒 BLOCKED' : '✅ ALLOWED'}
                  </Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>trialDaysRemaining:</Text>
                  <Text style={styles.debugValue}>{trialDaysRemaining}</Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>paymentPlatform:</Text>
                  <Text style={styles.debugValue}>{paymentPlatform || 'null'}</Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>entitlements.source:</Text>
                  <Text style={styles.debugValue}>{(entitlements as any)?.source || 'null'}</Text>
                </View>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>entitlements.tier:</Text>
                  <Text style={styles.debugValue}>{(entitlements as any)?.tier || 'null'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={async () => {
                    console.log('[Debug] Refreshing entitlements...');
                    await refreshEntitlements();
                    await loadAccountData();
                  }}
                >
                  <RefreshCw size={16} color="#3B82F6" />
                  <Text style={styles.refreshButtonText}>Refresh State</Text>
                </TouchableOpacity>
              </View>
            )}

            {(isPaid || entitlements?.plan !== 'free') && (
              <View style={styles.statusFooter}>
                <Text style={styles.statusFooterText}>
                  You have access to all premium features
                </Text>
              </View>
            )}

            {!isPaid && trialDaysRemaining > 0 && (
              <View style={styles.statusFooter}>
                <Text style={styles.statusFooterText}>
                  Upgrade now to continue using premium features after your trial ends
                </Text>
              </View>
            )}

            {loadError && (
              <View style={styles.errorSection}>
                <Text style={styles.errorText}>⚠️ {loadError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={styles.retryButtonText}>Retry</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Available Plans - Always show so users can see upgrade/switch options */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.availablePlansTitle}>
            {(isPaid || entitlements?.subscription_status === 'active') ? 'Upgrade or Switch Plans' : 'Available Plans'}
          </Text>
          
          {/* Plan Cards with Superwall trigger */}
          <View style={styles.planCardsContainer}>
            {/* Core Monthly Plan */}
            {(() => {
              // Determine billing period from entitlements or Stripe price ID
              const stripePriceId = accountInfo?.billing?.stripe_price_id;
              // Use entitlements.source, fallback to 'stripe' if we have Stripe billing info
              const localSubscriptionSource = (entitlements as any)?.source || 
                (accountInfo?.billing?.stripe_subscription_id ? 'stripe' : null);
              let billingPeriod = entitlements?.billing_period || 
                (stripePriceId === STRIPE_PRICES.monthly ? 'monthly' : 
                 stripePriceId === STRIPE_PRICES.annual ? 'annual' : null);
              
              // Check if user has active subscription from entitlements OR isPaid flag
              const isUserPaid = isPaid || 
                entitlements?.subscription_status === 'active' || 
                (entitlements as any)?.tier === 'pro' ||
                (entitlements as any)?.tier === 'core';
              
              // Fallback: if paid via Stripe but billing period unknown, default to monthly
              if (isUserPaid && localSubscriptionSource === 'stripe' && !billingPeriod) {
                billingPeriod = 'monthly';
              }
              
              const isCurrentPlan = isUserPaid && billingPeriod === 'monthly';
              const isUnselected = isUserPaid && billingPeriod === 'annual';
              // Current plan = purple, unselected = green
              const borderColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const iconColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const badgeBg = isCurrentPlan ? '#EDE9FE' : '#D1FAE5';
              const badgeTextColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const ctaBg = isCurrentPlan ? '#7C3AED' : '#D1FAE5';
              const ctaTextColor = isCurrentPlan ? '#FFFFFF' : '#059669';
              
              return (
                <TouchableOpacity 
                  style={[styles.planCardButton, { borderColor }]}
                  onPress={handleShowPaywall}
                  disabled={isCurrentPlan}
                >
                  <View style={styles.planCardHeader}>
                    <Crown size={24} color={iconColor} />
                    <View style={[styles.planCardBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.planCardBadgeText, { color: badgeTextColor }]}>Most Popular</Text>
                    </View>
                  </View>
                  <Text style={styles.planCardTitle}>EverReach Core</Text>
                  <Text style={styles.planCardPrice}>$14.99/month</Text>
                  <Text style={styles.planCardDescription}>
                    Voice notes, AI replies, warmth scoring & more
                  </Text>
                  <View style={[styles.planCardCTA, { backgroundColor: ctaBg }]}>
                    <Text style={[styles.planCardCTAText, { color: ctaTextColor }]}>
                      {isCurrentPlan ? 'Current Plan' : 
                       isUnselected ? 'Switch to Monthly' : 
                       'View Plans'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Annual Plan */}
            {(() => {
              // Determine billing period from entitlements or Stripe price ID
              const stripePriceId = accountInfo?.billing?.stripe_price_id;
              // Use entitlements.source, fallback to 'stripe' if we have Stripe billing info
              const localSubscriptionSource = (entitlements as any)?.source || 
                (accountInfo?.billing?.stripe_subscription_id ? 'stripe' : null);
              let billingPeriod = entitlements?.billing_period || 
                (stripePriceId === STRIPE_PRICES.monthly ? 'monthly' : 
                 stripePriceId === STRIPE_PRICES.annual ? 'annual' : null);
              
              // Check if user has active subscription from entitlements OR isPaid flag
              const isUserPaid = isPaid || 
                entitlements?.subscription_status === 'active' || 
                (entitlements as any)?.tier === 'pro' ||
                (entitlements as any)?.tier === 'core';
              
              // Fallback: if paid via Stripe but billing period unknown, default to monthly
              if (isUserPaid && localSubscriptionSource === 'stripe' && !billingPeriod) {
                billingPeriod = 'monthly';
              }
              
              const isCurrentPlan = isUserPaid && billingPeriod === 'annual';
              const isUnselected = isUserPaid && billingPeriod === 'monthly';
              // Current plan = purple, unselected = green
              const borderColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const iconColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const badgeBg = isCurrentPlan ? '#EDE9FE' : '#D1FAE5';
              const badgeTextColor = isCurrentPlan ? '#7C3AED' : '#059669';
              const ctaBg = isCurrentPlan ? '#7C3AED' : '#D1FAE5';
              const ctaTextColor = isCurrentPlan ? '#FFFFFF' : '#059669';
              
              return (
                <TouchableOpacity 
                  style={[styles.planCardButton, { borderColor }]}
                  onPress={isUnselected ? handleSwitchToAnnual : handleAnnualPlanClick}
                  disabled={isCurrentPlan}
                >
                  <View style={styles.planCardHeader}>
                    <Zap size={24} color={iconColor} />
                    <View style={[styles.planCardBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.planCardBadgeText, { color: badgeTextColor }]}>Save 15%</Text>
                    </View>
                  </View>
                  <Text style={styles.planCardTitle}>Annual Plan</Text>
                  <Text style={styles.planCardPrice}>$152.99/year</Text>
                  <Text style={styles.planCardDescription}>
                    Best value - all Core features at a discount
                  </Text>
                  <View style={[styles.planCardCTA, { backgroundColor: ctaBg }]}>
                    <Text style={[styles.planCardCTAText, { color: ctaTextColor }]}>
                      {isCurrentPlan ? 'Current Plan' : 
                       isUnselected ? 'Switch to Annual' : 
                       'View Plans'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        <View style={styles.footer}>
          {!(isPaid || entitlements?.subscription_status === 'active') && (
            <Text style={styles.footerText}>
              All plans include a 7-day free trial. Cancel anytime.
            </Text>
          )}
          
          {/* Show subscription source indicator for paid users */}
          {(isPaid || entitlements?.subscription_status === 'active') && (subscriptionSource || (entitlements as any)?.source) && (
            <Text style={[styles.footerText, { marginBottom: 8, fontSize: 12, color: '#6B7280' }]} testID="subscription-source-label">
              Subscribed via {paymentMethodResolved || ((entitlements as any)?.source === 'stripe' ? 'Card on file' : (entitlements as any)?.source)}
            </Text>
          )}
          
          {/* Web: Always show "Manage Subscription" button (opens Stripe portal or shows appropriate instructions) */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && (
            <TouchableOpacity
              style={[styles.restoreButton, { marginTop: 12, backgroundColor: '#3B82F6' }]}
              onPress={handleManageBilling}
              testID="manage-billing-stripe-button"
            >
              <Text style={[styles.restoreButtonText, { color: '#FFFFFF' }]}>Manage Subscription</Text>
            </TouchableOpacity>
          )}
          
          {/* Web + App Store: Show instructions for mobile subscribers */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && isPaid && subscriptionSource === 'app_store' && (
            <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }} testID="app-store-instructions">
              <Text style={[styles.footerText, { color: '#374151', fontWeight: '600', marginBottom: 8 }]}>
                Manage Your Subscription
              </Text>
              <Text style={[styles.footerText, { color: '#6B7280', fontSize: 13, textAlign: 'center' }]}>
                Your subscription was purchased through the App Store.{'\n'}
                To manage or cancel, go to:{'\n\n'}
                <Text style={{ fontWeight: '600' }}>Settings → Apple ID → Subscriptions → EverReach</Text>
              </Text>
            </View>
          )}
          
          {/* Web + Google Play: Show instructions for mobile subscribers */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && isPaid && subscriptionSource === 'play' && (
            <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }} testID="play-store-instructions">
              <Text style={[styles.footerText, { color: '#374151', fontWeight: '600', marginBottom: 8 }]}>
                Manage Your Subscription
              </Text>
              <Text style={[styles.footerText, { color: '#6B7280', fontSize: 13, textAlign: 'center' }]}>
                Your subscription was purchased through Google Play.{'\n'}
                To manage or cancel, go to:{'\n\n'}
                <Text style={{ fontWeight: '600' }}>Play Store → Menu → Subscriptions → EverReach</Text>
              </Text>
            </View>
          )}
          
          {/* Web + RevenueCat (source unknown - could be App Store or Play): Show general instructions */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && isPaid && subscriptionSource === 'revenuecat' && (
            <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }} testID="mobile-subscription-instructions">
              <Text style={[styles.footerText, { color: '#374151', fontWeight: '600', marginBottom: 8 }]}>
                Manage Your Subscription
              </Text>
              <Text style={[styles.footerText, { color: '#6B7280', fontSize: 13, textAlign: 'center' }]}>
                Your subscription was purchased through the mobile app.{'\n'}
                To manage or cancel:{'\n\n'}
                <Text style={{ fontWeight: '600' }}>iOS:</Text> Settings → Apple ID → Subscriptions{'\n'}
                <Text style={{ fontWeight: '600' }}>Android:</Text> Play Store → Menu → Subscriptions
              </Text>
            </View>
          )}
          
          {/* Web + Manual/Enterprise: Show contact info */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && isPaid && subscriptionSource === 'manual' && (
            <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }} testID="enterprise-instructions">
              <Text style={[styles.footerText, { color: '#374151', fontWeight: '600', marginBottom: 8 }]}>
                Enterprise Subscription
              </Text>
              <Text style={[styles.footerText, { color: '#6B7280', fontSize: 13, textAlign: 'center' }]}>
                Contact support@everreach.app to manage your subscription
              </Text>
            </View>
          )}
          
          {/* Web: Always show "Already subscribed on mobile?" help for non-paid users */}
          {Platform.OS === 'web' && !FLAGS.LOCAL_ONLY && !isPaid && (
            <View style={{ marginTop: 16, alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8 }} testID="mobile-subscriber-help">
              <Text style={[styles.footerText, { color: '#92400E', fontSize: 13, textAlign: 'center' }]}>
                <Text style={{ fontWeight: '600' }}>Already subscribed on mobile?</Text>{'\n'}
                Your subscription may not sync to web. Please contact support@everreach.app
              </Text>
            </View>
          )}
          
          {/* Mobile: Show "Manage Billing" button (routes to appropriate store) */}
          {Platform.OS !== 'web' && !FLAGS.LOCAL_ONLY && isPaid && (
            <TouchableOpacity
              style={[styles.restoreButton, { marginTop: 12 }]}
              onPress={handleManageBilling}
              testID="manage-billing-native-button"
            >
              <Text style={styles.restoreButtonText}>Manage Billing</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  availablePlansTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.02 }],
  },
  disabledPlan: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planHeader: {
    marginBottom: 24,
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#3B82F6',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  excludedFeature: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  selectButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: '#3B82F6',
  },
  currentPlanButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  popularButtonText: {
    color: '#FFFFFF',
  },
  currentPlanButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  trialBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusDetails: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  statusValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600' as const,
  },
  trialDaysText: {
    color: '#F59E0B',
  },
  statusFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  usageSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  usageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  usageItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  usageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  usageLimit: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  errorSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500' as const,
    marginRight: 12,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  restoreButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  trialBadgeWarning: {
    backgroundColor: '#F59E0B',
  },
  statusRowProminent: {
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  statusValueBold: {
    fontWeight: '700' as const,
    fontSize: 15,
  },
  trialInfoRow: {
    marginVertical: 4,
  },
  warningBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  expiredBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
  },
  expiredText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  debugSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#374151',
    marginBottom: 8,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  debugLabel: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  debugValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#111827',
  },
  debugTrue: {
    color: '#10B981',
  },
  debugFalse: {
    color: '#EF4444',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  refreshButtonText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  // Plan card styles for Superwall trigger buttons
  planCardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCardButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardCore: {
    borderColor: '#7C3AED',
  },
  planCardAnnual: {
    borderColor: '#059669',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planCardBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planCardBadgeSave: {
    backgroundColor: '#D1FAE5',
  },
  planCardBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 4,
  },
  planCardPrice: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#111827',
    marginBottom: 8,
  },
  planCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  planCardCTA: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  planCardCTAAnnual: {
    backgroundColor: '#D1FAE5',
  },
  planCardCTAText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});