/**
 * Refresh Marketing Materialized Views
 * 
 * Runs hourly to refresh:
 * - mv_daily_funnel
 * - mv_user_magnetism_7d
 * - mv_user_magnetism_30d
 * 
 * Configured in vercel.json as cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const startTime = Date.now();
    const results: Record<string, any> = {};

    // Refresh daily funnel
    try {
      await supabase.rpc('refresh_materialized_view', {
        view_name: 'mv_daily_funnel'
      });
      results.daily_funnel = 'success';
    } catch (error) {
      console.error('Failed to refresh daily_funnel:', error);
      results.daily_funnel = { error: String(error) };
    }

    // Refresh 7-day magnetism
    try {
      await supabase.rpc('refresh_materialized_view', {
        view_name: 'mv_user_magnetism_7d'
      });
      results.magnetism_7d = 'success';
    } catch (error) {
      console.error('Failed to refresh magnetism_7d:', error);
      results.magnetism_7d = { error: String(error) };
    }

    // Refresh 30-day magnetism
    try {
      await supabase.rpc('refresh_materialized_view', {
        view_name: 'mv_user_magnetism_30d'
      });
      results.magnetism_30d = 'success';
    } catch (error) {
      console.error('Failed to refresh magnetism_30d:', error);
      results.magnetism_30d = { error: String(error) };
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Marketing views refreshed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
