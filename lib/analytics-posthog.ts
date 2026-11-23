/**
 * PostHog Analytics React Hook
 *
 * Simple wrapper around PostHog for React components.
 * For non-React code, use lib/posthog.ts directly.
 *
 * Usage:
 * ```tsx
 * import { useAnalytics } from '@/lib/analytics-posthog';
 *
 * function MyComponent() {
 *   const { track, identify, reset } = useAnalytics();
 *
 *   const handleSignup = async () => {
 *     await identify(userId, { plan: 'free', email: user.email });
 *     await track('user_signed_up', { source: 'email' });
 *   };
 * }
 * ```
 */

import { useCallback } from 'react';
import {
  captureEvent,
  identifyUser,
  resetPostHog,
  trackScreen,
  isFeatureEnabled,
  getFeatureFlag,
} from '@/lib/posthog';

export interface UseAnalyticsHook {
  /**
   * Track an event with optional properties
   */
  track: (eventName: string, properties?: Record<string, any>) => Promise<void>;

  /**
   * Identify the current user
   */
  identify: (userId: string, traits?: Record<string, any>) => Promise<void>;

  /**
   * Reset analytics state (e.g., on logout)
   */
  reset: () => Promise<void>;

  /**
   * Track a screen view
   */
  screen: (screenName: string, properties?: Record<string, any>) => Promise<void>;

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled: (flagKey: string) => Promise<boolean>;

  /**
   * Get feature flag variant
   */
  getFeatureFlag: (flagKey: string) => Promise<string | boolean | undefined>;
}

/**
 * React hook for PostHog analytics
 *
 * Initialize PostHog in your app root first:
 * ```tsx
 * import { initializePostHog } from '@/lib/posthog';
 *
 * export default function App() {
 *   useEffect(() => {
 *     initializePostHog();
 *   }, []);
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useAnalytics(): UseAnalyticsHook {
  const track = useCallback(async (eventName: string, properties?: Record<string, any>) => {
    await captureEvent(eventName, properties);
  }, []);

  const identify = useCallback(async (userId: string, traits?: Record<string, any>) => {
    await identifyUser(userId, traits);
  }, []);

  const reset = useCallback(async () => {
    await resetPostHog();
  }, []);

  const screen = useCallback(async (screenName: string, properties?: Record<string, any>) => {
    await trackScreen(screenName, properties);
  }, []);

  const checkFeatureFlag = useCallback(async (flagKey: string) => {
    return await isFeatureEnabled(flagKey);
  }, []);

  const getFlag = useCallback(async (flagKey: string) => {
    return await getFeatureFlag(flagKey);
  }, []);

  return {
    track,
    identify,
    reset,
    screen,
    isFeatureEnabled: checkFeatureFlag,
    getFeatureFlag: getFlag,
  };
}

/**
 * Standard event names (following PostHog conventions)
 */
export const EVENTS = {
  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Subscription
  TRIAL_STARTED: 'trial_started',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_DISMISSED: 'paywall_dismissed',

  // Features
  FEATURE_VIEWED: 'feature_viewed',
  FEATURE_USED: 'feature_used',
  BUTTON_CLICKED: 'button_clicked',

  // Content
  SCREEN_VIEWED: 'screen_viewed',
  SEARCH_PERFORMED: 'search_performed',
  ITEM_CREATED: 'item_created',
  ITEM_UPDATED: 'item_updated',
  ITEM_DELETED: 'item_deleted',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
