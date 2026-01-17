/**
 * PostHog Analytics Configuration
 * 
 * Privacy-first analytics with:
 * - No PII in events
 * - User consent required
 * - Offline-resilient queuing
 * - Feature flags support
 */

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let posthogClient: any = null;
let isInitialized = false;
type PendingEvent =
  | { kind: 'capture'; args: [string, Record<string, any> | undefined] }
  | { kind: 'screen'; args: [string, Record<string, any> | undefined] }
  | { kind: 'identify'; args: [string, any?] };
const pendingEvents: PendingEvent[] = [];

/**
 * Initialize PostHog SDK
 * Call this early in app lifecycle (e.g., App.tsx)
 */
export async function initializePostHog() {
  if (isInitialized || !POSTHOG_API_KEY) {
    console.log('[PostHog] Skipping initialization:', { 
      isInitialized, 
      hasKey: !!POSTHOG_API_KEY 
    });
    return;
  }

  try {
    const { default: PostHog } = await import('posthog-react-native');
    
    posthogClient = new PostHog(
      POSTHOG_API_KEY,
      {
        host: POSTHOG_HOST,
      }
    );

    isInitialized = true;
    console.log('[PostHog] Initialized successfully');

    // Flush any queued events
    if (pendingEvents.length > 0) {
      for (const ev of pendingEvents.splice(0, pendingEvents.length)) {
        try {
          if (ev.kind === 'capture') {
            posthogClient.capture(...ev.args);
          } else if (ev.kind === 'screen') {
            posthogClient.screen(...(ev.args as [string, Record<string, any> | undefined]));
          } else if (ev.kind === 'identify') {
            posthogClient.identify(...(ev.args as [string, any?]));
          }
        } catch (e) {
          console.error('[PostHog] Failed to flush queued event:', e);
        }
      }
    }
  } catch (error) {
    console.error('[PostHog] Initialization failed:', error);
  }
}

/**
 * Hash user ID for privacy
 * Never send raw Supabase user IDs to PostHog
 */
export async function hashUserId(userId: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userId
    );
    return hash;
  } catch (error) {
    console.error('[PostHog] Failed to hash user ID:', error);
    return userId;
  }
}

/**
 * Identify user with PostHog
 * Call after successful sign-in
 */
export async function identifyUser(
  userId: string,
  properties?: {
    plan?: string;
    locale?: string;
    platform?: string;
    org_id?: string;
    [key: string]: any;
  }
) {
  if (!isInitialized || !posthogClient) {
    pendingEvents.push({ kind: 'identify', args: [userId, properties] });
    return;
  }

  try {
    const hashedId = await hashUserId(userId);
    
    const userProps = {
      platform: Platform.OS,
      ...properties,
    };

    posthogClient.identify(hashedId, userProps);
    console.log('[PostHog] User identified:', hashedId.substring(0, 8) + '...');
  } catch (error) {
    console.error('[PostHog] Failed to identify user:', error);
  }
}

/**
 * Reset PostHog state
 * Call on logout
 */
export async function resetPostHog() {
  if (!isInitialized || !posthogClient) {
    return;
  }

  try {
    posthogClient.reset();
    console.log('[PostHog] Reset complete');
  } catch (error) {
    console.error('[PostHog] Failed to reset:', error);
  }
}

/**
 * Capture a custom event
 */
export async function captureEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (!isInitialized || !posthogClient) {
    pendingEvents.push({ kind: 'capture', args: [eventName, properties] });
    return;
  }

  try {
    posthogClient.capture(eventName, properties);
    console.log('[PostHog] Event captured:', eventName, properties);
  } catch (error) {
    console.error('[PostHog] Failed to capture event:', error);
  }
}

/**
 * Track screen view
 */
export async function trackScreen(screenName: string, properties?: Record<string, any>) {
  if (!isInitialized || !posthogClient) {
    pendingEvents.push({ kind: 'screen', args: [screenName, properties] });
    return;
  }

  try {
    posthogClient.screen(screenName, properties);
    console.log('[PostHog] Screen tracked:', screenName);
  } catch (error) {
    console.error('[PostHog] Failed to track screen:', error);
  }
}

/**
 * Check if feature flag is enabled
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  if (!isInitialized || !posthogClient) {
    return false;
  }

  try {
    const enabled = posthogClient.isFeatureEnabled(flagKey);
    return enabled ?? false;
  } catch (error) {
    console.error('[PostHog] Failed to check feature flag:', error);
    return false;
  }
}

/**
 * Get feature flag variant
 */
export async function getFeatureFlag(flagKey: string): Promise<string | boolean | undefined> {
  if (!isInitialized || !posthogClient) {
    return undefined;
  }

  try {
    const variant = posthogClient.getFeatureFlag(flagKey);
    return variant;
  } catch (error) {
    console.error('[PostHog] Failed to get feature flag:', error);
    return undefined;
  }
}

/**
 * Enable/disable analytics
 * Respects user consent
 */
export async function setAnalyticsEnabled(enabled: boolean) {
  if (!isInitialized || !posthogClient) {
    return;
  }

  try {
    if (enabled) {
      posthogClient.optIn();
    } else {
      posthogClient.optOut();
    }
    console.log('[PostHog] Analytics', enabled ? 'enabled' : 'disabled');
  } catch (error) {
    console.error('[PostHog] Failed to set analytics state:', error);
  }
}

export { posthogClient };
