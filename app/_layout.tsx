/**
 * Root Layout v2 - Simplified Navigation
 * 
 * Just checks auth state and renders appropriate screens
 * All auth logic lives in AuthProvider.v2
 */

// Import polyfills first
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'text-encoding-polyfill';

// Disable LogBox (error overlays) for production screenshots and builds
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  '[OnboardingV2]',
  'Superwall',
  'RevenueCat',
  'Error type:',
  'onError callback',
]);

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import Constants from 'expo-constants';
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PeopleProvider } from "@/providers/PeopleProvider";
import { VoiceNotesProvider } from "@/providers/VoiceNotesProvider";
import { MessageProvider } from "@/providers/MessageProvider";
import { InteractionsProvider } from "@/providers/InteractionsProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProviderV2";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { EntitlementsProviderV3 } from "@/providers/EntitlementsProviderV3";
import { AppSettingsProvider } from "@/providers/AppSettingsProvider";
import { WarmthSettingsProvider } from "@/providers/WarmthSettingsProvider";
import { WarmthProvider, useWarmth } from "@/providers/WarmthProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
import { TemplatesContext } from "@/providers/TemplatesProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { shouldBlockPath } from "@/config/navigation";
import { trpc, trpcClient } from "@/lib/trpc";
import { NotesComposerProvider } from "@/providers/NotesComposerProvider";
import { PaywallProvider } from "@/providers/PaywallProvider";
import { PaywallGuard } from "@/components/PaywallGuard";
import { SuperwallProvider, SuperwallLoading, SuperwallLoaded, CustomPurchaseControllerProvider } from 'expo-superwall';
import Purchases from 'react-native-purchases';
import Auth from "./auth";
import OnboardingFlow from "./onboarding";
import OnboardingV2Screen from "./onboarding-v2";
import UpgradeOnboarding from "./upgrade-onboarding";
import WelcomeScreen, { hasSeenWelcome } from "./welcome";
import { View, ActivityIndicator, StyleSheet, Text, Platform } from "react-native";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { initializeEnvelope } from "@/lib/eventEnvelope";
import { initializeMarketingFunnel } from "@/lib/marketingFunnel";
import { initializePerformanceMonitoring } from "@/lib/performanceMonitor";
import { initializePostHog, identifyUser } from "@/lib/posthog";
import { initializeMetaAppEvents, identifyMetaUser, resetMetaUser, captureClickId } from "@/lib/metaAppEvents";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { initializeRevenueCat } from "@/lib/revenuecat";
import { useSubscription } from "@/providers/SubscriptionProvider";
import { apiFetch } from "@/lib/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setQueryClientForImageUpload } from "@/lib/imageUpload";
import { paywallConfigService } from "@/lib/paywallConfig";

SplashScreen.preventAutoHideAsync().catch(() => { });

// Initialize event envelope (session IDs, UTM params, experiments)
initializeEnvelope().then(() => {
  console.log('[App] Event envelope initialized');
}).catch((error) => {
  console.error('[App] Failed to initialize envelope:', error);
});

// Initialize marketing funnel (install tracking, deep links, attribution)
initializeMarketingFunnel().then(() => {
  console.log('[App] Marketing funnel initialized');
}).catch((error) => {
  console.error('[App] Failed to initialize marketing funnel:', error);
});

// Initialize performance monitoring (memory, network, app state)
initializePerformanceMonitoring();
console.log('[App] Performance monitoring initialized');

// Initialize PostHog analytics (no-op if API key missing)
initializePostHog();

// Initialize Meta App Events (Conversions API + native SDK if available)
initializeMetaAppEvents();

// Capture fbclid from deep links (Facebook ad attribution)
Linking.getInitialURL().then((url) => {
  if (url) captureClickId(url);
}).catch(() => {});
Linking.addEventListener('url', ({ url }) => {
  if (url) captureClickId(url);
});

// Initialize RevenueCat (IAP subscriptions)
initializeRevenueCat().then((success) => {
  if (success) {
    console.log('[App] RevenueCat initialized successfully');
  } else {
    console.log('[App] RevenueCat initialization skipped (not available or missing keys)');
  }
}).catch((error) => {
  console.error('[App] Failed to initialize RevenueCat:', error);
});

// Initialize Superwall (Remote Paywalls)
import('@/lib/superwall').then(({ initializeSuperwall }) => {
  initializeSuperwall().then((success) => {
    if (success) {
      console.log('[App] Superwall initialized successfully');
    } else {
      console.log('[App] Superwall initialization skipped (not available or missing keys)');
    }
  }).catch((error) => {
    console.error('[App] Failed to initialize Superwall:', error);
  });
}).catch((error) => {
  console.log('[App] Superwall not available (requires custom dev build):', error?.message || error);
});

// Throttle keys for warmth recompute
const WARMTH_RECOMPUTE_KEY = 'warmth_recompute_last_run';
const WARMTH_DAILY_RECOMPUTE_KEY = 'warmth_daily_recompute_last_run';
let warmthRecomputeSessionRan = false;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('HTML instead of JSON') ||
          error?.message?.includes('fetch')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize query client for image upload cache invalidation
setQueryClientForImageUpload(queryClient);

const superwallKeysPresent = !!(
  process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY ||
  process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY
);

// Global screen tracking helper (expo-router path + duration)
function ScreenTracker() {
  useScreenTracking();
  return null;
}

/**
 * Navigation component - just checks auth state
 */
function RootLayoutNav() {
  const { loading, isAuthenticated, user } = useAuth();
  const { isCompleted: onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  const { isPaid, isTrialExpired } = useSubscription();
  const pathname = usePathname();
  
  // Track if user has seen welcome screens (for pre-auth onboarding)
  const [welcomeSeen, setWelcomeSeen] = React.useState<boolean | null>(null);
  
  // Check if welcome has been seen on mount AND when auth state changes
  // This ensures that after sign out, we re-check the welcome status
  React.useEffect(() => {
    hasSeenWelcome().then((seen) => {
      setWelcomeSeen(seen);
      console.log('[Layout] Welcome seen status:', seen, 'isAuthenticated:', isAuthenticated);
    });
  }, [isAuthenticated]); // Re-check when auth state changes (e.g., after sign out)

  // Listen for welcome completion to update state (for re-renders after welcome)
  React.useEffect(() => {
    // Re-check welcome seen status when returning from welcome screen
    const interval = setInterval(() => {
      if (welcomeSeen === false) {
        hasSeenWelcome().then((seen) => {
          if (seen && !welcomeSeen) {
            setWelcomeSeen(true);
            console.log('[Layout] Welcome completed, updating state');
          }
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [welcomeSeen]);

  // Track app lifecycle events globally
  useAppLifecycle();

  // Initialize RevenueCat on native once authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (Platform.OS === 'web') return;

    let customerInfoListener: any = null;

    import('@/lib/revenuecat')
      .then(async ({ initializeRevenueCat, logIn }) => {
        const userId = typeof (user as any)?.id === 'string' ? (user as any).id : null;
        
        // Initialize RevenueCat with user ID
        const success = await initializeRevenueCat(userId);
        
        // CRITICAL: After initialization, identify RevenueCat with the user ID
        // This ensures subscriptions are tied to THIS user account, not the device
        if (success && userId) {
          console.log('[App] Identifying RevenueCat with user ID:', userId);
          try {
            const result = await logIn(userId);
            if (result) {
              console.log('[App] ✅ RevenueCat identified with user:', userId, 'created:', result.created);
            }
          } catch (rcError: any) {
            console.error('[App] ❌ Failed to identify RevenueCat:', rcError?.message || rcError);
          }
        }

        if (success) {
          // Set up customer info update listener
          const Purchases = await import('react-native-purchases').then(m => m.default || m);
          if (Purchases && typeof Purchases.addCustomerInfoUpdateListener === 'function') {
            customerInfoListener = Purchases.addCustomerInfoUpdateListener(async (customerInfo: any) => {
              console.log('[App] RevenueCat customer info updated (active entitlements):', Object.keys(customerInfo?.entitlements?.active || {}));

              // Refresh entitlements from backend when purchase occurs
              try {
                await queryClient.invalidateQueries({ queryKey: ['entitlements'] });
                console.log('[App] Entitlements refreshed after purchase');
              } catch (e) {
                console.warn('[App] Failed to refresh entitlements:', e);
              }
            });
            console.log('[App] RevenueCat customer info listener added');
          }
        }
      })
      .catch((e) => console.warn('[App] RevenueCat init skipped:', e?.message || e));

    return () => {
      // Clean up listener on unmount
      if (customerInfoListener && typeof customerInfoListener.remove === 'function') {
        customerInfoListener.remove();
        console.log('[App] RevenueCat listener removed');
      }
    };
  }, [isAuthenticated, queryClient]);

  // Identify user with PostHog + Meta once authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const userId = (user as any)?.id;
    const userEmail = (user as any)?.email;
    try {
      identifyUser(userId, {
        plan: isPaid ? 'paid' : 'free',
        platform: Platform.OS,
      });
    } catch (e) {
      console.warn('[App] PostHog identify skipped:', (e as any)?.message || e);
    }
    // Identify with Meta App Events — query profiles table for rich data
    (async () => {
      try {
        const { data: profile } = await supabase
          ?.from('profiles')
          .select('display_name, first_name, phone_e164, country, timezone')
          .eq('user_id', userId)
          .single();

        const displayName = profile?.display_name || '';
        const nameParts = displayName.split(' ').filter(Boolean);
        const firstName = profile?.first_name || nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const phone = profile?.phone_e164 || (user as any)?.phone || (user as any)?.user_metadata?.phone;

        // Infer country from timezone if not explicitly set
        let country = profile?.country || (user as any)?.user_metadata?.country;
        if (!country && profile?.timezone) {
          const tz = profile.timezone.toLowerCase();
          if (tz.startsWith('america/')) country = 'us';
          else if (tz.startsWith('europe/london')) country = 'gb';
          else if (tz.startsWith('europe/')) country = tz.split('/')[1]?.substring(0, 2) || '';
          else if (tz.startsWith('asia/')) country = '';
          else if (tz.startsWith('australia/')) country = 'au';
        }

        await identifyMetaUser(userId, userEmail, phone, {
          firstName,
          lastName,
          country: country || 'us',
        });
      } catch (e) {
        console.warn('[App] Meta identify skipped:', (e as any)?.message || e);
      }
    })();
  }, [isAuthenticated, user, isPaid]);

  // ✅ REFACTORED: Get centralized warmth methods
  const { refreshTop, refreshRecent } = useWarmth();

  // Daily background recompute for top contacts by warmth (24h throttle)
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const last = await AsyncStorage.getItem(WARMTH_DAILY_RECOMPUTE_KEY);
        const now = Date.now();
        if (last && now - Number(last) < 24 * 60 * 60 * 1000) {
          console.log('[Warmth] Daily recompute skipped (< 24h since last run)');
          return;
        }

        console.log('[Warmth] Starting daily recompute for top 60 contacts...');

        // Optimistic lock: Set timestamp BEFORE starting to prevent re-entry if component re-renders
        await AsyncStorage.setItem(WARMTH_DAILY_RECOMPUTE_KEY, String(now));

        await refreshTop(60, { source: 'daily-background' });
        console.log('[Warmth] Daily recompute complete');
      } catch (e) {
        console.warn('[Warmth] Daily recompute failed:', (e as any)?.message || e);
      }
    })();
  }, [isAuthenticated, refreshTop]);

  // Prefetch contact avatars on startup (instant loading)
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      try {
        console.log('[Avatars] Prefetching contact avatars (top 100)...');

        const response = await apiFetch('/api/v1/contacts?limit=100', {
          method: 'GET',
          requireAuth: true,
        });

        if (!response.ok) {
          console.warn('[Avatars] Prefetch failed:', response.status);
          return;
        }

        const data = await response.json();
        const contacts = data.contacts || data.items || [];

        // Cache the full contacts list
        queryClient.setQueryData(['contacts', 'list'], contacts);

        // Pre-cache individual avatar URLs
        let cached = 0;
        contacts.forEach((contact: any) => {
          if (contact.id && contact.avatar_url) {
            queryClient.setQueryData(['contact-avatar', contact.id], contact.avatar_url);
            cached++;
          }
        });

        console.log(`✅ [Avatars] Prefetched ${cached} avatars out of ${contacts.length} contacts`);
      } catch (error) {
        console.error('[Avatars] Prefetch error:', error);
      }
    })();
  }, [isAuthenticated]);

  // Recompute warmth on startup (once per session; 10min throttle via storage)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (warmthRecomputeSessionRan) return;
    warmthRecomputeSessionRan = true;
    (async () => {
      try {
        const last = await AsyncStorage.getItem(WARMTH_RECOMPUTE_KEY);
        const now = Date.now();
        if (last && now - Number(last) < 10 * 60 * 1000) {
          console.log('[Warmth] Startup recompute skipped (< 10min since last run)');
          return;
        }

        console.log('[Warmth] Starting startup recompute for 30 recent contacts...');
        await refreshRecent(30, { source: 'startup-background' });

        await AsyncStorage.setItem(WARMTH_RECOMPUTE_KEY, String(now));
        console.log('[Warmth] Startup recompute complete');
      } catch (e) {
        console.warn('[Warmth] Startup recompute failed:', (e as any)?.message || e);
      }
    })();
  }, [isAuthenticated, refreshRecent]);

  // Pre-fetch paywall configuration on app launch
  useEffect(() => {
    (async () => {
      try {
        console.log('[App] Pre-fetching paywall configuration...');
        await paywallConfigService.fetchConfig('mobile');
        console.log('[App] Paywall configuration loaded');
      } catch (e) {
        console.warn('[App] Failed to pre-fetch paywall config:', (e as any)?.message || e);
      }
    })();
  }, []);

  const isLoading = loading || onboardingLoading || welcomeSeen === null;

  // Memoize ALL screen options at the TOP LEVEL (before any conditional returns)
  // This prevents infinite re-renders caused by new object references
  const screenOptions = React.useMemo(() => ({
    headerShown: false,
    headerBackTitle: '', // Hide "(tabs)" text on back buttons
  }), []);

  const noHeaderOptions = React.useMemo(() => ({ headerShown: false }), []);

  // Memoize all screen options with titles
  const warmthSettingsOptions = React.useMemo(() => ({ headerShown: true, title: "Warmth Settings" }), []);
  const personalNotesOptions = React.useMemo(() => ({ headerShown: true, title: "Personal Notes" }), []);
  const contactNotesOptions = React.useMemo(() => ({ headerShown: true, title: "Contact Notes" }), []);
  const importContactsOptions = React.useMemo(() => ({ headerShown: true, title: "Import Contacts" }), []);
  const modeSettingsOptions = React.useMemo(() => ({ headerShown: true, title: "Mode Settings" }), []);
  const notificationsOptions = React.useMemo(() => ({ headerShown: true, title: "Notifications" }), []);
  const contactContextOptions = React.useMemo(() => ({ headerShown: false } as const), []);
  const personalProfileOptions = React.useMemo(() => ({ headerShown: true, title: "Personal Profile" }), []);
  const termsOptions = React.useMemo(() => ({ headerShown: true, title: "Terms & Conditions" }), []);
  const privacyOptions = React.useMemo(() => ({ headerShown: true, title: "Privacy Policy" }), []);
  const addContactModalOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: true,
    title: "Add Contact",
  } as const), []);
  const importThirdPartyOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: true,
    title: "Import Contacts",
  } as const), []);
  const goalPickerOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: true,
    title: "Pick Goal",
  } as const), []);
  const messageResultsOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: true,
    title: "Generated Messages",
  } as const), []);
  const messageSentSuccessOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: false,
  } as const), []);

  const voiceNoteOptions = React.useMemo(() => ({
    presentation: "fullScreenModal",
    headerShown: true,
    title: "Voice Note",
  } as const), []);

  /*
  console.log('[Layout v2] State:', {
    loading,
    isAuthenticated,
    onboardingCompleted,
  });
  */

  // Show loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show welcome screens for first-time users (before auth)
  // OnboardingV2 handles the welcome screen (S1) and pre-auth questions
  if (!isAuthenticated && !welcomeSeen) {
    console.log('[Layout v2] → Onboarding V2 (Welcome/Pre-auth)');
    return <OnboardingV2Screen />;
  }

  // Show sign-in if not authenticated, except for public routes
  if (!isAuthenticated) {
    const path = pathname || '/';
    const allowUnauthed = path.startsWith('/auth') || path.startsWith('/sign-in') || path.startsWith('/billing') || path === '/terms' || path === '/privacy-policy' || path === '/telemetry-debug' || path === '/welcome';
    // console.log('[Layout v2] Auth check - path:', path, 'allowUnauthed:', allowUnauthed);
    if (!allowUnauthed) {
      // console.log('[Layout v2] → Auth');
      return <Auth />;
    }
    // console.log('[Layout v2] → Allowing public route:', path);
  }

  // Show onboarding for first-time users (only after authentication)
  // OnboardingV2 handles the post-auth questions
  const isOnboardingDisabled = process.env.EXPO_PUBLIC_DISABLE_ONBOARDING === 'true';
  if (isAuthenticated && !onboardingCompleted && !isOnboardingDisabled) {
    // console.log('[Layout v2] → Onboarding V2 (Post-auth)');
    return <OnboardingV2Screen />;
  }

  // Global gating: Simplified navigation control
  // Use centralized config to determine if path should be blocked
  const path = pathname || '/';

  // Enhanced debug logging - ALWAYS log navigation checks
  /*
  console.log('🔍 [Layout v2] Navigation Check:', {
    path,
    isTrialExpired,
    isPaid,
    onboardingLoading,
  });
  */

  // Show main app
  // console.log('[Layout v2] → Main App');

  return (
    <>
      <ScreenTracker />
      <PaywallGuard>
        <Stack screenOptions={screenOptions}>
          {/* Main app with tabs */}
          <Stack.Screen name="(tabs)" />

          {/* Regular screens (not modals) */}
          <Stack.Screen name="contact/[id]" options={noHeaderOptions} />
          <Stack.Screen name="warmth-settings" options={warmthSettingsOptions} />
          <Stack.Screen name="personal-notes" options={personalNotesOptions} />
          <Stack.Screen name="contact-notes/[id]" options={contactNotesOptions} />
          <Stack.Screen name="import-contacts" options={importContactsOptions} />
          <Stack.Screen name="mode-settings" options={modeSettingsOptions} />
          <Stack.Screen name="notifications" options={notificationsOptions} />
          <Stack.Screen name="contact-context/[id]" options={contactContextOptions} />
          <Stack.Screen name="personal-profile" options={personalProfileOptions} />

          {/* Root index - handles auth code redirects */}
          <Stack.Screen name="index" options={noHeaderOptions} />

          {/* Auth screens - Public routes */}
          <Stack.Screen name="auth" options={noHeaderOptions} />
          <Stack.Screen name="auth/forgot-password" options={noHeaderOptions} />
          <Stack.Screen name="auth/reset-password" options={noHeaderOptions} />
          <Stack.Screen name="auth/callback" options={noHeaderOptions} />

          {/* Billing screens - Public routes for Stripe redirects */}
          <Stack.Screen name="billing/success" options={noHeaderOptions} />
          <Stack.Screen name="billing/cancel" options={noHeaderOptions} />

          {/* Legal pages - Public routes */}
          <Stack.Screen name="terms" options={termsOptions} />
          <Stack.Screen name="privacy-policy" options={privacyOptions} />

          {/* Modal screens - Full screen modals that slide up from bottom */}
          <Stack.Screen
            name="add-contact"
            options={addContactModalOptions}
          />
          <Stack.Screen
            name="import-third-party"
            options={importThirdPartyOptions}
          />
          <Stack.Screen
            name="goal-picker"
            options={goalPickerOptions}
          />
          <Stack.Screen
            name="message-results"
            options={messageResultsOptions}
          />
          <Stack.Screen
            name="voice-note"
            options={voiceNoteOptions}
          />
          <Stack.Screen
            name="message-sent-success"
            options={messageSentSuccessOptions}
          />

          {/* Test/Debug screens - using default options to prevent re-renders */}
          <Stack.Screen name="openai-test" />
          <Stack.Screen name="supabase-test" />
          <Stack.Screen name="api-test-suite" />
          <Stack.Screen name="trpc-test" />
          <Stack.Screen name="payment-events-test" />
          <Stack.Screen name="meta-pixel-test" />
        </Stack>
      </PaywallGuard>
    </>
  );
}

/**
 * Root layout with providers
 */
export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const iosKey = process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '';
    console.log('[Superwall] Debug Info:');
    console.log('  - iOS Key:', iosKey.substring(0, 8) + '...');
    console.log('  - Bundle ID:', Constants.expoConfig?.ios?.bundleIdentifier || 'unknown');
  }, []);

  useEffect(() => {
    // Initialize PostHog analytics as early as possible
    initializePostHog();

    // Initialize backend analytics session
    import('../lib/backendAnalytics')
      .then(({ generateSessionId }) => {
        const sessionId = generateSessionId();
        console.log('[App] Backend analytics session initialized:', sessionId);
      })
      .catch((error) => {
        console.error('[App] Failed to initialize backend analytics:', error);
      });
  }, []);

  // FIX: Force hide splash screen after timeout (prevents stuck loading)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        console.log(' [App] Forcing splash screen hide after 3 seconds');
        await SplashScreen.hideAsync();
        console.log('[App] Splash screen hidden');
      } catch (error) {
        console.warn('[App] Failed to hide splash screen:', error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const providers = (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <ThemeProvider>
          <AppSettingsProvider>
            <AuthProvider>
              <CustomPurchaseControllerProvider
                controller={{
                  onPurchase: async (params) => {
                    try {
                      console.log('[Superwall] Purchase initiated for:', params.productId);
                      const products = await Purchases.getProducts([params.productId]);
                      if (!products || products.length === 0) {
                        console.error('[Superwall] No products found for:', params.productId);
                        throw new Error('Product not found');
                      }
                      console.log('[Superwall] Product found, purchasing:', products[0].identifier);
                      const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
                      console.log('[Superwall] Purchase completed, active entitlements:', Object.keys(customerInfo?.entitlements?.active || {}));
                    } catch (error) {
                      console.error('[Superwall] Purchase failed:', error);
                      throw error;
                    }
                  },
                  onPurchaseRestore: async () => {
                    try {
                      console.log('[Superwall] Restore initiated');
                      const customerInfo = await Purchases.restorePurchases();
                      console.log('[Superwall] Purchases restored, active entitlements:', Object.keys(customerInfo?.entitlements?.active || {}));
                    } catch (error) {
                      console.error('[Superwall] Restore failed:', error);
                      throw error;
                    }
                  },
                }}
              >
                <SuperwallProvider
                  apiKeys={{
                    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
                    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY || ''
                  }}
                >
                  <SuperwallLoading>
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#007AFF" />
                      <Text style={styles.loadingText}>Loading Superwall...</Text>
                    </View>
                  </SuperwallLoading>
                  <SuperwallLoaded>
                    <OnboardingProvider>
                      <WarmthSettingsProvider>
                        <WarmthProvider>
                          <TemplatesContext>
                            <SubscriptionProvider>
                              <EntitlementsProviderV3>
                                <PaywallProvider>
                                  <PeopleProvider>
                                    <InteractionsProvider>
                                      <VoiceNotesProvider>
                                        <MessageProvider>
                                          <NotesComposerProvider>
                                            <RootLayoutNav />
                                          </NotesComposerProvider>
                                        </MessageProvider>
                                      </VoiceNotesProvider>
                                    </InteractionsProvider>
                                  </PeopleProvider>
                                </PaywallProvider>
                              </EntitlementsProviderV3>
                            </SubscriptionProvider>
                          </TemplatesContext>
                        </WarmthProvider>
                      </WarmthSettingsProvider>
                    </OnboardingProvider>
                  </SuperwallLoaded>
                </SuperwallProvider>
              </CustomPurchaseControllerProvider>
            </AuthProvider>
          </AppSettingsProvider>
        </ThemeProvider>
      </trpc.Provider >
    </QueryClientProvider >
  );

  return Platform.OS === 'web' ? (
    <View style={styles.container}>{providers}</View>
  ) : (
    <GestureHandlerRootView style={styles.container}>
      {providers}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
