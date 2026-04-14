/**
 * Model Weight Updater API Route
 * POST /api/v1/content/model/update
 *
 * Analyzes last 30 days of post_performance, computes correlations
 * Updates model_weights with new active row
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function correlation(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const denX = Math.sqrt(xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
  const denY = Math.sqrt(ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));

  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

export async function POST(req: NextRequest) {
  try {

    const supabase = getServiceClient();

    // Get last 30 days of performance data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: performanceData } = await supabase
      .from('post_performance')
      .select(
        'engagement_score, conversion_score, content_candidates(predicted_engagement, predicted_conversion, novelty_score, strategic_alignment, format_strength, audience_relevance, production_confidence)'
      )
      .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`);

    if (!performanceData || performanceData.length < 10) {
      // Not enough data, return default weights
      return NextResponse.json({
        ok: true,
        new_weights: null,
        note: 'Insufficient data points, keeping existing weights',
      });
    }

    // Extract arrays for correlation
    const actualEngagement = performanceData.map((p: any) => p.engagement_score || 0);
    const actualConversion = performanceData.map((p: any) => p.conversion_score || 0);
    const actualTotal = actualEngagement.map((e: any, i: any) => (e + actualConversion[i]) / 2);

    const predictedEngagement = performanceData.map((p: any) => p.content_candidates?.predicted_engagement || 0.5);
    const predictedConversion = performanceData.map((p: any) => p.content_candidates?.predicted_conversion || 0.5);
    const novelty = performanceData.map((p: any) => p.content_candidates?.novelty_score || 0.5);
    const strategic = performanceData.map((p: any) => p.content_candidates?.strategic_alignment || 0.5);
    const format = performanceData.map((p: any) => p.content_candidates?.format_strength || 0.5);
    const audience = performanceData.map((p: any) => p.content_candidates?.audience_relevance || 0.5);
    const production = performanceData.map((p: any) => p.content_candidates?.production_confidence || 0.5);

    // Compute correlations with actual total engagement
    const corr_engagement = correlation(predictedEngagement, actualTotal);
    const corr_conversion = correlation(predictedConversion, actualTotal);
    const corr_novelty = correlation(novelty, actualTotal);
    const corr_strategic = correlation(strategic, actualTotal);
    const corr_format = correlation(format, actualTotal);
    const corr_audience = correlation(audience, actualTotal);
    const corr_production = correlation(production, actualTotal);

    // Normalize to positive range and create new weights
    const correlations = [
      Math.max(0.01, corr_engagement),
      Math.max(0.01, corr_conversion),
      Math.max(0.01, corr_novelty),
      Math.max(0.01, corr_strategic),
      Math.max(0.01, corr_format),
      Math.max(0.01, corr_audience),
      Math.max(0.01, corr_production),
    ];

    const sum = correlations.reduce((a, b) => a + b, 0);
    const newWeights = {
      w_engagement: correlations[0] / sum,
      w_conversion: correlations[1] / sum,
      w_novelty: correlations[2] / sum,
      w_strategic: correlations[3] / sum,
      w_format: correlations[4] / sum,
      w_audience: correlations[5] / sum,
      w_production: correlations[6] / sum,
    };

    // Deactivate previous active weights
    const { data: previousActive } = await supabase
      .from('model_weights')
      .select('id')
      .eq('is_active', true)
      .single();

    if (previousActive) {
      await supabase.from('model_weights').update({ is_active: false }).eq('id', previousActive.id);
    }

    // Insert new weights
    const { data: inserted, error: insertErr } = await supabase
      .from('model_weights')
      .insert({
        ...newWeights,
        is_active: true,
        data_points_used: performanceData.length,
        notes: `Auto-updated from ${performanceData.length} data points in last 30 days`,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true, new_weights: inserted, data_points: performanceData.length });
  } catch (error) {
    console.error('Model update API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
