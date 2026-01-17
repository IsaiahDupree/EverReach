/**
 * Cron Job - Ingest Metrics from All Providers
 * GET /api/cron/ingest-metrics
 * 
 * Fetches and stores metrics from all active integrations
 * Should be called by Vercel Cron every 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdapter } from '@/lib/dashboard/adapter-registry';
import type { IntegrationAccount, MetricPoint } from '@/lib/dashboard/types';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes max

/**
 * GET /api/cron/ingest-metrics
 * 
 * Protected by Vercel Cron Secret
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all active integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_accounts')
      .select('*');

    if (integrationsError) {
      console.error('[Cron] Error fetching integrations:', integrationsError);
      return NextResponse.json({ 
        error: 'Failed to fetch integrations',
        details: integrationsError.message 
      }, { status: 500 });
    }

    const results: { 
      workspace_id: string; 
      service: string; 
      metrics_count: number; 
      error?: string 
    }[] = [];
    
    let totalMetrics = 0;
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // Last 24h

    // Ingest metrics for each integration
    for (const integration of integrations || []) {
      const adapter = getAdapter(integration.service);
      
      if (!adapter) {
        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          metrics_count: 0,
          error: 'No adapter available',
        });
        continue;
      }

      try {
        // Fetch metrics
        const metrics: MetricPoint[] = await adapter.fetchMetrics(
          integration as IntegrationAccount,
          from,
          to
        );

        // Store metrics in metrics_timeseries
        if (metrics.length > 0) {
          const rows = metrics.map(m => ({
            workspace_id: integration.workspace_id,
            metric_name: `${integration.service}.${getMetricName(integration.service)}`,
            ts: m.ts,
            value: m.value,
            labels: { service: integration.service },
          }));

          const { error: insertError } = await supabase
            .from('metrics_timeseries')
            .upsert(rows);

          if (insertError) {
            throw insertError;
          }

          totalMetrics += metrics.length;
        }

        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          metrics_count: metrics.length,
        });

      } catch (error: any) {
        console.error(`[Cron] Metrics ingestion failed for ${integration.service}:`, error);
        
        results.push({
          workspace_id: integration.workspace_id,
          service: integration.service,
          metrics_count: 0,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_integrations: results.length,
        total_metrics: totalMetrics,
      },
      results,
    });

  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Map service name to primary metric name
 */
function getMetricName(service: string): string {
  const metricMap: Record<string, string> = {
    stripe: 'mrr_usd',
    revenuecat: 'mrr_usd',
    posthog: 'dau',
    resend: 'sends',
    supabase: 'query_count',
    superwall: 'paywall_view',
  };
  
  return metricMap[service] || 'value';
}
