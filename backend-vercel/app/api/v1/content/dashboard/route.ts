/**
 * Dashboard API Route
 * GET /api/v1/content/dashboard
 *
 * Returns: queue_depth, today_brief, top_candidates, recent_performance,
 * model_weights, pipeline_status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {

    const supabase = getServiceClient();
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // 1. Queue depth
    const { data: queued } = await supabase
      .from('post_queue')
      .select('id')
      .eq('queue_status', 'queued');

    const queueDepth = queued?.length || 0;

    // 2. Today's strategy brief
    const { data: todayBrief } = await supabase
      .from('content_strategy_briefs')
      .select('id, primary_objective, secondary_objective, target_mix')
      .eq('scope_type', 'daily')
      .gte('created_at', `${dateKey}T00:00:00Z`)
      .single();

    // 3. Top 5 scored candidates
    const { data: topCandidates } = await supabase
      .from('content_candidates')
      .select('id, pillar, format, total_score, concept_text, status')
      .eq('status', 'scored')
      .order('total_score', { ascending: false })
      .limit(5);

    // 4. Recent performance (last 7 posts)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: recentPerf } = await supabase
      .from('post_performance')
      .select('id, engagement_score, conversion_score, content_candidates(pillar, format)')
      .gte('created_at', `${sevenDaysAgo}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(7);

    // 5. Active model weights
    const { data: weights } = await supabase
      .from('model_weights')
      .select('w_engagement, w_conversion, w_novelty, w_strategic, w_format, w_audience, w_production')
      .eq('is_active', true)
      .single();

    // 6. Pipeline status (last run time for each cron)
    const jobNames = [
      'signals-sync',
      'strategy-generate',
      'candidates-generate',
      'candidates-score',
      'copy-and-assets',
      'qa-and-queue-fill',
      'content-model-update',
    ];

    const { data: jobRuns } = await supabase
      .from('job_runs')
      .select('job_name, completed_at, status')
      .in('job_name', jobNames)
      .order('completed_at', { ascending: false });

    const pipelineStatus: any = {};
    for (const jobName of jobNames) {
      const job = jobRuns?.find((j: any) => j.job_name === jobName);
      pipelineStatus[jobName] = {
        last_completed: job?.completed_at || null,
        status: job?.status || 'pending',
      };
    }

    return NextResponse.json({
      ok: true,
      queue_depth: queueDepth,
      today_brief: todayBrief || {},
      top_candidates: topCandidates || [],
      recent_performance: recentPerf || [],
      model_weights: weights || {},
      pipeline_status: pipelineStatus,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
