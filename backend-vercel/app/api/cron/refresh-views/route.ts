/**
 * Consolidated Cron Job: Refresh All Materialized Views
 * GET /api/cron/refresh-views
 * 
 * Merges:
 * - /api/cron/refresh-dashboard-views (6 dashboard views + experiment views)
 * - /api/cron/refresh-marketing-views (daily funnel + magnetism views)
 * 
 * Schedule: 0 * * * * (hourly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const supabase = getServiceClient();
    const startTime = Date.now();
    const results: Record<string, string> = {};

    // 1. Dashboard views (was refresh-dashboard-views)
    try {
      const { error } = await supabase.rpc('refresh_dashboard_views');
      results.dashboard_views = error ? `error: ${error.message}` : 'success';
    } catch (e: any) {
      console.error('[refresh-views] Dashboard views error:', e);
      results.dashboard_views = `error: ${e.message}`;
    }

    // 2. Experiment views (was part of refresh-dashboard-views)
    try {
      const { error } = await supabase.rpc('refresh_experiment_views');
      results.experiment_views = error ? `error: ${error.message}` : 'success';
    } catch (e: any) {
      console.error('[refresh-views] Experiment views error:', e);
      results.experiment_views = `error: ${e.message}`;
    }

    // 3. Marketing: daily funnel (was refresh-marketing-views)
    try {
      await supabase.rpc('refresh_materialized_view', { view_name: 'mv_daily_funnel' });
      results.daily_funnel = 'success';
    } catch (e: any) {
      console.error('[refresh-views] Daily funnel error:', e);
      results.daily_funnel = `error: ${e.message}`;
    }

    // 4. Marketing: 7-day magnetism (was refresh-marketing-views)
    try {
      await supabase.rpc('refresh_materialized_view', { view_name: 'mv_user_magnetism_7d' });
      results.magnetism_7d = 'success';
    } catch (e: any) {
      console.error('[refresh-views] Magnetism 7d error:', e);
      results.magnetism_7d = `error: ${e.message}`;
    }

    // 5. Marketing: 30-day magnetism (was refresh-marketing-views)
    try {
      await supabase.rpc('refresh_materialized_view', { view_name: 'mv_user_magnetism_30d' });
      results.magnetism_30d = 'success';
    } catch (e: any) {
      console.error('[refresh-views] Magnetism 30d error:', e);
      results.magnetism_30d = `error: ${e.message}`;
    }

    const duration = Date.now() - startTime;
    const hasErrors = Object.values(results).some(v => v.startsWith('error'));

    console.log(`[refresh-views] Completed in ${duration}ms`, JSON.stringify(results));

    return NextResponse.json({
      success: !hasErrors,
      duration_ms: duration,
      refreshed_at: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('[refresh-views] Fatal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
