/**
 * Backend Analytics Service
 * 
 * Tracks events to PostHog and mirrors critical events to Supabase.
 * Used for server-side event tracking, API monitoring, and state changes.
 */

import { PostHog } from 'posthog-node';
import { mirrorEventToSupabase } from './event-mirror';

// Lazy initialization of PostHog client (only when first used, not at build time)
let _posthog: PostHog | null = null;

function getPostHog(): PostHog | null {
  if (_posthog) return _posthog;
  
  // Don't initialize at build time
  if (!process.env.POSTHOG_PROJECT_KEY) {
    return null;
  }
  
  _posthog = new PostHog(
    process.env.POSTHOG_PROJECT_KEY,
    {
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 20,
      flushInterval: 10000, // 10 seconds
    }
  );
  
  return _posthog;
}

// Export getter for backwards compatibility
export const posthog = {
  get client() {
    return getPostHog();
  }
};

// Complete event catalog (170+ events)
export type EventName = 
  // Auth & Identity
  | 'user_signed_up'
  | 'user_logged_in'
  | 'password_reset_requested'
  | 'password_reset_succeeded'
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_completed'
  // Screenshot
  | 'screenshot_uploaded'
  | 'screenshot_ocr_completed'
  | 'screenshot_analyzed'
  | 'insight_saved'
  // Warmth
  | 'warmth_score_viewed'
  // Engagement
  | 'cta_clicked'
  | 'share_clicked'
  | 'notif_opt_in'
  | 'notif_sent'
  // Monetization
  | 'plan_selected'
  | 'checkout_started'
  | 'checkout_completed'
  // Lifecycle
  | 'app_open'
  | 'app_background'
  | 'app_foregrounded'
  | 'session_start'
  | 'app_crash'
  // Performance
  | 'memory_warning'
  | 'network_state_changed'
  | 'connection_lost'
  | 'app_state_duration'
  | 'performance_budget_exceeded'
  | 'slow_screen_render'
  | 'slow_api_call'
  | 'slow_operation'
  | 'screen_duration'
  // Marketing Funnel
  | 'ad_impression'
  | 'ad_click'
  | 'landing_view'
  | 'lead_captured'
  | 'install_tracked'
  | 'first_open_post_install'
  | 'activation_event'
  | 'qualified_signup'
  // API
  | 'api_request';

export interface EventContext {
  // User
  user_id?: string;
  anonymous_id?: string;
  
  // Platform
  platform?: 'web' | 'ios' | 'android' | 'backend';
  app_version?: string;
  build_number?: string;
  device_locale?: string;
  timezone?: string;
  release_channel?: string;
  
  // Marketing
  campaign?: string;
  source?: string;
  medium?: string;
  
  // User properties
  account_age_days?: number;
  plan_tier?: string;
  warmth_segment?: string;
  
  // Session
  session_id?: string;
  request_id?: string;
  
  // Custom
  [key: string]: unknown;
}

/**
 * Track an event to PostHog and optionally mirror to Supabase
 */
export async function trackEvent(
  eventName: EventName,
  userId: string | null,
  properties: Record<string, any> = {},
  context: EventContext = {}
): Promise<void> {
  try {
    const distinctId = userId || context.anonymous_id || 'backend';

    // Send to PostHog
    const client = posthog.client;
    if (client) {
      client.capture({
        distinctId,
        event: eventName,
        properties: {
          ...context,
          ...properties,
          timestamp: new Date().toISOString(),
          $set: userId ? { user_id: userId } : undefined,
        },
      });
    }

    // Mirror critical events to Supabase for product analytics
    if (isCriticalEvent(eventName)) {
      await mirrorEventToSupabase(
        eventName,
        userId,
        context.anonymous_id || null,
        properties,
        context
      );
    }
  } catch (error) {
    // Never throw on tracking failures - log and continue
    console.error('[Analytics] Failed to track event:', {
      event: eventName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Identify a user with properties
 */
export function identifyUser(userId: string, properties: Record<string, any> = {}): void {
  try {
    const client = posthog.client;
    if (!client) return;
    
    client.identify({
      distinctId: userId,
      properties: {
        ...properties,
        $set: properties,
      },
    });
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Alias an anonymous user to an identified user
 */
export function aliasUser(anonymousId: string, userId: string): void {
  try {
    const client = posthog.client;
    if (!client) return;
    
    client.alias({
      distinctId: userId,
      alias: anonymousId,
    });
  } catch (error) {
    console.error('[Analytics] Failed to alias user:', {
      anonymousId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Flush events immediately (useful before shutdown)
 */
export async function flushEvents(): Promise<void> {
  try {
    const client = posthog.client;
    if (!client) return;
    await client.flush();
  } catch (error) {
    console.error('[Analytics] Failed to flush events:', error);
  }
}

/**
 * Graceful shutdown - flush all pending events
 */
export async function shutdownAnalytics(): Promise<void> {
  try {
    console.log('[Analytics] Shutting down...');
    const client = posthog.client;
    if (!client) return;
    await client.shutdown();
    console.log('[Analytics] Shutdown complete');
  } catch (error) {
    console.error('[Analytics] Error during shutdown:', error);
  }
}

// Register shutdown handlers
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    await shutdownAnalytics();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownAnalytics();
    process.exit(0);
  });
}

/**
 * Check if an event should be mirrored to Supabase
 */
function isCriticalEvent(eventName: EventName): boolean {
  const CRITICAL_EVENTS: EventName[] = [
    'user_signed_up',
    'user_logged_in',
    'password_reset_succeeded',
    'screenshot_uploaded',
    'screenshot_analyzed',
    'checkout_completed',
    'onboarding_completed',
  ];

  return CRITICAL_EVENTS.includes(eventName);
}

// Convenience namespaces for organized tracking
export const auth = {
  signup: (userId: string, method: string, planTier?: string) =>
    trackEvent('user_signed_up', userId, { method, plan_tier: planTier }),

  login: (userId: string, method: string) =>
    trackEvent('user_logged_in', userId, { method }),

  passwordResetRequested: (emailProvided: boolean) =>
    trackEvent('password_reset_requested', null, { email_provided: emailProvided, method: 'email' }),

  passwordResetSucceeded: (userId: string) =>
    trackEvent('password_reset_succeeded', userId, {}),
};

export const screenshot = {
  uploaded: (userId: string, screenshotId: string, metadata: { file_size: number; mime_type: string; width: number; height: number }) =>
    trackEvent('screenshot_uploaded', userId, { screenshot_id: screenshotId, ...metadata }),

  ocrCompleted: (userId: string, screenshotId: string, textLength: number, confidence: number, processingTimeMs: number) =>
    trackEvent('screenshot_ocr_completed', userId, {
      screenshot_id: screenshotId,
      extracted_text_length: textLength,
      confidence,
      processing_time_ms: processingTimeMs,
    }),

  analyzed: (userId: string, screenshotId: string, entitiesFound: number, insightsCount: number, processingTimeMs: number) =>
    trackEvent('screenshot_analyzed', userId, {
      screenshot_id: screenshotId,
      entities_found: entitiesFound,
      insights_count: insightsCount,
      processing_time_ms: processingTimeMs,
    }),
};

export const api = {
  request: (userId: string | null, metadata: {
    request_id: string;
    method: string;
    route: string;
    status_code: number;
    duration_ms: number;
    user_agent?: string;
    ip?: string;
  }) => trackEvent('api_request', userId, metadata),
};

export default {
  trackEvent,
  identifyUser,
  aliasUser,
  flushEvents,
  shutdownAnalytics,
  auth,
  screenshot,
  api,
};
