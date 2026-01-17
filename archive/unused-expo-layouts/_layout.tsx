import { Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import { AppSettingsProvider, useAppSettings } from "@/providers/AppSettingsProvider";
import { AuthProvider } from "@/providers/AuthProviderV2";
import { PeopleProvider } from "@/providers/PeopleProvider";
import { MessageProvider } from "@/providers/MessageProvider";
import { InteractionsProvider } from "@/providers/InteractionsProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { WarmthSettingsProvider } from "@/providers/WarmthSettingsProvider";
import { VoiceNotesProvider } from "@/providers/VoiceNotesProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { AnalyticsProvider } from "@/providers/AnalyticsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TemplatesContext } from "@/providers/TemplatesProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc, getBaseUrl } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { FLAGS } from "@/constants/flags";
import { initializePostHog } from "@/lib/posthog";
import ErrorBoundary from "@/components/ErrorBoundary";

function RootLayoutNav() {
  const { theme } = useAppSettings();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600' as const,
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-contact"
        options={{
          headerShown: true,
          title: "Add Contact",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="contact/[id]"
        options={{
          headerShown: true,
          title: "",
        }}
      />
      <Stack.Screen
        name="voice-note"
        options={{
          headerShown: true,
          title: "Voice Note",
          presentation: "modal",
        }}
      />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen
        name="message-results"
        options={{
          headerShown: true,
          title: "Generated Messages",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="goal-picker"
        options={{
          headerShown: true,
          title: "Pick Goal",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="warmth-settings"
        options={{
          headerShown: true,
          title: "Warmth Settings",
        }}
      />
      <Stack.Screen
        name="personal-notes"
        options={{
          headerShown: true,
          title: "Personal Notes",
        }}
      />
      <Stack.Screen
        name="contact-notes/[id]"
        options={{
          headerShown: true,
          title: "Contact Notes",
        }}
      />
      <Stack.Screen
        name="import-contacts"
        options={{
          headerShown: true,
          title: "Import Contacts",
        }}
      />
      <Stack.Screen
        name="mode-settings"
        options={{
          headerShown: true,
          title: "Mode Settings",
        }}
      />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: "Notifications",
        }}
      />
      <Stack.Screen
        name="chat-intro"
        options={{
          headerShown: true,
          title: "Chat",
        }}
      />
      <Stack.Screen
        name="contact-context/[id]"
        options={{
          headerShown: true,
          title: "Contact Context",
        }}
      />
      <Stack.Screen
        name="contact-history/[id]"
        options={{
          headerShown: true,
          title: "Contact History",
        }}
      />
      <Stack.Screen
        name="trpc-test"
        options={{
          headerShown: true,
          title: "tRPC Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="auth-v2-test"
        options={{
          headerShown: true,
          title: "Auth v2 Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="warmth-alerts-test"
        options={{
          headerShown: true,
          title: "Warmth Alerts Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="feature-request"
        options={{
          headerShown: true,
          title: "Feature Request",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="message-templates"
        options={{
          headerShown: true,
          title: "Message Templates",
        }}
      />
      <Stack.Screen
        name="message-sent-success"
        options={{
          headerShown: true,
          title: "Message Sent",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="subscription-plans"
        options={{
          headerShown: true,
          title: "Subscription Plans",
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerShown: true,
          title: "Privacy Policy",
        }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{
          headerShown: true,
          title: "Terms of Service",
        }}
      />
      <Stack.Screen
        name="openai-test"
        options={{
          headerShown: true,
          title: "OpenAI Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="health-status"
        options={{
          headerShown: true,
          title: "API Health Dashboard",
        }}
      />
      <Stack.Screen
        name="supabase-test"
        options={{
          headerShown: true,
          title: "Supabase Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="audio-test"
        options={{
          headerShown: true,
          title: "Audio Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="contact-import-test"
        options={{
          headerShown: true,
          title: "Contact Import Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="api-test-suite"
        options={{
          headerShown: true,
          title: "API Test Suite",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="notes-test"
        options={{
          headerShown: true,
          title: "Notes API Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="contact-save-test"
        options={{
          headerShown: true,
          title: "Contact Save Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="contacts-load-test"
        options={{
          headerShown: true,
          title: "Contacts Load Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="supabase-debug"
        options={{
          headerShown: true,
          title: "Supabase Debug",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="concierge-demo"
        options={{
          headerShown: true,
          title: "Concierge Demo",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="agent-chat-test"
        options={{
          headerShown: true,
          title: "Agent Chat Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="local-only"
        options={{
          headerShown: true,
          title: "Local Only Mode",
        }}
      />
      <Stack.Screen
        name="dashboard-test"
        options={{
          headerShown: true,
          title: "Dashboard Test",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="analytics-consent"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initializePostHog().catch(err => {
      console.error('[App] PostHog initialization failed:', err);
    });
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          async headers() {
            const baseHeaders = {
              Accept: "application/json",
              "Content-Type": "application/json",
            } as Record<string, string>;

            try {
              if (!FLAGS.LOCAL_ONLY && supabase) {
                const { data } = await supabase.auth.getSession();
                const token = data?.session?.access_token;
                if (token) {
                  baseHeaders.Authorization = `Bearer ${token}`;
                }
              }
            } catch (error) {
              console.warn('[tRPC] Failed to get auth token:', error);
            }

            return baseHeaders;
          },
        }),
      ],
    })
  );

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppSettingsProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <WarmthSettingsProvider>
                  <TemplatesContext>
                    <PeopleProvider>
                      <MessageProvider>
                        <InteractionsProvider>
                          <OnboardingProvider>
                            <VoiceNotesProvider>
                              <AnalyticsProvider>
                                <RootLayoutNav />
                              </AnalyticsProvider>
                            </VoiceNotesProvider>
                          </OnboardingProvider>
                        </InteractionsProvider>
                      </MessageProvider>
                    </PeopleProvider>
                  </TemplatesContext>
                </WarmthSettingsProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </AppSettingsProvider>
        </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}