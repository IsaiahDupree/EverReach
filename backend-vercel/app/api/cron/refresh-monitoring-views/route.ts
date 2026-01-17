import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Cron job to refresh monitoring materialized views
 * Runs every 5 minutes to keep dashboard metrics fresh
 * 
 * Add to vercel.json with schedule: every 5 minutes
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron attempt', {
        path: '/api/cron/refresh-monitoring-views',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting monitoring views refresh');

    const startTime = Date.now();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
