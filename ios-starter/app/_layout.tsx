/**
 * Root App Layout
 * Feature: IOS-NAV-001
 *
 * The root layout component that:
 * - Wraps the entire app with necessary providers (AuthProvider)
 * - Manages global navigation using Expo Router's Slot
 * - Implements authentication-based routing
 * - Redirects users to appropriate screens based on auth state
 *
 * Navigation Structure:
 * - If not authenticated -> redirect to (auth) group
 * - If authenticated -> allow access to (tabs) group
 *
 * @module app/_layout
 */

import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuthContext } from '../providers/AuthProvider';

/**
 * Navigation Guard Component
 *
 * Handles authentication-based redirects.
 * Monitors auth state and segments to redirect users appropriately.
 */
function NavigationGuard() {
  const { user, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while auth state is loading
    if (loading) {
      return;
    }

    // Check if we're in the auth group
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth group
      // Redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // User is authenticated but still in auth group
      // Redirect to main app (tabs)
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  return <Slot />;
}

/**
 * Root Layout Component
 *
 * Wraps the entire application with providers and sets up navigation.
 * This is the entry point for all app screens.
 *
 * Provider Hierarchy:
 * 1. AuthProvider - Provides authentication state and methods
 * 2. NavigationGuard - Handles auth-based redirects
 * 3. Slot - Renders the current route
 *
 * @example
 * App structure:
 * ```
 * _layout (this file)
 *   ├── (auth)/_layout
 *   │   ├── login
 *   │   ├── signup
 *   │   └── forgot-password
 *   └── (tabs)/_layout
 *       ├── index
 *       ├── search
 *       └── settings
 * ```
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}
