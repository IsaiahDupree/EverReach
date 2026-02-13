import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for ETL

/**
 * POST /api/etl/posthog
 * Daily ETL job to pull metrics from PostHog and write to metrics_timeseries
 * 
 * Fetches:
 * - DAU/WAU/MAU
 * - Activation rate (7-day)
 * - Time to first "aha" moment
 * - Feature usage by feature name
 * 
 * Should be called daily via cron or n8n workflow
 */
export async function GET(req: NextRequest) {
  return runPosthogETL(req);
}

export async function POST(req: NextRequest) {
  return runPosthogETL(req);
}

async function runPosthogETL(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
    const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return NextResponse.json({ 
        error: 'PostHog not configured',
        message: 'Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID' 
      }, { status: 500 });
    }

    const supabase = getServiceClient();

    const results: Record<string, any> = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper to log metrics
    async function logMetric(metric_name: string, value: number, labels: Record<string, any> = {}) {
      const { error } = await supabase.from('metrics_timeseries').insert({
        metric_name,
        value,
        ts: yesterday.toISOString(),
        labels
      });
      if (error) throw error;
    }

    // Update service status
    async function updateServiceStatus(status: 'healthy' | 'degraded' | 'down', latency_ms: number, message?: string) {
      await supabase.from('service_status').upsert({
        service: 'posthog',
        status,
        latency_ms,
        last_check: now.toISOString(),
        last_success: status === 'healthy' ? now.toISOString() : undefined,
        last_failure: status !== 'healthy' ? now.toISOString() : undefined,
        message,
        updated_at: now.toISOString()
      }, { onConflict: 'service' });
    }

    const startTime = Date.now();

    // 1. Fetch DAU/WAU/MAU from PostHog
    // Note: This is a simplified example. Real PostHog queries require their Insights API or SQL access
    // You'd typically use PostHog's "trends" endpoint or export data
    
    try {
      // Example: Fetch events count for yesterday (proxy for DAU)
      // In production, use PostHog Insights API or Data Warehouse queries
      const posthogUrl = `https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`;
      
      // Simplified placeholder - in production you'd construct proper PostHog queries
      // For now, we'll log mock data to demonstrate the pattern
      
      // Mock DAU (replace with real PostHog API call)
      const dauMock = Math.floor(1000 + Math.random() * 500);
      await logMetric('posthog.dau', dauMock, { date: yesterday.toISOString().split('T')[0] });
      results.dau = dauMock;

      // Mock WAU
      const wauMock = Math.floor(5000 + Math.random() * 2000);
      await logMetric('posthog.wau', wauMock, { date: yesterday.toISOString().split('T')[0] });
      results.wau = wauMock;

      // Mock MAU
      const mauMock = Math.floor(15000 + Math.random() * 5000);
      await logMetric('posthog.mau', mauMock, { date: yesterday.toISOString().split('T')[0] });
      results.mau = mauMock;

      // Mock Activation Rate (7-day)
      const activationRate = 0.35 + Math.random() * 0.15;
      await logMetric('activation.rate_7d', activationRate, { date: yesterday.toISOString().split('T')[0] });
      results.activation_rate_7d = activationRate;

      // Mock Time to First "Aha" (in minutes)
      const ttv = 15 + Math.random() * 20;
      await logMetric('posthog.time_to_aha_min', ttv, { date: yesterday.toISOString().split('T')[0] });
      results.time_to_aha_min = ttv;

      // Feature usage example (mock)
      const features = ['ai_assistant', 'reports', 'exports', 'integrations'];
      for (const feature of features) {
        const usage = Math.floor(100 + Math.random() * 400);
        await logMetric('posthog.feature_usage', usage, { 
          feature,
          date: yesterday.toISOString().split('T')[0]
        });
      }
      results.features = features.length;

      const latency = Date.now() - startTime;
      await updateServiceStatus('healthy', latency, 'ETL completed successfully');

    } catch (error: any) {
      const latency = Date.now() - startTime;
      await updateServiceStatus('degraded', latency, error.message);
      throw error;
    }

    return NextResponse.json({
      success: true,
      date: yesterday.toISOString().split('T')[0],
      results,
      message: 'PostHog ETL completed. Note: Using mock data - replace with real PostHog API calls in production'
    });

  } catch (error: any) {
    console.error('[posthog-etl] Error:', error);
    return NextResponse.json({
      error: 'ETL failed',
    }, { status: 500 });
  }
}

/**
 * Production Implementation Guide:
 * 
 * 1. PostHog Insights API:
 *    - Use /api/projects/:id/insights/trend/ for DAU/WAU/MAU
 *    - Construct queries with date_from, date_to, events filters
 * 
 * 2. PostHog Data Warehouse (if available):
 *    - Direct SQL queries for custom metrics
 *    - More flexible for complex aggregations
 * 
 * 3. Example DAU Query (real):
 *    POST https://app.posthog.com/api/projects/PROJECT_ID/insights/trend/
 *    {
 *      "events": [{"id": "$pageview", "type": "events"}],
 *      "date_from": "-7d",
 *      "display": "ActionsLineGraph",
 *      "insight": "TRENDS"
 *    }
 * 
 * 4. Activation Rate Calculation:
 *    - Define "activated" as completing key events (e.g., onboarding_complete + feature_used)
 *    - Query cohorts who signed up 7 days ago
 *    - Calculate % who completed activation events
 * 
 * 5. Time to Aha:
 *    - Track time between signup and first "aha_moment" event
 *    - Use PostHog funnels or custom queries
 *    - Store median/p50 value
 */
