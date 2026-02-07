/**
 * Auth Stack Layout
 * Feature: IOS-AUTH-008
 *
 * Stack navigation layout for authentication screens including:
 * - Login screen
 * - Signup screen
 * - Forgot password screen
 *
 * Provides:
 * - Stack navigation between auth screens
 * - Back button navigation
 * - Consistent header styling
 *
 * @module app/(auth)/_layout
 */

import React from 'react';
import { Stack } from 'expo-router';

/**
 * Auth Stack Layout Component
 *
 * Configures the navigation stack for all authentication screens.
 * Screens are automatically registered based on files in the (auth) directory.
 *
 * Navigation flow:
 * - Login -> Signup (via "Sign up" link)
 * - Login -> Forgot Password (via "Forgot password?" link)
 * - Signup -> Login (via back button or "Sign in" link)
 * - Forgot Password -> Login (via back button)
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        // Hide header for clean auth UI
        headerShown: false,
        // Enable animations
        animation: 'slide_from_right',
        // Content style
        contentStyle: {
          backgroundColor: '#fff',
        },
      }}
    />
  );
}
