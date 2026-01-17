/**
 * Persona Distribution Analytics
 * 
 * GET /api/v1/analytics/personas
 * 
 * Returns persona bucket statistics and performance
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
    // Query persona performance view
    const { data: personas, error } = await supabase
      .from('mv_persona_performance')
      .select('*')
      .order('user_count', { ascending: false });

    if (error) {
      console.error('Failed to fetch persona data:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // Calculate totals
    const totals = personas?.reduce((acc, persona) => ({
      total_users: acc.total_users + (persona.user_count || 0),
      total_trials: acc.total_trials + (persona.trials_started || 0),
      total_purchases: acc.total_purchases + (persona.purchases_completed || 0)
    }), { total_users: 0, total_trials: 0, total_purchases: 0 });

    // Add percentage distribution
    const personasWithPercentage = personas?.map(persona => ({
      ...persona,
      percentage: totals.total_users > 0 
        ? (persona.user_count / totals.total_users) * 100 
        : 0
    }));

    return NextResponse.json({
      personas: personasWithPercentage || [],
      totals,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Persona analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
