/**
 * Marketing Funnel Analytics
 * 
 * GET /api/v1/analytics/funnel?days=30
 * 
 * Returns daily conversion funnel metrics
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
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Query materialized view
    const { data, error } = await supabase
      .from('mv_daily_funnel')
      .select('*')
      .gte('event_date', `NOW() - INTERVAL '${days} days'`)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch funnel data:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    // Calculate aggregated metrics
    const totals = data?.reduce((acc, day) => ({
      emails_submitted: acc.emails_submitted + (day.emails_submitted || 0),
      trials_started: acc.trials_started + (day.trials_started || 0),
      purchases_completed: acc.purchases_completed + (day.purchases_completed || 0)
    }), { emails_submitted: 0, trials_started: 0, purchases_completed: 0 });

    // Calculate overall conversion rates
    const overallRates = {
      email_to_trial_rate: totals.emails_submitted > 0 
        ? totals.trials_started / totals.emails_submitted 
        : 0,
      trial_to_purchase_rate: totals.trials_started > 0 
        ? totals.purchases_completed / totals.trials_started 
        : 0,
      email_to_purchase_rate: totals.emails_submitted > 0 
        ? totals.purchases_completed / totals.emails_submitted 
        : 0
    };

    return NextResponse.json({
      period_days: days,
      daily_data: data || [],
      totals,
      overall_rates: overallRates,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Funnel analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
