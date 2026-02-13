import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { logger } from '@/lib/monitoring/logger';

/**
 * Cron job to refresh monitoring materialized views
 * Runs every 5 minutes to keep dashboard metrics fresh
 * 
 * Add to vercel.json with schedule: every 5 minutes
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    logger.info('Starting monitoring views refresh');

    const startTime = Date.now();
    const supabase = getServiceClient();

    // Refresh webhook performance view
    const { error: webhookError } = await supabase.rpc('refresh_monitoring_views');

    if (webhookError) {
      logger.error('Failed to refresh monitoring views', webhookError as Error);
      return NextResponse.json(
        { 
          success: false,
          error: webhookError.message,
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    logger.info('Monitoring views refreshed successfully', {
      duration,
    });

    logger.metric('cron.refresh_monitoring_views.duration_ms', duration);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      refreshed_at: new Date().toISOString(),
      views: [
        'mv_webhook_performance',
        'mv_rule_performance',
      ],
    });

  } catch (error) {
    logger.error('Monitoring views refresh failed', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
