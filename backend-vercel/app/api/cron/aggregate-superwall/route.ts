/**
 * Cron Job - Aggregate Superwall Events into Metrics
 * GET /api/cron/aggregate-superwall
 * 
 * Aggregates Superwall webhook events from unified_paywall_events
 * into metrics_timeseries for dashboard consumption.
 * 
 * Should run every 15 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Aggregate Superwall events from unified_paywall_events
    const { data: events, error: eventsError } = await supabase
      .from('unified_paywall_events')
      .select('event_type, provider, platform, placement_id, revenue_usd')
      .eq('provider', 'superwall')
      .gte('occurred_at', todayStart.toISOString());

    if (eventsError) {
      console.error('[aggregate-superwall] Error fetching events:', eventsError);
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    // Calculate metrics
    const impressions = events?.filter(e => e.event_type === 'impression').length || 0;
    const conversions = events?.filter(e => e.event_type === 'conversion').length || 0;
    const dismissals = events?.filter(e => e.event_type === 'dismissal').length || 0;
    const revenue = events?.reduce((sum, e) => sum + (e.revenue_usd || 0), 0) || 0;
    const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;

    // Prepare metrics for upsert
    const metrics = [
      { metric_name: 'superwall.paywall_view', value: impressions },
      { metric_name: 'superwall.conversion', value: conversions },
      { metric_name: 'superwall.dismissal', value: dismissals },
      { metric_name: 'superwall.conversion_rate', value: conversionRate },
      { metric_name: 'superwall.revenue_usd', value: revenue },
      { metric_name: 'superwall.checkout', value: conversions }, // Alias for checkout
      { metric_name: 'superwall.cta_click', value: dismissals + conversions }, // CTA = engaged with paywall
    ];

    // Upsert into metrics_timeseries
    const rows = metrics.map(m => ({
      metric_name: m.metric_name,
      ts: now.toISOString(),
      value: m.value,
      labels: { provider: 'superwall', aggregation: 'daily' },
    }));

    const { error: upsertError } = await supabase
      .from('metrics_timeseries')
      .upsert(rows, { 
        onConflict: 'metric_name,ts',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('[aggregate-superwall] Error upserting metrics:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    console.log('[aggregate-superwall] ✅ Aggregated Superwall metrics:', {
      impressions,
      conversions,
      conversionRate: conversionRate.toFixed(1) + '%',
      revenue: '$' + revenue.toFixed(2),
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      metrics: {
        impressions,
        conversions,
        dismissals,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        revenue,
      },
    });

  } catch (error: any) {
    console.error('[aggregate-superwall] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
