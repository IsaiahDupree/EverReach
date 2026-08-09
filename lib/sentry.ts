/**
 * Sentry crash/error reporting configuration.
 *
 * Distinct from posthog.ts (product analytics): this is the only path in
 * the app that reports JS exceptions, unhandled promise rejections, and
 * native crashes to a service a developer can actually see and get paged
 * on. Call initializeSentry() once, as early as possible, from the root
 * layout (see app/_layout.tsx).
 *
 * If EXPO_PUBLIC_SENTRY_DSN is not set, Sentry.init() disables the SDK
 * (documented no-op) instead of throwing, so this is safe to call in every
 * environment including local dev before a DSN has been provisioned.
 */
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let isInitialized = false;

export function initializeSentry() {
  if (isInitialized) {
    return;
  }

  if (!SENTRY_DSN) {
    console.log('[Sentry] Skipping initialization: no EXPO_PUBLIC_SENTRY_DSN configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production'),
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Automatic native crash + JS uncaught error + unhandled promise
    // rejection capture is on by default via Sentry's built-in integrations.
  });

  isInitialized = true;
  console.log('[Sentry] Initialized successfully');
}

/**
 * Report a caught error (e.g. from ErrorBoundary.componentDidCatch) with
 * extra React context. No-ops safely if Sentry was never initialized.
 */
export function captureError(error: Error, extra?: Record<string, unknown>) {
  if (!isInitialized) {
    console.error('[Sentry] captureError called before initialization:', error);
    return;
  }

  Sentry.captureException(error, extra ? { extra } : undefined);
}

export { Sentry };
