/**
 * Refresh Dashboard Materialized Views Cron Job
 * GET/POST /api/cron/refresh-dashboard-views
 * 
 * Scheduled: Every hour
 * Purpose: Refresh all materialized views for fast dashboard queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';


export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    return handleRefresh(req, supabase);
  } catch (error) {
    console.error('[Dashboard Views] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  return handleRefresh(req, supabase);
}

async function handleRefresh(req: NextRequest, supabase: ReturnType<typeof getServiceClient>) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    console.log('[Dashboard Views] Starting refresh...');

    const startTime = Date.now();

    // Call the refresh function from database
    const { error } = await supabase.rpc('refresh_dashboard_views');

    if (error) {
      console.error('[Dashboard Views] Refresh error:', error);
      throw error;
    }

    // Also refresh experiment views
    const { error: expError } = await supabase.rpc('refresh_experiment_views');

    if (expError) {
      console.error('[Dashboard Views] Experiment views refresh error:', expError);
      // Don't throw - continue even if this fails
    }

    const duration = Date.now() - startTime;

    console.log('[Dashboard Views] Refresh completed in', duration, 'ms');

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      refreshed_at: new Date().toISOString(),
      views_refreshed: [
        'mv_app_health_summary',
        'mv_email_performance_summary',
        'mv_social_performance_summary',
        'mv_meta_ads_summary',
        'mv_feature_flag_usage',
        'mv_experiment_results',
      ],
    });
  } catch (error) {
    console.error('[Dashboard Views] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
