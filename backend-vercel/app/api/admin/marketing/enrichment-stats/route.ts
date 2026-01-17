/**
 * Enrichment Statistics (Admin Dashboard)
 * 
 * GET /api/admin/marketing/enrichment-stats?days=30
 * 
 * Returns detailed enrichment statistics
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/admin-middleware';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  return requireAdminAuth(req, async (req, context) => {
    try {
      const supabase = getSupabase();
      const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    // Fetch enrichment data
    const { data: enrichments, error } = await supabase
      .from('user_identity')
      .select('user_id, status, cost_cents, enriched_at, created_at, retry_count, error_message')
      .gte('created_at', `NOW() - INTERVAL '${days} days'`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch enrichment stats:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: enrichments?.length || 0,
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      failed_permanent: 0,
      total_cost_usd: 0,
      total_retries: 0
    };

    const dailyStats: Record<string, any> = {};
    const errorReasons: Record<string, number> = {};

    enrichments?.forEach(e => {
      // Status counts
      stats[e.status as keyof typeof stats] = (stats[e.status as keyof typeof stats] || 0) + 1;
      
      // Cost
      if (e.cost_cents) {
        stats.total_cost_usd += e.cost_cents / 100;
      }
      
      // Retries
      stats.total_retries += e.retry_count || 0;
      
      // Daily breakdown
      const date = new Date(e.created_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, completed: 0, failed: 0, cost_usd: 0 };
      }
      dailyStats[date].total++;
      if (e.status === 'completed') dailyStats[date].completed++;
      if (e.status === 'failed' || e.status === 'failed_permanent') dailyStats[date].failed++;
      if (e.cost_cents) dailyStats[date].cost_usd += e.cost_cents / 100;
      
      // Error reasons
      if (e.error_message && e.status === 'failed') {
        const reason = e.error_message.substring(0, 50); // First 50 chars
        errorReasons[reason] = (errorReasons[reason] || 0) + 1;
      }
    });

    // Calculate rates
    const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    const failureRate = stats.total > 0 ? ((stats.failed + stats.failed_permanent) / stats.total) * 100 : 0;
    const avgCost = stats.completed > 0 ? stats.total_cost_usd / stats.completed : 0;
    const avgRetries = stats.failed > 0 ? stats.total_retries / stats.failed : 0;

    // Top error reasons
    const topErrors = Object.entries(errorReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // Daily stats array
    const dailyArray = Object.entries(dailyStats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      period_days: days,
      summary: {
        total: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        processing: stats.processing,
        failed: stats.failed,
        failed_permanent: stats.failed_permanent,
        success_rate: Math.round(successRate * 10) / 10,
        failure_rate: Math.round(failureRate * 10) / 10
      },
      costs: {
        total_usd: Math.round(stats.total_cost_usd * 100) / 100,
        avg_per_enrichment: Math.round(avgCost * 1000) / 1000,
        projected_monthly: stats.total > 0 
          ? Math.round((stats.total_cost_usd / days) * 30 * 100) / 100 
          : 0
      },
      reliability: {
        avg_retries: Math.round(avgRetries * 10) / 10,
        total_retries: stats.total_retries,
        top_errors: topErrors
      },
      daily_stats: dailyArray,
      generated_at: new Date().toISOString()
    });

    } catch (error) {
      console.error('Enrichment stats error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: String(error) },
        { status: 500 }
      );
    }
  });
}
