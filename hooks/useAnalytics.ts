/**
 * useAnalytics Hook
 * 
 * React hook wrapper for analytics tracking
 * Auto-tracks screen views and provides convenience methods
 * 
 * Usage:
 * ```typescript
 * import { useAnalytics } from '@/hooks/useAnalytics';
 * 
 * function MyScreen() {
 *   const analytics = useAnalytics('MyScreen');
 *   
 *   const handleAction = () => {
 *     analytics.track('button_clicked', { button: 'submit' });
 *   };
 *   
 *   return <View>...</View>;
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { track, screen, performance, SCREENS, EVENTS } from '@/lib/analytics';
import type { TrackProperties, ScreenName, EventName } from '@/lib/analytics';

interface UseAnalyticsOptions {
  /**
   * Auto-track screen view on mount
   * @default true
   */
  autoTrackScreen?: boolean;
  
  /**
   * Auto-track performance metrics
   * @default true
   */
  autoTrackPerformance?: boolean;
  
  /**
   * Additional properties to include with all events
   */
  defaultProperties?: TrackProperties;
  
  /**
   * Screen-specific properties
   */
  screenProperties?: TrackProperties;
}

interface UseAnalyticsReturn {
  /**
   * Track a custom event
   */
  track: (event: EventName, properties?: TrackProperties) => void;
  
  /**
   * Track screen view manually
   */
  trackScreen: (properties?: TrackProperties) => void;
  
  /**
   * Report performance metrics manually
   */
  trackPerformance: (additionalMetrics?: Record<string, any>) => void;
  
  /**
   * Start a timer for measuring duration
   */
  startTimer: (name: string) => void;
  
  /**
   * End a timer and track duration
   */
  endTimer: (name: string, properties?: TrackProperties) => void;
}

/**
 * Analytics hook with auto-tracking
 */
export function useAnalytics(
  screenName: ScreenName,
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
  const {
    autoTrackScreen = true,
    autoTrackPerformance = true,
    defaultProperties = {},
    screenProperties = {},
  } = options;

  const mountTime = useRef(Date.now());
  const timers = useRef<Record<string, number>>({});

  // Auto-track screen view on mount
  useEffect(() => {
    if (autoTrackScreen) {
      screen(screenName, {
        ...defaultProperties,
        ...screenProperties,
      });
    }
  }, [screenName, autoTrackScreen]);

  // Auto-track performance on unmount
  useEffect(() => {
    return () => {
      if (autoTrackPerformance) {
        const loadTime = Date.now() - mountTime.current;
        performance({
          screen: screenName,
          load_time_ms: loadTime,
        });
      }
    };
  }, [screenName, autoTrackPerformance]);

  // Track custom event
  const trackEvent = useCallback((
    event: EventName,
    properties?: TrackProperties
  ) => {
    track(event, {
      screen_name: screenName,
      ...defaultProperties,
      ...properties,
    });
  }, [screenName, defaultProperties]);

  // Track screen manually
  const trackScreenManual = useCallback((properties?: TrackProperties) => {
    screen(screenName, {
      ...defaultProperties,
      ...screenProperties,
      ...properties,
    });
  }, [screenName, defaultProperties, screenProperties]);

  // Track performance manually
  const trackPerformanceManual = useCallback((additionalMetrics?: Record<string, any>) => {
    const loadTime = Date.now() - mountTime.current;
    performance({
      screen: screenName,
      load_time_ms: loadTime,
      ...additionalMetrics,
    });
  }, [screenName]);

  // Start timer
  const startTimer = useCallback((name: string) => {
    timers.current[name] = Date.now();
  }, []);

  // End timer
  const endTimer = useCallback((name: string, properties?: TrackProperties) => {
    const startTime = timers.current[name];
    if (!startTime) {
      console.warn(`[useAnalytics] Timer "${name}" was not started`);
      return;
    }

    const duration = Date.now() - startTime;
    delete timers.current[name];

    trackEvent('timer_measured', {
      timer_name: name,
      duration_ms: duration,
      ...properties,
    });
  }, [trackEvent]);

  return {
    track: trackEvent,
    trackScreen: trackScreenManual,
    trackPerformance: trackPerformanceManual,
    startTimer,
    endTimer,
  };
}

/**
 * Hook for tracking user actions (simplified)
 */
export function useTrackAction() {
  return useCallback((event: EventName, properties?: TrackProperties) => {
    track(event, properties);
  }, []);
}

/**
 * Hook for tracking errors
 */
export function useTrackError(screenName: string) {
  return useCallback((error: Error, context?: Record<string, any>) => {
    track(EVENTS.ERROR_OCCURRED, {
      screen_name: screenName,
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      ...context,
    });
  }, [screenName]);
}

/**
 * Hook for tracking performance
 */
export function useTrackPerformance(screenName: string) {
  const mountTime = useRef(Date.now());

  const trackLoad = useCallback((apiCalls?: number, errors?: string[]) => {
    const loadTime = Date.now() - mountTime.current;
    performance({
      screen: screenName,
      load_time_ms: loadTime,
      api_calls: apiCalls,
      errors,
    });
  }, [screenName]);

  return { trackLoad };
}

export default useAnalytics;
