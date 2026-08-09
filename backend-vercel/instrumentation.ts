/**
 * Next.js instrumentation hook (requires experimental.instrumentationHook
 * in next.config.js on Next.js <15). Runs once per server process/runtime
 * cold start and is the entry point for initializing Sentry so that
 * unhandled exceptions and rejections in API routes/crons are actually
 * reported somewhere with alerting, instead of only going to ephemeral
 * Vercel console logs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
