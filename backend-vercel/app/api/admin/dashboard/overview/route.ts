/**
 * Dashboard Overview Endpoint
 * GET /api/admin/dashboard/overview
 * 
 * Returns high-level metrics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAdminError } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  return requireAdmin(req, async () => {
    const supabase = getSupabase();
    try {
      const searchParams = req.nextUrl.searchParams;
      const days = parseInt(searchParams.get('days') || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get app health summary
      const { data: healthData } = await supabase
        .from('mv_app_health_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(days);

      // Calculate totals
      const totalRequests = healthData?.reduce((sum, row) => sum + (row.total_requests || 0), 0) || 0;
      const totalErrors = healthData?.reduce((sum, row) => sum + (row.total_errors || 0), 0) || 0;
      const avgResponseTime = healthData?.reduce((sum, row) => sum + (row.avg_response_time || 0), 0) / (healthData?.length || 1);
      const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100) : 100;

      // Get user growth from PostHog cache
      const { data: userGrowth } = await supabase
        .from('posthog_events_cache')
        .select('date, unique_users')
        .eq('event_name', 'user_signed_up')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(days);

      const totalSignups = userGrowth?.reduce((sum, row) => sum + (row.unique_users || 0), 0) || 0;

      // Get active experiments count
      const { count: activeExperiments } = await supabase
        .from('experiments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');

      // Get enabled feature flags count
      const { count: enabledFlags } = await supabase
        .from('feature_flags')
        .select('*', { count: 'exact', head: true })
        .eq('is_enabled', true);

      // Get email campaign performance (last 30 days)
      const { data: emailData } = await supabase
        .from('mv_email_performance_summary')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: false });

      const emailMetrics = {
        campaigns_sent: emailData?.length || 0,
        total_sent: emailData?.reduce((sum, row) => sum + (row.total_sent || 0), 0) || 0,
        total_opens: emailData?.reduce((sum, row) => sum + (row.total_opens || 0), 0) || 0,
        total_clicks: emailData?.reduce((sum, row) => sum + (row.total_clicks || 0), 0) || 0,
        avg_open_rate: emailData?.reduce((sum, row) => sum + (row.avg_open_rate || 0), 0) / (emailData?.length || 1) || 0,
        avg_click_rate: emailData?.reduce((sum, row) => sum + (row.avg_click_rate || 0), 0) / (emailData?.length || 1) || 0,
      };

      // Get social media performance (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: socialData } = await supabase
        .from('mv_social_performance_summary')
        .select('*')
        .gte('week_start', weekAgo.toISOString().split('T')[0])
        .order('week_start', { ascending: false });

      const socialMetrics = {
        total_posts: socialData?.reduce((sum, row) => sum + (row.posts_count || 0), 0) || 0,
        total_impressions: socialData?.reduce((sum, row) => sum + (row.total_impressions || 0), 0) || 0,
        total_engagement: socialData?.reduce((sum, row) => sum + (row.total_engagement || 0), 0) || 0,
        avg_engagement_rate: socialData?.reduce((sum, row) => sum + (row.avg_engagement_rate || 0), 0) / (socialData?.length || 1) || 0,
      };

      // Return overview
      return NextResponse.json({
        period: {
          days,
          start_date: startDate.toISOString(),
          end_date: new Date().toISOString(),
        },
        app_health: {
          total_requests: totalRequests,
          total_errors: totalErrors,
          success_rate: Math.round(successRate * 100) / 100,
          avg_response_time_ms: Math.round(avgResponseTime * 100) / 100,
          trend: healthData?.slice(0, 7) || [],
        },
        user_growth: {
          total_signups: totalSignups,
          trend: userGrowth?.slice(0, 7) || [],
        },
        experiments: {
          active_count: activeExperiments || 0,
          enabled_flags_count: enabledFlags || 0,
        },
        marketing: {
          email: emailMetrics,
          social: socialMetrics,
        },
      });
    } catch (error) {
      return handleAdminError(error);
    }
  });
}
