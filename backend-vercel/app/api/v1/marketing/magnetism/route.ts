/**
 * Magnetism Index API
 * GET /api/v1/marketing/magnetism
 * 
 * Returns user magnetism scores (engagement level) over a time window
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() { return getServiceClient(); }

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const windowDays = parseInt(searchParams.get('window_days') || '7');
    const minScore = parseFloat(searchParams.get('min_score') || '0');
    const maxScore = parseFloat(searchParams.get('max_score') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Query from user_magnetism_index table
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    
    const { data: magnetism, error } = await supabase
      .from('user_magnetism_index')
      .select('*')
      .gte('computed_at', cutoffDate.toISOString())
      .gte('index_value', minScore)
      .lte('index_value', maxScore)
      .order('index_value', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Magnetism query failed: ${error.message}`);
    }

    // Calculate summary statistics
    const scores = magnetism?.map((m: any) => m.index_value) || [];
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;
    
    const highEngagement = magnetism?.filter((m: any) => m.index_value >= 0.7).length || 0;
    const mediumEngagement = magnetism?.filter((m: any) => m.index_value >= 0.4 && m.index_value < 0.7).length || 0;
    const lowEngagement = magnetism?.filter((m: any) => m.index_value < 0.4).length || 0;

    return NextResponse.json({
      magnetism: magnetism || [],
      summary: {
        total_users: magnetism?.length || 0,
        average_magnetism: parseFloat(avgScore.toFixed(3)),
        high_engagement_count: highEngagement,
        medium_engagement_count: mediumEngagement,
        low_engagement_count: lowEngagement,
      },
      filters: {
        window_days: windowDays,
        min_score: minScore,
        max_score: maxScore,
        limit,
      },
    });

  } catch (error) {
    console.error('Magnetism API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch magnetism data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
