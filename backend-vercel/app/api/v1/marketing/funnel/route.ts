/**
 * Funnel Analytics API
 * GET /api/v1/marketing/funnel
 * 
 * Returns conversion funnel data showing user progression through stages
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
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Compute funnel stages on-demand - using actual event types from our schema
    const stages = [
      { stage: 'ad_click', event: 'ad_click' },
      { stage: 'landing_view', event: 'landing_view' },
      { stage: 'email_submitted', event: 'email_submitted' },
      { stage: 'trial_started', event: 'trial_started' },
      { stage: 'purchase', event: 'purchase' },
    ];

    const funnelData = await Promise.all(
      stages.map(async ({ stage, event }) => {
        const { count } = await supabase
          .from('user_event')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', event);

        return {
          stage_name: stage,
          user_count: count || 0,
          conversion_rate: '0.00',
        };
      })
    );

    // Calculate conversion rates
    for (let i = 1; i < funnelData.length; i++) {
      const previousStage = funnelData[i - 1];
      const currentStage = funnelData[i];
      currentStage.conversion_rate = previousStage.user_count > 0
        ? ((currentStage.user_count / previousStage.user_count) * 100).toFixed(2)
        : '0.00';
    }

    return NextResponse.json({
      funnel: funnelData,
      summary: {
        total_stages: funnelData.length,
        top_of_funnel: funnelData[0]?.user_count || 0,
        bottom_of_funnel: funnelData[funnelData.length - 1]?.user_count || 0,
        overall_conversion_rate: funnelData[0]?.user_count > 0
          ? ((funnelData[funnelData.length - 1]?.user_count / funnelData[0]?.user_count) * 100).toFixed(2)
          : '0.00',
      },
      source: 'computed',
      filters: {
        date,
        start_date: startDate,
        end_date: endDate,
      },
    });

  } catch (error) {
    console.error('Funnel API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
