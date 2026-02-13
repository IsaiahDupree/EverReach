/**
 * Magnetism Index Calculator
 * 
 * Calculate and retrieve user's magnetism score (brand stickiness)
 * 
 * GET /api/v1/marketing/magnetism/:userId?window=7d|30d
 * POST /api/v1/marketing/magnetism/:userId - Force recalculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getSupabase();
    const { userId } = params;
    const window = req.nextUrl.searchParams.get('window') || '7d';

    if (!['7d', '30d'].includes(window)) {
      return NextResponse.json(
        { error: 'Invalid window. Must be 7d or 30d' },
        { status: 400 }
      );
    }

    // Check for existing magnetism score
    const { data: existing, error: fetchError } = await supabase
      .from('magnetism_score')
      .select('*')
      .eq('user_id', userId)
      .single();

    let magnetismScore = existing?.score || 0;

    // If no score exists or expired, calculate from user events
    if (!existing || (existing.expires_at && new Date(existing.expires_at) < new Date())) {
      // Count user events in the time window
      const daysBack = window === '30d' ? 30 : 7;
      const { count } = await supabase
        .from('user_event')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

      // Simple magnetism calculation: more events = higher score
      magnetismScore = Math.min(100, (count || 0) * 5);

      // Store/update the score
      await supabase
        .from('magnetism_score')
        .upsert({
          user_id: userId,
          score: magnetismScore,
          signals: {
            total_events: count || 0,
            window: daysBack,
            calculated_method: 'simple'
          },
          calculated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'user_id' });
    }

    return NextResponse.json({
      user_id: userId,
      window,
      current_score: magnetismScore,
      risk_level: getRiskLevel(magnetismScore),
      history: []
    });

  } catch (error) {
    console.error('Magnetism calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getSupabase();
    const { userId } = params;
    const { window = '7d' } = await req.json().catch(() => ({}));

    // Force recalculation
    const { data, error } = await supabase.rpc('compute_magnetism_index', {
      p_user_id: userId,
      p_window: window
    });

    if (error) {
      return NextResponse.json(
        { error: 'Calculation failed', details: error.message },
        { status: 500 }
      );
    }

    // Store snapshot
    await supabase.from('user_magnetism_index').insert({
      user_id: userId,
      window,
      index_value: data,
      computed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      user_id: userId,
      window,
      magnetism_score: data,
      risk_level: getRiskLevel(data),
      computed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Magnetism recalculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Determine risk level from magnetism score
 */
function getRiskLevel(score: number): string {
  if (score < 30) return 'high_risk';
  if (score < 50) return 'moderate';
  if (score < 70) return 'good';
  return 'excellent';
}
