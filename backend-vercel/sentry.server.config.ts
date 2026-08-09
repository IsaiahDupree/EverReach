// Sentry init for the Node.js server runtime (API routes, cron handlers).
// See instrumentation.ts for where this is loaded from.
//
// If SENTRY_DSN is not set, Sentry.init() disables the SDK (it becomes a
// documented no-op) instead of throwing, so this is safe to load in every
// environment including local dev before a DSN has been provisioned.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
