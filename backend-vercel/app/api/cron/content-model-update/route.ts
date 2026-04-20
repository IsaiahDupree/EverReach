/**
 * Content Model Update — Cron Job
 *
 * Chains: (1) performance sync, (2) model weight update
 * Trigger: daily at 04:20 UTC
 * GET /api/cron/content-model-update
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function correlation(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const denX = Math.sqrt(xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
  const denY = Math.sqrt(ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));

  return denX === 0 || denY === 0 ? 0 : num / (denX * denY);
}

async function contentModelUpdate() {
  const supabase = getServiceClient();

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Check if already run today
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'content-model-update')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, synced: 0, weights_updated: false, note: 'Already ran today' };
  }

  let synced = 0;
  let weightsUpdated = false;

  // Step 1: Sync performance
  const { data: igPerf } = await supabase
    .from('instagram_post_performance')
    .select('id, platform_post_id, likes, comments, saves, shares, reach, profile_visits')
    .order('created_at', { ascending: false })
    .limit(100);

  if (igPerf && igPerf.length > 0) {
    for (const post of igPerf) {
      try {
        const { data: queueEntry } = await supabase
          .from('instagram_post_queue')
          .select('content_candidate_id')
          .eq('platform_post_id', post.platform_post_id)
          .single();

        if (!queueEntry) continue;

        const engagement_score =
          post.reach > 0
            ? ((post.likes || 0) + (post.comments || 0) * 3 + (post.saves || 0) * 5 + (post.shares || 0) * 7) / post.reach
            : 0;

        const { error } = await supabase.from('post_performance').insert({
          published_post_id: post.id,
          content_candidate_id: queueEntry.content_candidate_id,
          engagement_score: Math.min(1.0, engagement_score),
          conversion_score: (post.profile_visits || 0) / (post.reach || 1),
          metrics: {
            likes: post.likes,
            comments: post.comments,
            saves: post.saves,
            shares: post.shares,
            reach: post.reach,
            profile_visits: post.profile_visits,
          },
        });

        if (!error) synced++;
      } catch (error) {
        console.error(`Failed to sync perf for post ${post.id}:`, error);
      }
    }
  }

  // Step 2: Update model weights
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: perfData } = await supabase
    .from('post_performance')
    .select(
      'engagement_score, conversion_score, content_candidates(predicted_engagement, predicted_conversion, novelty_score, strategic_alignment, format_strength, audience_relevance, production_confidence)'
    )
    .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`);

  if (perfData && perfData.length >= 10) {
    try {
      const actualEngagement = perfData.map((p: any) => p.engagement_score || 0);
      const actualConversion = perfData.map((p: any) => p.conversion_score || 0);
      const actualTotal = actualEngagement.map((e: any, i: any) => (e + actualConversion[i]) / 2);

      const predictedEngagement = perfData.map((p: any) => p.content_candidates?.predicted_engagement || 0.5);
      const predictedConversion = perfData.map((p: any) => p.content_candidates?.predicted_conversion || 0.5);
      const novelty = perfData.map((p: any) => p.content_candidates?.novelty_score || 0.5);
      const strategic = perfData.map((p: any) => p.content_candidates?.strategic_alignment || 0.5);
      const format = perfData.map((p: any) => p.content_candidates?.format_strength || 0.5);
      const audience = perfData.map((p: any) => p.content_candidates?.audience_relevance || 0.5);
      const production = perfData.map((p: any) => p.content_candidates?.production_confidence || 0.5);

      const correlations = [
        Math.max(0.01, correlation(predictedEngagement, actualTotal)),
        Math.max(0.01, correlation(predictedConversion, actualTotal)),
        Math.max(0.01, correlation(novelty, actualTotal)),
        Math.max(0.01, correlation(strategic, actualTotal)),
        Math.max(0.01, correlation(format, actualTotal)),
        Math.max(0.01, correlation(audience, actualTotal)),
        Math.max(0.01, correlation(production, actualTotal)),
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

      const { data: prevActive } = await supabase
        .from('model_weights')
        .select('id')
        .eq('is_active', true)
        .single();

      if (prevActive) {
        await supabase.from('model_weights').update({ is_active: false }).eq('id', prevActive.id);
      }

      const { error: insertErr } = await supabase
        .from('model_weights')
        .insert({
          ...newWeights,
          is_active: true,
          data_points_used: perfData.length,
          notes: `Auto-updated from ${perfData.length} data points`,
        });

      if (!insertErr) weightsUpdated = true;
    } catch (error) {
      console.error('Failed to update weights:', error);
    }
  }

  // Record job run
  const { error: jobRunErr } = await supabase.from('job_runs').insert({
    job_name: 'content-model-update',
    run_key: dateKey,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (jobRunErr) throw jobRunErr;

  return { ok: true, synced, weights_updated: weightsUpdated };
}

export async function GET() {
  try {
    const result = await contentModelUpdate();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Content model update cron failed:', error);
    const msg = (error as any)?.message || JSON.stringify(error); return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
