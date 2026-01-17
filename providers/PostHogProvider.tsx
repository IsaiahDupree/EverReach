/**
 * PostHogProvider - Mobile Analytics Provider
 * Wraps the app with PostHog React Native SDK
 */

import React from 'react';
import { PostHogProvider as PostHogRNProvider } from 'posthog-react-native';
import Constants from 'expo-constants';

const POSTHOG_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_POSTHOG_API_KEY || 
                        process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = Constants.expoConfig?.extra?.EXPO_PUBLIC_POSTHOG_HOST || 
                     process.env.EXPO_PUBLIC_POSTHOG_HOST || 
                     'https://us.i.posthog.com';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  // Only initialize PostHog if we have an API key
  if (!POSTHOG_API_KEY) {
    console.warn('[PostHog] API key not found. Analytics disabled.');
    return <>{children}</>;
  }

  return (
    <PostHogRNProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        // Enable autocapture for app lifecycle events
        captureAppLifecycleEvents: true,
        // For privacy, we don't autocapture text inputs or other sensitive interactions
        // Instead, we'll track them manually with proper anonymization
      }}
      autocapture={{
        captureTouches: false, // We'll track manually for better control
        captureScreens: true,
      }}
    >
      {children}
    </PostHogRNProvider>
  );
}
