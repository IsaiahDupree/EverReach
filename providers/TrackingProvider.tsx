/**
 * Privacy-Safe Tracking Provider
 * 
 * Handles:
 * - ATT (App Tracking Transparency) on iOS
 * - Analytics consent management
 * - PostHog opt-in/opt-out
 * - Event tracking with privacy controls
 * - Screen tracking and duration
 * - Experiment exposure logging
 * 
 * Key principles:
 * - Opt-out by default until consent
 * - ATT != analytics consent (separate concerns)
 * - First-party analytics allowed even without ATT
 * - No cross-app tracking without permission
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import PostHog from 'posthog-react-native';
import * as Notifications from 'expo-notifications';

// Type definitions
export interface TrackingConsent {
  analytics: boolean;
  crashReporting: boolean;
  performance: boolean;
  attStatus: 'not-determined' | 'restricted' | 'denied' | 'authorized' | 'n/a';
}

export interface ExperimentVariant {
  experimentKey: string;
  variant: string;
  exposureLogged: boolean;
}

interface TrackingContextValue {
  // Consent state
  consent: TrackingConsent | null;
  consentLoading: boolean;
  
  // Actions
  requestConsent: () => Promise<void>;
  updateConsent: (consent: Partial<TrackingConsent>) => Promise<void>;
  requestATT: () => Promise<void>;
  
  // Event tracking
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  
  // Screen tracking
  trackScreen: (screen: string, properties?: Record<string, any>) => void;
  
  // Experiments
  getExperimentVariant: (experimentKey: string, defaultVariant?: string) => Promise<string>;
  logExperimentExposure: (experimentKey: string, variant: string) => void;
}

const TrackingContext = createContext<TrackingContextValue | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'tracking_consent';
const EXPERIMENTS_STORAGE_KEY = 'experiments';

// Initialize PostHog (opt-out by default)
let posthog: PostHog | null = null;

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<TrackingConsent | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  const currentScreen = useRef<string>('');
  const screenStartTime = useRef<number>(0);
  const appOpenTime = useRef<number>(Date.now());
  
  const pathname = usePathname();

  /**
   * Initialize PostHog SDK
   * 
   * IMPORTANT: Uses SAME project key for both web and mobile in production.
   * This allows cross-platform journey stitching when you call identify()
   * with the same user ID on both platforms.
   * 
   * Separate projects only for: dev/staging vs prod, different data residency
   */
  const initializePostHog = useCallback(async () => {
    if (initialized) return;
    
    try {
      // Initialize PostHog with opt-out by default
      posthog = await PostHog.initAsync(
        process.env.EXPO_PUBLIC_POSTHOG_KEY || 'phc_YOUR_KEY_HERE',
        {
          host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          // Start opted-out until user consents
          optOut: true,
          // Disable autocapture (manual control)
          captureApplicationLifecycleEvents: false,
          captureDeepLinks: false,
        }
      );
      
      // Register super properties (included on every event)
      // This allows PostHog to segment by platform in one unified project
      if (posthog) {
        posthog.register({
          platform: Platform.OS, // 'ios', 'android', or 'web'
          app_version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
          platform_version: Platform.Version,
        });
      }
      
      setInitialized(true);
      console.log('[Tracking] PostHog initialized with platform:', Platform.OS);
    } catch (error) {
      console.error('[Tracking] Failed to initialize PostHog:', error);
    }
  }, [initialized]);

  /**
   * Load saved consent from storage
   */
  const loadConsent = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
      if (saved) {
        const parsed: TrackingConsent = JSON.parse(saved);
        setConsent(parsed);
        
        // Apply consent to PostHog
        if (parsed.analytics && posthog) {
          posthog.optIn();
        }
      } else {
        // No consent yet - default to all false
        setConsent({
          analytics: false,
          crashReporting: false,
          performance: false,
          attStatus: Platform.OS === 'ios' ? 'not-determined' : 'n/a',
        });
      }
    } catch (error) {
      console.error('[Tracking] Failed to load consent:', error);
    } finally {
      setConsentLoading(false);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializePostHog();
    loadConsent();
  }, [initializePostHog, loadConsent]);

  /**
   * Request ATT permission (iOS only)
   */
  const requestATT = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      console.log('[Tracking] ATT not applicable on Android');
      return;
    }

    try {
      // Dynamic import for iOS only
      const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
      const { status } = await requestTrackingPermissionsAsync();
      
      console.log('[Tracking] ATT status:', status);
      
      // Update consent with ATT status
      const newConsent = { ...consent!, attStatus: status };
      setConsent(newConsent);
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newConsent));
      
      // Track ATT decision (if analytics consented)
      if (consent?.analytics && posthog) {
        posthog.capture('att_prompt_response', { status });
      }
    } catch (error) {
      console.error('[Tracking] Failed to request ATT:', error);
    }
  }, [consent]);

  /**
   * Request analytics consent (your own consent UI)
   */
  const requestConsent = useCallback(async () => {
    // This should trigger your consent UI
    // For now, just log
    console.log('[Tracking] Consent UI should be shown');
  }, []);

  /**
   * Update consent preferences
   */
  const updateConsent = useCallback(async (updates: Partial<TrackingConsent>) => {
    const newConsent = { ...consent!, ...updates };
    setConsent(newConsent);
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newConsent));
    
    // Apply to PostHog
    if (posthog) {
      if (newConsent.analytics) {
        posthog.optIn();
        console.log('[Tracking] Analytics opted in');
      } else {
        posthog.optOut();
        console.log('[Tracking] Analytics opted out');
      }
    }
  }, [consent]);

  /**
   * Track event (only if consented)
   */
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    if (!consent?.analytics || !posthog) {
      console.log('[Tracking] Event skipped (no consent):', event);
      return;
    }
    
    try {
      posthog.capture(event, {
        ...properties,
        platform: Platform.OS,
        app_version: process.env.EXPO_PUBLIC_APP_VERSION,
      });
      console.log('[Tracking] Event:', event, properties);
    } catch (error) {
      console.error('[Tracking] Failed to track event:', error);
    }
  }, [consent]);

  /**
   * Identify user (only if consented)
   */
  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    if (!consent?.analytics || !posthog) {
      console.log('[Tracking] Identify skipped (no consent)');
      return;
    }
    
    try {
      posthog.identify(userId, properties);
      console.log('[Tracking] User identified:', userId);
    } catch (error) {
      console.error('[Tracking] Failed to identify:', error);
    }
  }, [consent]);

  /**
   * Reset (on sign out)
   */
  const reset = useCallback(() => {
    if (posthog) {
      posthog.reset();
      console.log('[Tracking] Reset');
    }
  }, []);

  /**
   * Track screen view
   */
  const trackScreen = useCallback((screen: string, properties?: Record<string, any>) => {
    if (!consent?.analytics) return;
    
    const now = Date.now();
    
    // Log duration for previous screen
    if (currentScreen.current && screenStartTime.current) {
      const duration = now - screenStartTime.current;
      track('screen_duration', {
        screen: currentScreen.current,
        screen_time_ms: duration,
      });
    }
    
    // Track new screen
    currentScreen.current = screen;
    screenStartTime.current = now;
    track('screen_viewed', {
      screen,
      from_screen: properties?.from_screen || null,
      ...properties,
    });
  }, [consent, track]);

  /**
   * Get experiment variant (with local storage fallback)
   */
  const getExperimentVariant = useCallback(async (
    experimentKey: string,
    defaultVariant: string = 'A'
  ): Promise<string> => {
    try {
      // Check local storage first
      const stored = await AsyncStorage.getItem(`${EXPERIMENTS_STORAGE_KEY}_${experimentKey}`);
      if (stored) {
        return stored;
      }
      
      // Get from PostHog feature flags (if available)
      if (posthog) {
        const variant = await posthog.getFeatureFlag(experimentKey);
        if (variant) {
          await AsyncStorage.setItem(`${EXPERIMENTS_STORAGE_KEY}_${experimentKey}`, variant as string);
          return variant as string;
        }
      }
      
      // Random assignment if no flag
      const randomVariant = Math.random() < 0.5 ? 'A' : 'B';
      await AsyncStorage.setItem(`${EXPERIMENTS_STORAGE_KEY}_${experimentKey}`, randomVariant);
      return randomVariant;
    } catch (error) {
      console.error('[Tracking] Failed to get experiment variant:', error);
      return defaultVariant;
    }
  }, []);

  /**
   * Log experiment exposure (once per variant)
   */
  const logExperimentExposure = useCallback((experimentKey: string, variant: string) => {
    if (!consent?.analytics) return;
    
    // Check if already logged
    const exposureKey = `${EXPERIMENTS_STORAGE_KEY}_${experimentKey}_exposure_logged`;
    AsyncStorage.getItem(exposureKey).then(logged => {
      if (!logged) {
        track('experiment_exposure', {
          experiment_key: experimentKey,
          variant,
        });
        AsyncStorage.setItem(exposureKey, 'true');
      }
    });
  }, [consent, track]);

  /**
   * Track app lifecycle events
   */
  useEffect(() => {
    if (!consent?.analytics) return;
    
    // Track app opened
    track('app_opened', {
      session_start: appOpenTime.current,
    });
    
    // Track app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        track('app_backgrounded');
      } else if (nextAppState === 'active') {
        track('app_foregrounded');
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [consent, track]);

  /**
   * Track push notifications
   */
  useEffect(() => {
    if (!consent?.analytics) return;
    
    // Track push opened
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      track('push_opened', {
        ...data,
        notification_id: response.notification.request.identifier,
      });
    });
    
    return () => {
      subscription.remove();
    };
  }, [consent, track]);

  /**
   * Track screen changes based on pathname
   */
  useEffect(() => {
    if (!consent?.analytics || !pathname) return;
    
    trackScreen(pathname);
  }, [pathname, consent, trackScreen]);

  const value: TrackingContextValue = {
    consent,
    consentLoading,
    requestConsent,
    updateConsent,
    requestATT,
    track,
    identify,
    reset,
    trackScreen,
    getExperimentVariant,
    logExperimentExposure,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
}

/**
 * useTracking Hook
 */
export function useTracking() {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
}

/**
 * Helper: Track onboarding step
 */
export function useTrackOnboardingStep(stepId: string) {
  const { track } = useTracking();
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    // Viewed
    track('onboarding_step_viewed', { step_id: stepId });
    
    return () => {
      // Completed
      const duration = Date.now() - startTime.current;
      track('onboarding_step_completed', {
        step_id: stepId,
        step_time_ms: duration,
      });
    };
  }, [stepId, track]);
}

/**
 * Helper: Track CTA tap
 */
export function useTrackCTA(ctaId: string) {
  const { track } = useTracking();
  
  return useCallback(() => {
    track('cta_tapped', { cta_id: ctaId });
  }, [ctaId, track]);
}
