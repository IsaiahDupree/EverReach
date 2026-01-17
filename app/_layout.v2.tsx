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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PeopleProvider } from "@/providers/PeopleProvider";
import { VoiceNotesProvider } from "@/providers/VoiceNotesProvider";
import { MessageProvider } from "@/providers/MessageProvider";
import { InteractionsProvider } from "@/providers/InteractionsProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { AppSettingsProvider } from "@/providers/AppSettingsProvider";
import { WarmthSettingsProvider } from "@/providers/WarmthSettingsProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
// TemplatesProvider and ThemeProvider removed - not used in this app
import { trpc, trpcClient } from "@/lib/trpc";
import SignIn from "./sign-in";
import OnboardingFlow from "./onboarding";
import { View, ActivityIndicator, StyleSheet, Text, Platform } from "react-native";

SplashScreen.preventAutoHideAsync().catch(() => {});

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

/**
 * Navigation component - just checks auth state
 */
function RootLayoutNav() {
  const { loading, user } = useAuth();
  const { isCompleted: onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  const isAuthenticated = !!user;

  const isLoading = loading || onboardingLoading;

  console.log('[Layout v2] State:', {
    loading,
    isAuthenticated,
    onboardingCompleted,
  });

  // Show loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show sign-in if not authenticated
  if (!isAuthenticated) {
    console.log('[Layout v2] → Sign In');
    return <SignIn />;
  }

  // Show onboarding for first-time users
  const isOnboardingDisabled = process.env.EXPO_PUBLIC_DISABLE_ONBOARDING === 'true';
  if (!onboardingCompleted && !isOnboardingDisabled) {
    console.log('[Layout v2] → Onboarding');
    return <OnboardingFlow />;
  }

  // Show main app
  console.log('[Layout v2] → Main App');
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-contact" options={{ presentation: "modal", headerShown: true, title: "Add Contact" }} />
      <Stack.Screen name="contact/[id]" options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="voice-note" options={{ presentation: "modal", headerShown: true, title: "Voice Note" }} />
      <Stack.Screen name="message-results" options={{ presentation: "modal", headerShown: true, title: "Generated Messages" }} />
      <Stack.Screen name="goal-picker" options={{ presentation: "modal", headerShown: true, title: "Pick Goal" }} />
      <Stack.Screen name="warmth-settings" options={{ headerShown: true, title: "Warmth Settings" }} />
      <Stack.Screen name="personal-notes" options={{ headerShown: true, title: "Personal Notes" }} />
      <Stack.Screen name="contact-notes/[id]" options={{ headerShown: true, title: "Contact Notes" }} />
      <Stack.Screen name="import-contacts" options={{ headerShown: true, title: "Import Contacts" }} />
      <Stack.Screen name="mode-settings" options={{ headerShown: true, title: "Mode Settings" }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications" }} />
      <Stack.Screen name="contact-context/[id]" options={{ headerShown: true, title: "Contact Context" }} />
      
      {/* Test/Debug screens */}
      <Stack.Screen name="openai-test" options={{ presentation: "modal", headerShown: true }} />
      <Stack.Screen name="supabase-test" options={{ presentation: "modal", headerShown: true }} />
      <Stack.Screen name="api-test-suite" options={{ presentation: "modal", headerShown: true }} />
      <Stack.Screen name="trpc-test" options={{ presentation: "modal", headerShown: true }} />
    </Stack>
  );
}

/**
 * Root layout with providers
 */
export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const providers = (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AppSettingsProvider>
          <AuthProvider>
            <OnboardingProvider>
              <WarmthSettingsProvider>
                <SubscriptionProvider>
                  <PeopleProvider>
                    <InteractionsProvider>
                      <VoiceNotesProvider>
                        <MessageProvider>
                          <RootLayoutNav />
                        </MessageProvider>
                      </VoiceNotesProvider>
                    </InteractionsProvider>
                  </PeopleProvider>
                </SubscriptionProvider>
              </WarmthSettingsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </AppSettingsProvider>
      </trpc.Provider>
    </QueryClientProvider>
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
