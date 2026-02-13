/**
 * Marketing Intelligence Overview (Admin Dashboard)
 * 
 * GET /api/admin/marketing/overview
 * 
 * Returns comprehensive marketing analytics for admin dashboard
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/admin-middleware';

function getSupabase() { return getServiceClient(); }

export async function GET(req: NextRequest) {
  return requireAdminAuth(req, async (req, context) => {
    try {
      const supabase = getSupabase();
      // Fetch all marketing metrics in parallel
    const [funnelData, personaData, magnetismData, enrichmentData] = await Promise.all([
      // Funnel (last 30 days)
      supabase
        .from('mv_daily_funnel')
        .select('*')
        .gte('event_date', 'NOW() - INTERVAL \'30 days\'')
        .order('event_date', { ascending: false }),
      
      // Persona distribution
      supabase
        .from('mv_persona_performance')
        .select('*')
        .order('user_count', { ascending: false }),
      
      // Magnetism (7d)
      supabase
        .from('mv_user_magnetism_7d')
        .select('user_id, index_value'),
      
      // Enrichment stats (last 7 days)
      supabase
        .from('user_identity')
        .select('status, cost_cents, enriched_at')
        .gte('created_at', 'NOW() - INTERVAL \'7 days\'')
    ]);

    // Process funnel data
    const funnelTotals = funnelData.data?.reduce((acc, day) => ({
      emails_submitted: acc.emails_submitted + (day.emails_submitted || 0),
      trials_started: acc.trials_started + (day.trials_started || 0),
      purchases_completed: acc.purchases_completed + (day.purchases_completed || 0)
    }), { emails_submitted: 0, trials_started: 0, purchases_completed: 0 });

    const conversionRates = {
      email_to_trial: funnelTotals.emails_submitted > 0 
        ? (funnelTotals.trials_started / funnelTotals.emails_submitted) * 100 
        : 0,
      trial_to_purchase: funnelTotals.trials_started > 0 
        ? (funnelTotals.purchases_completed / funnelTotals.trials_started) * 100 
        : 0,
      email_to_purchase: funnelTotals.emails_submitted > 0 
        ? (funnelTotals.purchases_completed / funnelTotals.emails_submitted) * 100 
        : 0
    };

    // Process persona data
    const personaTotals = personaData.data?.reduce((acc, p) => ({
      total_users: acc.total_users + (p.user_count || 0)
    }), { total_users: 0 });

    const topPersonas = personaData.data?.slice(0, 3).map(p => ({
      slug: p.persona_slug,
      label: p.label,
      count: p.user_count,
      percentage: personaTotals.total_users > 0 
        ? (p.user_count / personaTotals.total_users) * 100 
        : 0
    }));

    // Process magnetism data
    const magnetismBands = {
      hot: 0,
      warm: 0,
      cooling: 0,
      cold: 0
    };

    magnetismData.data?.forEach(row => {
      const score = row.index_value || 0;
      if (score >= 70) magnetismBands.hot++;
      else if (score >= 50) magnetismBands.warm++;
      else if (score >= 30) magnetismBands.cooling++;
      else magnetismBands.cold++;
    });

    const avgMagnetism = magnetismData.data && magnetismData.data.length > 0
      ? magnetismData.data.reduce((sum, row) => sum + (row.index_value || 0), 0) / magnetismData.data.length
      : 0;

    // Process enrichment data
    const enrichmentData_total = enrichmentData.data?.length || 0;
    const enrichmentData_completed = enrichmentData.data?.filter(e => e.status === 'completed').length || 0;
    const enrichmentData_pending = enrichmentData.data?.filter(e => e.status === 'pending').length || 0;
    const enrichmentData_failed = enrichmentData.data?.filter(e => e.status === 'failed').length || 0;
    const enrichmentData_total_cost_usd = enrichmentData.data?.reduce((sum, e) => sum + ((e.cost_cents || 0) / 100), 0) || 0;
    
    const enrichmentStats = {
      total: enrichmentData_total,
      completed: enrichmentData_completed,
      pending: enrichmentData_pending,
      failed: enrichmentData_failed,
      total_cost_usd: enrichmentData_total_cost_usd,
      success_rate: enrichmentData_total > 0 ? (enrichmentData_completed / enrichmentData_total) * 100 : 0,
      avg_cost_usd: enrichmentData_completed > 0 ? enrichmentData_total_cost_usd / enrichmentData_completed : 0
    };

    // Build overview response
    return NextResponse.json({
      period: '30_days',
      funnel: {
        totals: funnelTotals,
        conversion_rates: {
          email_to_trial: Math.round(conversionRates.email_to_trial * 10) / 10,
          trial_to_purchase: Math.round(conversionRates.trial_to_purchase * 10) / 10,
          email_to_purchase: Math.round(conversionRates.email_to_purchase * 10) / 10
        }
      },
      personas: {
        total_users: personaTotals.total_users,
        top_3: topPersonas
      },
      magnetism: {
        average: Math.round(avgMagnetism),
        distribution: magnetismBands,
        high_risk_count: magnetismBands.cold,
        healthy_count: magnetismBands.warm + magnetismBands.hot
      },
      enrichment: {
        last_7_days: enrichmentStats,
        success_rate: Math.round(enrichmentStats.success_rate * 10) / 10,
        avg_cost: Math.round(enrichmentStats.avg_cost_usd * 1000) / 1000
      },
      generated_at: new Date().toISOString()
    });

    } catch (error) {
      console.error('Marketing overview error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: String(error) },
        { status: 500 }
      );
    }
  });
}
