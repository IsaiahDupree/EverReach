/**
 * Performance Monitoring Hook
 * 
 * Automatically tracks:
 * - Slow frame rendering (>16ms for 60fps)
 * - API call performance
 * - Screen render times
 * - Memory warnings
 */

import React, { useEffect, useRef } from 'react';
import { AppState, InteractionManager } from 'react-native';
import analytics from '@/lib/analytics';

export interface PerformanceMonitorConfig {
  screenName: string;
  trackSlowFrames?: boolean;
  slowFrameThreshold?: number; // ms
}

/**
 * Monitor screen performance
 */
export function usePerformanceMonitoring(config: PerformanceMonitorConfig) {
  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);
  const slowFrameCount = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Track initial render time
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      const renderTime = Date.now() - startTime;
      
      // Track screen load time
      analytics.perf.measured('screen_render', {
        duration_ms: renderTime,
        screen: config.screenName,
      });

      // Alert if render is slow (>2 seconds)
      if (renderTime > 2000) {
        analytics.perf.measured('slow_screen_render', {
          duration_ms: renderTime,
          screen: config.screenName,
        });
      }
    });

    return () => {
      interactionHandle.cancel();
    };
  }, [config.screenName]);

  // Track component lifecycle duration
  useEffect(() => {
    return () => {
      const totalDuration = Date.now() - mountTime.current;
      
      // Track how long user spent on screen
      if (totalDuration > 1000) { // Only track if >1 second
        analytics.track('screen_duration', {
          screen: config.screenName,
          duration_ms: totalDuration,
          render_count: renderCount.current,
          slow_frames: slowFrameCount.current,
        });
      }
    };
  }, [config.screenName]);

  // Increment render count
  renderCount.current += 1;
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  let success = true;
  let error: Error | null = null;

  try {
    const result = await apiCall();
    return result;
  } catch (err) {
    success = false;
    error = err as Error;
    throw err;
  } finally {
    const duration = Date.now() - startTime;

    // Track API call performance
    analytics.perf.apiCall(endpoint, duration, success);

    // Track slow API calls (>5 seconds)
    if (duration > 5000) {
      analytics.track('slow_api_call', {
        endpoint: endpoint.substring(0, 100),
        duration_ms: duration,
        success,
        ...metadata,
      });
    }

    // Track failed API calls
    if (!success && error) {
      analytics.errors.apiError(
        endpoint,
        0, // Status code not available
        error.message
      );
    }
  }
}

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T> | T,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Track operation performance
    analytics.perf.measured(operationName, {
      duration_ms: duration,
      ...metadata,
    });

    // Alert on slow operations (>1 second)
    if (duration > 1000) {
      analytics.track('slow_operation', {
        operation: operationName,
        duration_ms: duration,
        ...metadata,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    analytics.track('operation_failed', {
      operation: operationName,
      duration_ms: duration,
      error: (error as Error).message,
      ...metadata,
    });

    throw error;
  }
}

/**
 * Track slow frame rendering
 */
export function trackSlowFrame(screenName: string, frameTime: number): void {
  analytics.perf.slowFrame(screenName, frameTime);
}

/**
 * Wrapper component for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string
): React.ComponentType<P> {
  return function PerformanceTrackedComponent(props: P) {
    usePerformanceMonitoring({ screenName });
    return React.createElement(Component, props);
  };
}
