/**
 * Magnetism Summary Analytics
 * 
 * GET /api/v1/analytics/magnetism-summary?window=7d
 * 
 * Returns distribution of users across magnetism bands
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const window = req.nextUrl.searchParams.get('window') || '7d';
    
    // Validate window parameter
    if (!['7d', '30d'].includes(window)) {
      return NextResponse.json(
        { error: 'Window must be 7d or 30d' },
        { status: 400 }
      );
    }

    // Get distribution from materialized view
    const viewName = window === '7d' ? 'mv_user_magnetism_7d' : 'mv_user_magnetism_30d';
    
    const { data: rawData, error } = await supabase
      .from(viewName)
      .select('user_id, index_value');

    if (error) {
      console.error('Failed to fetch magnetism data:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // Calculate distribution by band
    const distribution = {
      hot: 0,    // >= 70
      warm: 0,   // 50-69
      cooling: 0, // 30-49
      cold: 0    // < 30
    };

    rawData?.forEach(row => {
      const score = row.index_value || 0;
      if (score >= 70) distribution.hot++;
      else if (score >= 50) distribution.warm++;
      else if (score >= 30) distribution.cooling++;
      else distribution.cold++;
    });

    const total = rawData?.length || 0;

    // Calculate percentages
    const percentages = {
      hot: total > 0 ? (distribution.hot / total) * 100 : 0,
      warm: total > 0 ? (distribution.warm / total) * 100 : 0,
      cooling: total > 0 ? (distribution.cooling / total) * 100 : 0,
      cold: total > 0 ? (distribution.cold / total) * 100 : 0
    };

    // Calculate average magnetism
    const averageMagnetism = rawData?.reduce((sum, row) => sum + (row.index_value || 0), 0) / total || 0;

    // Risk analysis
    const highRisk = distribution.cold;
    const moderate = distribution.cooling;
    const healthy = distribution.warm + distribution.hot;

    return NextResponse.json({
      window,
      distribution,
      percentages,
      total_users: total,
      average_magnetism: Math.round(averageMagnetism),
      risk_analysis: {
        high_risk: highRisk,
        moderate,
        healthy
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Magnetism summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
