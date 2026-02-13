/**
 * Dashboard Metrics API
 * GET /api/dev-dashboard/metrics
 * 
 * Returns metrics data for Evidence dashboards
 * Query params: workspace_id, metric_name, from, to
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * GET /api/dev-dashboard/metrics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get('workspace_id');
    const metric_name = searchParams.get('metric_name');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const supabase = getServiceClient();

    // Build query
    let query = supabase
      .from('metrics_timeseries')
      .select('*')
      .order('ts', { ascending: false })
      .limit(1000);

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    }

    if (metric_name) {
      query = query.eq('metric_name', metric_name);
    }

    if (from) {
      query = query.gte('ts', from);
    }

    if (to) {
      query = query.lte('ts', to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API] Error fetching metrics:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch metrics',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      metrics: data || [],
    });

  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
