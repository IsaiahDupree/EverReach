/**
 * Detailed Health Endpoint (admin-only)
 * GET /api/health/detailed
 *
 * Returns operational metrics:
 *  - DB health + latency
 *  - Webhook success/failure rates (last 24h)
 *  - Cron job last-run timestamps
 *  - Subscription event counts
 *  - Service configuration status
 */

import { ok, unauthorized, serverError, options } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';
import { verifyCron } from '@/lib/cron-auth';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  // Require CRON_SECRET or admin auth
  const cronError = verifyCron(req);
  if (cronError) return cronError;

  try {
    const supabase = getServiceClient();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all checks in parallel
    const [
      dbCheck,
      subscriptionEventStats,
      recentSubscriptionEvents,
      serviceStatus,
    ] = await Promise.all([
      // 1. DB latency
      (async () => {
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('count').limit(1).maybeSingle();
        return { latency_ms: Date.now() - start, healthy: !error };
      })(),

      // 2. Subscription event stats (last 24h)
      (async () => {
        const { data, error } = await supabase
          .from('subscription_events')
          .select('event_type, environment')
          .gte('created_at', twentyFourHoursAgo.toISOString());
        if (error) return { total: 0, by_type: {}, by_env: {}, error: error.message };
        const byType: Record<string, number> = {};
        const byEnv: Record<string, number> = {};
        (data || []).forEach((e: any) => {
          byType[e.event_type] = (byType[e.event_type] || 0) + 1;
          byEnv[e.environment] = (byEnv[e.environment] || 0) + 1;
        });
        return { total: data?.length || 0, by_type: byType, by_env: byEnv };
      })(),

      // 3. Most recent subscription events (last 5)
      (async () => {
        const { data } = await supabase
          .from('subscription_events')
          .select('event_type, user_id, plan, status, store, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        return data || [];
      })(),

      // 4. Service status (cron last-run times)
      (async () => {
        const { data } = await supabase
          .from('service_status')
          .select('service, status, last_check, response_time_ms')
          .order('last_check', { ascending: false })
          .limit(20);
        return data || [];
      })(),
    ]);

    // Service configuration check
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
      CRON_SECRET: !!process.env.CRON_SECRET,
      REVENUECAT_WEBHOOK_SECRET: !!process.env.REVENUECAT_WEBHOOK_SECRET,
      REVENUECAT_WEBHOOK_AUTH_TOKEN: !!process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN,
      REVENUECAT_V2_API_KEY: !!process.env.REVENUECAT_V2_API_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      POSTHOG_WEBHOOK_SECRET: !!process.env.POSTHOG_WEBHOOK_SECRET,
      META_PIXEL_ID: !!process.env.META_PIXEL_ID,
      META_CAPI_TOKEN: !!process.env.META_CAPI_TOKEN,
    };

    const missingCritical = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET']
      .filter(k => !(envCheck as any)[k]);

    return ok({
      status: dbCheck.healthy && missingCritical.length === 0 ? 'healthy' : 'degraded',
      timestamp: now.toISOString(),
      database: {
        healthy: dbCheck.healthy,
        latency_ms: dbCheck.latency_ms,
      },
      subscription_events_24h: subscriptionEventStats,
      recent_subscription_events: recentSubscriptionEvents,
      service_status: serviceStatus,
      env_configured: envCheck,
      missing_critical: missingCritical,
    }, req, { 'Cache-Control': 'no-store' });
  } catch (error: any) {
    console.error('[Health Detailed] Error:', error);
    return serverError('Health check failed', req);
  }
}
