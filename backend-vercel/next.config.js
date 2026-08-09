const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    // Required on Next.js <15 to load instrumentation.ts (Sentry server/edge init).
    instrumentationHook: true
  }
};

// withSentryConfig wraps API/Route Handlers to auto-report unhandled exceptions
// and injects sentry.client.config.ts into the browser bundle. It is a no-op
// at runtime for any request until SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // No Sentry auth token is configured in this environment yet, so skip the
  // source-map upload step at build time instead of failing the build on it.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN
  },
  silent: true,
  disableLogger: true
});
