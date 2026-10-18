/**
 * Consolidated Cron Job: System Monitoring
 * GET /api/cron/monitor
 * 
 * Merges:
 * - /api/cron/health-check (integration health → service_status)
 * - /api/health/ping (DB health, webhook lag, Stripe API → service_status)
 * - /api/cron/refresh-monitoring-views (mv_webhook_performance, mv_rule_performance)
 * 
 * Schedule: *​/5 * * * * (every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const supabase = getServiceClient();
    const startTime = Date.now();
    const now = new Date();
    const results: Record<string, any> = {};

    // ──────────────────────────────────────────────
    // 1. DB Health Check (was health/ping step 1)
    // ──────────────────────────────────────────────
    try {
      const dbStart = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const rtt = Date.now() - dbStart;

      const status = error ? 'down' : 'healthy';
      await supabase.from('service_status').upsert({
        service: 'supabase_db',
        status,
        latency_ms: rtt,
        last_check: now.toISOString(),
        ...(error
          ? { last_failure: now.toISOString(), message: error.message }
          : { last_success: now.toISOString(), error_count: 0, message: 'Database responding normally' }),
        updated_at: now.toISOString(),
      }, { onConflict: 'service' });

      results.db = { status, rtt };
    } catch (e: any) {
      console.error('[monitor] DB health check failed:', e);
      results.db = { status: 'down', error: e.message };
    }

    // ──────────────────────────────────────────────
    // 2. Webhook Lag Check (was health/ping step 2)
    // ──────────────────────────────────────────────
    const webhookProviders = ['stripe', 'revenuecat', 'superwall', 'resend'];
    results.webhooks = {};

    for (const provider of webhookProviders) {
      try {
        const { data: lastWebhook } = await supabase
          .from('webhook_log')
          .select('processed_at')
          .eq('provider', provider)
          .order('processed_at', { ascending: false })
          .limit(1)
          .single();

        if (lastWebhook) {
          const lagMs = now.getTime() - new Date(lastWebhook.processed_at).getTime();
          const lagMinutes = Math.floor(lagMs / 1000 / 60);
          const status = lagMinutes > 1440 ? 'degraded' : 'healthy';

          await supabase.from('service_status').upsert({
            service: `webhook_${provider}`,
            status,
            last_check: now.toISOString(),
            message: lagMinutes > 1440
              ? `No webhook received in ${lagMinutes} minutes`
              : 'Webhooks receiving normally',
            metadata: { lag_minutes: lagMinutes, last_received: lastWebhook.processed_at },
            updated_at: now.toISOString(),
          }, { onConflict: 'service' });

          results.webhooks[provider] = { status, lag_minutes: lagMinutes };
        } else {
          results.webhooks[provider] = { status: 'unknown' };
        }
      } catch (e: any) {
        results.webhooks[provider] = { status: 'unknown', error: e.message };
      }
    }

    // ──────────────────────────────────────────────
    // 3. Integration Health Checks (was health-check)
    // ──────────────────────────────────────────────
    try {
      const { getAdapter } = await import('@/lib/dashboard/adapter-registry');

      const { data: integrations } = await supabase
        .from('integration_accounts')
        .select('*')
        .eq('is_active', true);

      let up = 0, down = 0;

      for (const integration of integrations || []) {
        const adapter = getAdapter(integration.service);
        if (!adapter) continue;

        try {
          const health = await adapter.fetchHealth(integration);

          await supabase.from('service_status').upsert({
            workspace_id: integration.workspace_id,
            service: integration.service,
            status: health.status,
            latency_ms: health.latency_ms,
            last_success: health.last_success,
            last_check: health.last_check,
            message: health.message || null,
            error_details: health.error_details || null,
          }, { onConflict: 'workspace_id,service' });

          health.status === 'UP' ? up++ : down++;
        } catch (e: any) {
          await supabase.from('service_status').upsert({
            workspace_id: integration.workspace_id,
            service: integration.service,
            status: 'DOWN',
            last_check: now.toISOString(),
            message: 'Health check failed',
            error_details: { error: e.toString() },
          }, { onConflict: 'workspace_id,service' });
          down++;
        }
      }

      results.integrations = { up, down, total: up + down };
    } catch (e: any) {
      console.error('[monitor] Integration health check failed:', e);
      results.integrations = { error: e.message };
    }

    // ──────────────────────────────────────────────
    // 4. Refresh Monitoring Views (was refresh-monitoring-views)
    // ──────────────────────────────────────────────
    try {
      const { error } = await supabase.rpc('refresh_monitoring_views');
      results.monitoring_views = error ? `error: ${error.message}` : 'success';
    } catch (e: any) {
      console.error('[monitor] Monitoring views refresh failed:', e);
      results.monitoring_views = `error: ${e.message}`;
    }

    const duration = Date.now() - startTime;
    console.log(`[monitor] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      checked_at: now.toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('[monitor] Fatal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
