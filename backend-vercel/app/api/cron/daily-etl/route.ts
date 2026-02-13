/**
 * Consolidated Cron Job: Daily ETL Pipeline
 * GET /api/cron/daily-etl
 * 
 * Merges (sequential):
 * 1. /api/etl/posthog       — DAU/WAU/MAU, activation rate, feature usage
 * 2. /api/etl/meta-ads      — Spend, impressions, clicks, ROAS, CPA
 * 3. /api/etl/mobile-acquisition — ASA + Google Play installs, trial rate
 * 4. /api/etl/openai-usage  — Token usage, costs by model/feature
 * 
 * Each sub-task is wrapped in its own try/catch so one failure
 * doesn't block the others.
 * 
 * Schedule: 0 1 * * * (1 AM UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes total budget

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const startTime = Date.now();
    const results: Record<string, any> = {};

    // Build internal URL base for calling sub-routes
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;
    const cronSecret = process.env.CRON_SECRET;

    // Helper to call a sub-ETL route
    async function runSubETL(name: string, path: string): Promise<void> {
      const stepStart = Date.now();
      console.log(`[daily-etl] Starting ${name}...`);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cronSecret}`,
          },
        });
        const body = await res.json().catch(() => ({}));
        const duration = Date.now() - stepStart;

        results[name] = {
          status: res.ok ? 'success' : 'error',
          http_status: res.status,
          duration_ms: duration,
          ...(body.results ? { summary: body.results } : {}),
        };
        console.log(`[daily-etl] ${name}: ${res.ok ? 'OK' : 'FAILED'} (${duration}ms)`);
      } catch (e: any) {
        const duration = Date.now() - stepStart;
        console.error(`[daily-etl] ${name} failed:`, e);
        results[name] = {
          status: 'error',
          duration_ms: duration,
          error: e.message,
        };
      }
    }

    // Run ETL jobs sequentially to avoid overwhelming external APIs
    await runSubETL('posthog', '/api/etl/posthog');
    await runSubETL('meta_ads', '/api/etl/meta-ads');
    await runSubETL('mobile_acquisition', '/api/etl/mobile-acquisition');
    await runSubETL('openai_usage', '/api/etl/openai-usage');

    const duration = Date.now() - startTime;
    const successCount = Object.values(results).filter((r: any) => r.status === 'success').length;
    const errorCount = Object.values(results).filter((r: any) => r.status === 'error').length;

    console.log(`[daily-etl] Pipeline completed in ${duration}ms: ${successCount} ok, ${errorCount} errors`);

    return NextResponse.json({
      success: errorCount === 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      summary: { success: successCount, errors: errorCount },
      results,
    });

  } catch (error: any) {
    console.error('[daily-etl] Fatal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
