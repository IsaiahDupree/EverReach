// hooks/useScreenTracking.ts
// Global screen view + duration tracking for expo-router

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import Analytics from '@/lib/analytics';

export function useScreenTracking() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | undefined>(undefined);
  const startRef = useRef<number>(Date.now());

  // Track route changes
  useEffect(() => {
    const now = Date.now();

    // Send duration for the previous screen (if any)
    if (prevPathRef.current) {
      const durationMs = now - startRef.current;
      Analytics.track(Analytics.EVENTS.SCREEN_DURATION, {
        screen_name: prevPathRef.current,
        duration_ms: durationMs,
      });
    }

    // Track new screen
    Analytics.screen(pathname, { previous_screen: prevPathRef.current });
    prevPathRef.current = pathname;
    startRef.current = now;
  }, [pathname]);

  // Track time spent when app is backgrounded
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && prevPathRef.current) {
        const now = Date.now();
        const durationMs = now - startRef.current;
        Analytics.track(Analytics.EVENTS.SCREEN_DURATION, {
          screen_name: prevPathRef.current,
          duration_ms: durationMs,
          reason: 'app_state_change',
        });
        startRef.current = now;
      }
    });

    return () => sub.remove();
  }, []);
}
