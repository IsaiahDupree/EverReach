/**
 * Analytics Hook (Mobile)
 * React Native wrapper for PostHog
 */

import { useEffect, useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/providers/AuthProvider';
import type { AnalyticsEvent, EventProperties, EventContext } from '@/types/analytics';

export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useAuth();

  // Identify user on auth change
  useEffect(() => {
    if (user && posthog) {
      posthog.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    }
  }, [user, posthog]);

  // Track event
  const track = useCallback(
    <T extends AnalyticsEvent>(
      event: T,
      properties?: EventProperties[T],
      customContext?: Partial<EventContext>
    ) => {
      if (!posthog) return;

      try {
        const context: EventContext = {
          platform: 'ios', // or 'android' based on Platform.OS
          user_id: user?.id,
          ...customContext,
        };

        posthog.capture(event, {
          ...context,
          ...properties,
        });
      } catch (error) {
        console.error('[Analytics] Track error:', error);
      }
    },
    [posthog, user]
  );

  // Track screen view
  const trackScreen = useCallback(
    (screenName: string) => {
      if (!posthog) return;
      
      posthog.screen(screenName);
    },
    [posthog]
  );

  // Identify user
  const identify = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      if (!posthog) return;
      
      posthog.identify(userId, properties);
    },
    [posthog]
  );

  // Reset on logout
  const reset = useCallback(() => {
    if (!posthog) return;
    
    posthog.reset();
  }, [posthog]);

  return {
    track,
    trackScreen,
    identify,
    reset,
    isEnabled: !!posthog,
  };
}

// Convenience hooks for common events
export function useTrackScreen(screenName: string) {
  const { trackScreen } = useAnalytics();

  useEffect(() => {
    trackScreen(screenName);
  }, [screenName, trackScreen]);
}

export function useTrackEvent<T extends AnalyticsEvent>(
  event: T,
  properties?: EventProperties[T],
  dependencies: any[] = []
) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
