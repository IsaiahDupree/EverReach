/**
 * Magnetism Summary API
 * GET /api/v1/marketing/magnetism-summary
 * 
 * Returns aggregate magnetism statistics and trends
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

    // Get magnetism data from magnetism_score table
    const { data: magnetismData, error } = await supabase
      .from('magnetism_score')
      .select('score, calculated_at, user_id');

    if (error) {
      throw new Error(`Magnetism query failed: ${error.message}`);
    }

    const scores = magnetismData?.map((m: any) => m.score / 100) || []; // Normalize to 0-1 range
    
    // Calculate statistics
    const totalUsers = scores.length;
    const avgMagnetism = totalUsers > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / totalUsers 
      : 0;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianMagnetism = totalUsers > 0
      ? sortedScores[Math.floor(totalUsers / 2)]
      : 0;

    // Distribution buckets
    const highEngagement = scores.filter(s => s >= 0.7).length;
    const mediumEngagement = scores.filter(s => s >= 0.4 && s < 0.7).length;
    const lowEngagement = scores.filter(s => s < 0.4).length;

    // Top performers
    const topPerformers = magnetismData
      ?.sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        total_users: totalUsers,
        avg_magnetism: parseFloat(avgMagnetism.toFixed(3)),
        median_magnetism: parseFloat(medianMagnetism.toFixed(3)),
        high_engagement_count: highEngagement,
        medium_engagement_count: mediumEngagement,
        low_engagement_count: lowEngagement,
      },
      distribution: {
        high: {
          count: highEngagement,
          percentage: totalUsers > 0 ? ((highEngagement / totalUsers) * 100).toFixed(1) : '0.0',
        },
        medium: {
          count: mediumEngagement,
          percentage: totalUsers > 0 ? ((mediumEngagement / totalUsers) * 100).toFixed(1) : '0.0',
        },
        low: {
          count: lowEngagement,
          percentage: totalUsers > 0 ? ((lowEngagement / totalUsers) * 100).toFixed(1) : '0.0',
        },
      },
      top_performers: topPerformers || [],
      computed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Magnetism Summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch magnetism summary', details: (error as Error).message },
      { status: 500 }
    );
  }
}
