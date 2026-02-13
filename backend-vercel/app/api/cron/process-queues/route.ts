/**
 * Consolidated Cron Job: Process All Background Queues
 * GET /api/cron/process-queues
 * 
 * Merges:
 * - /api/cron/process-enrichment-queue — User enrichment (10/batch)
 * - /api/cron/process-imports — Contact import jobs (2/batch)
 * - /api/cron/process-contact-photos — Photo download/optimize (10/batch)
 * 
 * Each sub-task is wrapped in its own try/catch so one failure
 * doesn't block the others.
 * 
 * Schedule: *​/5 * * * * (every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // Helper to call a sub-queue route
    async function runSubQueue(name: string, path: string): Promise<void> {
      const stepStart = Date.now();
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
          processed: body.processed ?? body.results?.processed ?? 0,
        };
      } catch (e: any) {
        results[name] = {
          status: 'error',
          duration_ms: Date.now() - stepStart,
          error: e.message,
        };
      }
    }

    // Run queue processors sequentially to respect DB connection limits
    await runSubQueue('enrichment', '/api/cron/process-enrichment-queue');
    await runSubQueue('imports', '/api/cron/process-imports');
    await runSubQueue('photos', '/api/cron/process-contact-photos');

    const duration = Date.now() - startTime;
    const successCount = Object.values(results).filter((r: any) => r.status === 'success').length;
    const errorCount = Object.values(results).filter((r: any) => r.status === 'error').length;

    console.log(`[process-queues] Completed in ${duration}ms: ${successCount} ok, ${errorCount} errors`);

    return NextResponse.json({
      success: errorCount === 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      summary: { success: successCount, errors: errorCount },
      results,
    });

  } catch (error: any) {
    console.error('[process-queues] Fatal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
