import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProviderV2';

export type AuthGateProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
};

/**
 * AuthGate
 *
 * Optional wrapper to protect any subtree that requires authentication.
 * Root routing already gates by session in app/_layout.tsx, but this is
 * useful for nested modals/routes or conditional areas.
 */
export default function AuthGate({
  children,
  fallback,
  redirectTo = '/sign-in',
  requireAuth = true,
}: AuthGateProps) {
  const auth = useAuth?.();
  // Graceful fallback if provider hasn't mounted yet or crashed previously
  if (!auth) {
    return (
      fallback ?? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      )
    );
  }
  const { loading, session } = auth;
  const router = useRouter();

  useEffect(() => {
    if (!loading && requireAuth && !session) {
      try {
        router.replace(redirectTo as any);
      } catch (e) {
        console.error('[AuthGate] Navigation error:', e);
      }
    }
  }, [loading, requireAuth, session, router, redirectTo]);

  if (loading) {
    return (
      fallback ?? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      )
    );
  }

  if (requireAuth && !session) {
    return (
      fallback ?? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      )
    );
  }

  return <>{children}</>;
}
