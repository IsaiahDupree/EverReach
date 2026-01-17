/**
 * Analytics Client
 * Unified interface for event tracking across platforms
 */

import { PostHog } from 'posthog-node';
import { createClient } from '@supabase/supabase-js';
import type { AnalyticsEvent, EventProperties, EventContext } from './events';
import { isCriticalEvent, getEventCategory } from './events';

// PostHog client (server-side)
let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (!process.env.POSTHOG_PROJECT_KEY) {
    console.warn('[Analytics] PostHog key not configured');
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_PROJECT_KEY, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    });
  }

  return posthogClient;
}

// Supabase client (for event mirroring)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Track an analytics event
 */
export async function trackEvent<T extends AnalyticsEvent>(
  event: T,
  properties: EventProperties[T],
  context: EventContext = { platform: 'web' }
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const distinctId = context.user_id || context.anonymous_id || 'unknown';

    // Send to PostHog
    const ph = getPostHogClient();
    if (ph) {
      ph.capture({
        distinctId,
        event,
        properties: {
          ...context,
          ...properties,
          timestamp,
          event_category: getEventCategory(event),
        },
      });
    }

    // Mirror critical events to Supabase
    if (isCriticalEvent(event) && supabase) {
      await mirrorEventToSupabase(event, properties, context, timestamp);
    }
  } catch (error) {
    // Never throw on analytics failures
    console.error('[Analytics] Failed to track event:', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Identify a user
 */
export async function identifyUser(
  userId: string,
  properties: Record<string, any> = {}
): Promise<void> {
  try {
    const ph = getPostHogClient();
    if (ph) {
      ph.identify({
        distinctId: userId,
        properties: {
          ...properties,
          identified_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Alias user (link anonymous ID to user ID)
 */
export async function aliasUser(
  userId: string,
  anonymousId: string
): Promise<void> {
  try {
    const ph = getPostHogClient();
    if (ph) {
      ph.alias({
        distinctId: userId,
        alias: anonymousId,
      });
    }
  } catch (error) {
    console.error('[Analytics] Failed to alias user:', error);
  }
}

/**
 * Mirror event to Supabase for product analytics
 */
async function mirrorEventToSupabase(
  event: AnalyticsEvent,
  properties: any,
  context: EventContext,
  timestamp: string
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('app_events').insert({
      event_name: event,
      user_id: context.user_id || null,
      anonymous_id: context.anonymous_id || null,
      occurred_at: timestamp,
      context: {
        platform: context.platform,
        app_version: context.app_version,
        device_type: context.device_type,
        plan_tier: context.plan_tier,
        utm_source: context.utm_source,
        utm_medium: context.utm_medium,
        utm_campaign: context.utm_campaign,
      },
      properties,
    });
  } catch (error) {
    console.error('[Analytics] Failed to mirror event to Supabase:', error);
  }
}

/**
 * Flush pending events (call on app shutdown)
 */
export async function flushEvents(): Promise<void> {
  const ph = getPostHogClient();
  if (ph) {
    await ph.shutdown();
  }
}

/**
 * Track API request
 */
export async function trackApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
  userId?: string
): Promise<void> {
  await trackEvent('api_call_completed', {
    endpoint,
    method,
    status_code: statusCode,
    duration_ms: durationMs,
  }, {
    platform: 'web',
    user_id: userId,
  });

  // Track slow API calls separately
  const threshold = 2000; // 2 seconds
  if (durationMs > threshold) {
    await trackEvent('slow_api_call', {
      endpoint,
      duration_ms: durationMs,
      threshold_ms: threshold,
    }, {
      platform: 'web',
      user_id: userId,
    });
  }
}

/**
 * Track screen render
 */
export async function trackScreenRender(
  screenName: string,
  renderTimeMs: number,
  userId?: string
): Promise<void> {
  await trackEvent('screen_rendered', {
    screen_name: screenName,
    render_time_ms: renderTimeMs,
  }, {
    platform: 'web',
    user_id: userId,
  });

  // Track slow renders
  const threshold = 1000; // 1 second
  if (renderTimeMs > threshold) {
    await trackEvent('slow_screen_render', {
      screen_name: screenName,
      render_time_ms: renderTimeMs,
      threshold_ms: threshold,
    }, {
      platform: 'web',
      user_id: userId,
    });
  }
}

/**
 * Batch track multiple events
 */
export async function trackEventBatch(
  events: Array<{
    event: AnalyticsEvent;
    properties: any;
    context?: EventContext;
  }>
): Promise<void> {
  for (const { event, properties, context } of events) {
    await trackEvent(event as any, properties, context);
  }
}
