// Sentry init for the browser (the /dashboard client-rendered surface).
// Injected into the client bundle automatically by withSentryConfig
// (see next.config.js). Uses the NEXT_PUBLIC_ prefix required for a value
// to be inlined into client code by Next.js.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
