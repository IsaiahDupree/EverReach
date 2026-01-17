// Import polyfills first
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'text-encoding-polyfill';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from 'expo-linking';
import { PeopleProvider } from "@/providers/PeopleProvider";
import { VoiceNotesProvider } from "@/providers/VoiceNotesProvider";
import { MessageProvider } from "@/providers/MessageProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { AppSettingsProvider, useAppSettings } from "@/providers/AppSettingsProvider";
import { WarmthSettingsProvider } from "@/providers/WarmthSettingsProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
import { PostHogProvider } from "@/providers/PostHogProvider";
import { trpc, trpcClient } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { FLAGS } from "@/constants/flags";
import SignIn from "./sign-in";
import OnboardingFlow from "./onboarding";
import { View, ActivityIndicator, StyleSheet, Text, Platform, TouchableOpacity } from "react-native";

// Prevent auto-hide on all platforms
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors on web
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry if it's a network error or HTML response
        if (error?.message?.includes('HTML instead of JSON') || 
            error?.message?.includes('fetch')) {
          console.warn('[QueryClient] Not retrying due to network/API error:', error.message);
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false, // Don't retry mutations
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootLayoutNav() {
  const { session, loading: authLoading } = useAuth();
  const { theme, cloudModeEnabled } = useAppSettings();
  const { isCompleted: onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  
  // Compute offline mode based on FLAGS and cloud mode setting
  const isOfflineMode = FLAGS.LOCAL_ONLY || !cloudModeEnabled;
  const loading = authLoading || onboardingLoading;

  console.log('[RootLayoutNav] Render state:', { 
    loading, 
    isOfflineMode, 
    cloudModeEnabled, 
    hasSession: !!session,
    onboardingCompleted 
  });

  if (loading) {
    console.log('[RootLayoutNav] Showing loading screen');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
      </View>
    );
  }

  // Only require authentication if offline mode is disabled and no session exists
  if (!isOfflineMode && !session) {
    console.log('[RootLayoutNav] Showing sign in screen - cloud mode enabled but no session');
    return <SignIn />;
  }

  // Show onboarding for first-time users (unless disabled via environment variable)
  const isOnboardingDisabled = process.env.EXPO_PUBLIC_DISABLE_ONBOARDING === 'true';
  if (!onboardingCompleted && !isOnboardingDisabled) {
    console.log('[RootLayoutNav] Showing onboarding flow - first time user');
    return <OnboardingFlow />;
  }
  
  if (isOnboardingDisabled) {
    console.log('[RootLayoutNav] Onboarding disabled via environment variable - skipping');
  }

  console.log('[RootLayoutNav] Showing main app');

  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text,
      headerTitleStyle: {
        fontWeight: '600',
        color: theme.colors.text,
      },
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-contact" 
        options={{ 
          title: "Add Contact",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="contact/[id]" 
        options={{ 
          title: "",
          headerTransparent: true,
          headerBlurEffect: "light",
        }} 
      />
      <Stack.Screen 
        name="voice-note" 
        options={{ 
          title: "Voice Note",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="sign-in" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="message-results" 
        options={{ 
          title: "Generated Messages",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="concierge-demo" 
        options={{ 
          title: "AI Concierge Demo",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="goal-picker" 
        options={{ 
          title: "Pick Goal",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="audio-test" 
        options={{ 
          title: "Audio Test",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="openai-test" 
        options={{ 
          title: "OpenAI Test",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="privacy-policy" 
        options={{ 
          title: "Privacy Policy",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="terms-of-service" 
        options={{ 
          title: "Terms of Service",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="supabase-test" 
        options={{ 
          title: "Supabase Test",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="contact-import-test" 
        options={{ 
          title: "Contact Import Tests",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="api-test-suite" 
        options={{ 
          title: "API Test Suite",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="warmth-settings" 
        options={{ 
          title: "Warmth Settings",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="personal-notes" 
        options={{ 
          title: "Personal Notes",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="supabase-debug" 
        options={{ 
          title: "Debug",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="local-only" 
        options={{ 
          title: "Local Mode",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="contact-notes/[id]" 
        options={{ 
          title: "Contact Notes",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="import-contacts" 
        options={{ 
          title: "Import Contacts",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="mode-settings" 
        options={{ 
          title: "Mode Settings",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: "Notifications",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="chat-intro" 
        options={{ 
          title: "Chat",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="contact-context/[id]" 
        options={{ 
          title: "Contact Context",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
      <Stack.Screen 
        name="trpc-test" 
        options={{ 
          title: "tRPC Test",
          presentation: "modal",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    let subscription: any = null;
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('[RootLayout] Initializing app...');
        console.log('[RootLayout] Platform:', Platform.OS);
        console.log('[RootLayout] FLAGS:', FLAGS);
        
        // Hide splash screen with a small delay to ensure everything is mounted
        setTimeout(() => {
          if (mounted) {
            SplashScreen.hideAsync().catch((err: any) => {
              console.warn('[RootLayout] Failed to hide splash screen:', err);
            });
          }
        }, 100);
        
        // Handle deep links for OAuth callback (only if not in local-only mode)
        if (!FLAGS.LOCAL_ONLY && supabase) {
          console.log('[RootLayout] Setting up deep link handling');
          const handleDeepLink = (url: string) => {
            if (!url?.trim() || !mounted) return;
            console.log('Deep link received:', url);
            supabase.auth.exchangeCodeForSession(url).catch((err: any) => {
              console.error('Failed to exchange code for session:', err);
            });
          };

          // Handle when app is opened from a cold start via deep link
          Linking.getInitialURL().then((initialUrl) => {
            if (initialUrl && mounted) {
              handleDeepLink(initialUrl);
            }
          }).catch((err: any) => {
            console.error('Failed to get initial URL:', err);
          });

          // Handle when app is already running
          subscription = Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
          });
        }
        
        console.log('[RootLayout] App initialization complete');
      } catch (err) {
        console.error('[RootLayout] App initialization error:', err);
      }
    };

    initializeApp();
    
    return () => {
      mounted = false;
      if (subscription) {
        console.log('[RootLayout] Cleaning up deep link subscription');
        subscription.remove();
      }
    };
  }, []);

  // Always render the app structure immediately to prevent hydration mismatch
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider>
          {/* @ts-ignore - tRPC provider type issue */}
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {Platform.OS === 'web' ? (
              <View style={styles.gestureHandler}>
                <AppSettingsProvider>
                  <AuthProvider>
                    <OnboardingProvider>
                      <WarmthSettingsProvider>
                        <SubscriptionProvider>
                          <PeopleProvider>
                            <VoiceNotesProvider>
                              <MessageProvider>
                                <RootLayoutNav />
                              </MessageProvider>
                            </VoiceNotesProvider>
                          </PeopleProvider>
                        </SubscriptionProvider>
                      </WarmthSettingsProvider>
                    </OnboardingProvider>
                  </AuthProvider>
                </AppSettingsProvider>
              </View>
            ) : (
              <GestureHandlerRootView style={styles.gestureHandler}>
                <AppSettingsProvider>
                  <AuthProvider>
                    <OnboardingProvider>
                      <WarmthSettingsProvider>
                        <SubscriptionProvider>
                          <PeopleProvider>
                            <VoiceNotesProvider>
                              <MessageProvider>
                                <RootLayoutNav />
                              </MessageProvider>
                            </VoiceNotesProvider>
                          </PeopleProvider>
                        </SubscriptionProvider>
                      </WarmthSettingsProvider>
                    </OnboardingProvider>
                  </AuthProvider>
                </AppSettingsProvider>
              </GestureHandlerRootView>
            )}
          </trpc.Provider>
        </PostHogProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
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
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gestureHandler: {
    flex: 1,
  },
});