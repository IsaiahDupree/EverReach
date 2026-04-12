/**
 * SunTrace — Analytics Utility
 *
 * Lightweight event tracker. Uses PostHog (posthog-react-native) when
 * EXPO_PUBLIC_POSTHOG_KEY is configured, otherwise falls back to
 * console.log in development and is a no-op in production.
 *
 * Usage:
 *   import { Analytics, Events } from '@/utils/analytics';
 *
 *   Analytics.track(Events.SESSION_STARTED, { uv_index: 6.2 });
 *   Analytics.identify(userId, { skin_type: 2 });
 */
import PostHog from 'posthog-react-native';

// ── Config ────────────────────────────────────────────────────────────────────

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';
const IS_DEV = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

// ── PostHog client (singleton) ────────────────────────────────────────────────

let _posthog: PostHog | null = null;

function getPostHog(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (!_posthog) {
    _posthog = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Flush immediately in dev for easier debugging; batch in prod
      flushAt: IS_DEV ? 1 : 20,
      flushInterval: IS_DEV ? 0 : 30_000,
    });
  }
  return _posthog;
}

// ── Events dictionary ─────────────────────────────────────────────────────────

export const Events = {
  APP_OPENED: 'app_opened',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SESSION_STARTED: 'session_started',
  SESSION_STOPPED: 'session_stopped',
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_CONVERTED: 'paywall_converted',
  SUBSCRIPTION_PURCHASED: 'subscription_purchased',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// ── Analytics API ─────────────────────────────────────────────────────────────

export const Analytics = {
  /**
   * Track a named event with optional properties.
   */
  track(event: string, properties?: Record<string, unknown>): void {
    const ph = getPostHog();
    if (ph) {
      ph.capture(event, properties);
      return;
    }
    if (IS_DEV) {
      console.log('[Analytics.track]', event, properties ?? {});
    }
  },

  /**
   * Associate the current session with a user ID and optional traits.
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    const ph = getPostHog();
    if (ph) {
      ph.identify(userId, traits);
      return;
    }
    if (IS_DEV) {
      console.log('[Analytics.identify]', userId, traits ?? {});
    }
  },

  /**
   * Reset identity — call on sign-out.
   */
  reset(): void {
    const ph = getPostHog();
    if (ph) {
      ph.reset();
      return;
    }
    if (IS_DEV) {
      console.log('[Analytics.reset]');
    }
  },

  /**
   * Track a screen view.
   */
  screen(screenName: string, properties?: Record<string, unknown>): void {
    const ph = getPostHog();
    if (ph) {
      ph.screen(screenName, properties);
      return;
    }
    if (IS_DEV) {
      console.log('[Analytics.screen]', screenName, properties ?? {});
    }
  },
};
