import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'text-encoding-polyfill';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LogBox,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/AuthProviderV2';
import { supabase } from '@/lib/supabase';
import Auth from './auth';
import SunTraceOnboarding from './onboarding-suntrace';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: { retry: false },
  },
});

type SunProfileState = 'idle' | 'loading' | 'missing' | 'ready';

function LoadingScreen({ label = 'Loading SunTrace…' }: { label?: string }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#F59E0B" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function AppStack() {
  const screenOptions = useMemo(
    () => ({ headerShown: false, headerBackTitle: '' }),
    [],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="auth/forgot-password" />
      <Stack.Screen name="auth/reset-password" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="session" />
      <Stack.Screen name="privacy-policy" options={{ headerShown: true, title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ headerShown: true, title: 'Terms & Conditions' }} />
    </Stack>
  );
}

function RootLayoutNav() {
  const { loading, isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const [profileState, setProfileState] = useState<SunProfileState>('idle');

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !user) {
      setProfileState('idle');
      return () => {
        cancelled = true;
      };
    }

    setProfileState('loading');
    supabase
      .from('sun_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[SunTrace] Could not read profile:', error.message);
        }
        setProfileState(data ? 'ready' : 'missing');
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    const path = pathname || '/';
    const isPublicRoute =
      path.startsWith('/auth/forgot-password') ||
      path.startsWith('/auth/reset-password') ||
      path.startsWith('/auth/callback') ||
      path === '/privacy-policy' ||
      path === '/terms';

    return isPublicRoute ? <AppStack /> : <Auth />;
  }

  if (profileState === 'idle' || profileState === 'loading') {
    return <LoadingScreen />;
  }

  if (profileState === 'missing') {
    return (
      <SunTraceOnboarding
        onComplete={() => setProfileState('ready')}
      />
    );
  }

  return <AppStack />;
}

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 14,
    color: '#CBD5E1',
    fontSize: 15,
  },
});
