/**
 * Marketing Analytics Dashboard API
 * GET /api/v1/marketing/analytics
 * 
 * Returns comprehensive marketing analytics summary with key metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    // Get summary statistics
    const [
      totalUsersResult,
      activeTrialsResult,
      activeSubscriptionsResult,
      recentConversionsResult,
      topChannelsResult,
      avgMagnetismResult,
    ] = await Promise.all([
      // Total users
      supabase
        .from('app_user')
        .select('*', { count: 'exact', head: true }),

      // Active trials
      supabase
        .from('free_trial')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Active subscriptions
      supabase
        .from('subscription')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Recent conversions (last N days)
      supabase
        .from('user_event')
        .select('user_id, event_name, ts, properties')
        .eq('event_name', 'subscription_started')
        .gte('ts', cutoffIso)
        .order('ts', { ascending: false })
        .limit(10),

      // Top traffic sources
      supabase
        .from('user_event')
        .select('properties')
        .gte('ts', cutoffIso)
        .not('properties->utm_source', 'is', null)
        .limit(1000),

      // Average magnetism (last 7 days)
      supabase
        .from('mv_user_magnetism_7d')
        .select('magnetism_index'),
    ]);

    // Process top channels
    const channelCounts: Record<string, number> = {};
    topChannelsResult.data?.forEach((event: any) => {
      const source = event.properties?.utm_source || 'direct';
      channelCounts[source] = (channelCounts[source] || 0) + 1;
    });

    const topChannels = Object.entries(channelCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average magnetism
    const magnetismScores = avgMagnetismResult.data?.map((m: any) => m.magnetism_index) || [];
    const avgMagnetism = magnetismScores.length > 0
      ? magnetismScores.reduce((sum: number, score: number) => sum + score, 0) / magnetismScores.length
      : 0;

    // Get growth rate (compare last 7 days vs previous 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const previous7Days = new Date();
    previous7Days.setDate(previous7Days.getDate() - 14);

    const [recentSignupsResult, previousSignupsResult] = await Promise.all([
      supabase
        .from('user_event')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'signup_completed')
        .gte('ts', last7Days.toISOString()),

      supabase
        .from('user_event')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'signup_completed')
        .gte('ts', previous7Days.toISOString())
        .lt('ts', last7Days.toISOString()),
    ]);

    const recentSignups = recentSignupsResult.count || 0;
    const previousSignups = previousSignupsResult.count || 0;
    const growthRate = previousSignups > 0
      ? (((recentSignups - previousSignups) / previousSignups) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      summary: {
        total_users: totalUsersResult.count || 0,
        active_trials: activeTrialsResult.count || 0,
        active_subscriptions: activeSubscriptionsResult.count || 0,
        avg_magnetism: parseFloat(avgMagnetism.toFixed(3)),
        growth_rate: parseFloat(growthRate),
      },
      recent_conversions: recentConversionsResult.data || [],
      top_channels: topChannels,
      time_period: {
        days,
        from: cutoffIso,
        to: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
