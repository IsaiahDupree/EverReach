/**
 * QA-and-Queue-Fill Cron Route
 *
 * Chains: (1) QA run, (2) queue fill
 * Uses job_runs for idempotency
 *
 * Trigger: daily at 01:05 UTC
 * GET /api/cron/qa-and-queue-fill
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

async function qaAndQueueFill() {
  const supabase = getServiceClient();

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];

  // Check if already run today
  const { data: existingRun } = await supabase
    .from('job_runs')
    .select('id')
    .eq('job_name', 'qa-and-queue-fill')
    .eq('run_key', dateKey)
    .single();

  if (existingRun) {
    return { ok: true, approved: 0, rejected: 0, queue_depth: 0, note: 'Already ran today' };
  }

  let approved = 0;
  let rejected = 0;

  // Step 1: Run QA checks
  const { data: candidates } = await supabase
    .from('content_candidates')
    .select('id, pillar, cta_type, concept_text, content_copy_variants(caption, hook_sentence, cta_line), content_assets(id)')
    .eq('status', 'assets_done')
    .gte('created_at', `${dateKey}T00:00:00Z`);

  if (candidates && candidates.length > 0) {
    // Get recent data for QA checks
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: recentPublished } = await supabase
      .from('published_posts')
      .select('concept_text, pillar, cta_type')
      .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(5);

    const lastFivePillars = recentPublished?.map((p: any) => p.pillar) || [];
    const lastFiveCtas = recentPublished?.map((p: any) => p.cta_type) || [];
    const recentConcepts = recentPublished?.map((p: any) => p.concept_text) || [];

    for (const candidate of candidates) {
      const variant = candidate.content_copy_variants?.[0];
      const hasAsset = (candidate.content_assets?.length || 0) > 0;

      let rejectionReason = null;

      // Hard rejection checks
      if (!variant?.cta_line) {
        rejectionReason = 'no_cta';
      } else if (!hasAsset) {
        rejectionReason = 'no_asset';
      } else if ((variant?.caption?.length || 0) < 50 || (variant?.caption?.length || 0) > 2200) {
        rejectionReason = 'caption_length';
      } else if (
        recentConcepts.some((c: string) => {
          const sim = Math.min(candidate.concept_text.length, c.length) / Math.max(candidate.concept_text.length, c.length);
          return sim > 0.92;
        })
      ) {
        rejectionReason = 'duplicate_concept';
      } else if (lastFivePillars.filter((p: string) => p === candidate.pillar).length >= 3) {
        rejectionReason = 'pillar_frequency';
      } else if (lastFiveCtas.filter((c: string) => c === candidate.cta_type).length >= 3) {
        rejectionReason = 'cta_frequency';
      }

      if (rejectionReason) {
        await supabase
          .from('content_candidates')
          .update({ status: 'rejected', metadata: { rejection_reason: rejectionReason } })
          .eq('id', candidate.id);
        rejected++;
      } else {
        await supabase.from('content_candidates').update({ status: 'approved' }).eq('id', candidate.id);
        approved++;
      }
    }
  }

  // Step 2: Fill queue if below minimum
  const { data: queuedPosts } = await supabase
    .from('post_queue')
    .select('id')
    .eq('queue_status', 'queued');

  let queueDepth = queuedPosts?.length || 0;

  if (queueDepth < 7) {
    const needToAdd = Math.min(14 - queueDepth, 7);

    const { data: approvedCandidates } = await supabase
      .from('content_candidates')
      .select('id, total_score, concept_text')
      .eq('status', 'approved')
      .order('total_score', { ascending: false })
      .limit(needToAdd);

    if (approvedCandidates && approvedCandidates.length > 0) {
      for (const candidate of approvedCandidates) {
        try {
          const dedupeKey = `instagram:${candidate.id}:v1`;

          const { data: existing } = await supabase
            .from('post_queue')
            .select('id')
            .eq('dedupe_key', dedupeKey)
            .single();

          if (existing) continue;

          const { data: queueItem, error: insertErr } = await supabase
            .from('post_queue')
            .insert({
              content_candidate_id: candidate.id,
              queue_status: 'queued',
              queue_source: 'autonomous',
              dedupe_key: dedupeKey,
              auto_schedule: true,
            })
            .select('id')
            .single();

          if (insertErr) continue;

          const { error: igErr } = await supabase.from('instagram_post_queue').insert({
            content_candidate_id: candidate.id,
            post_queue_id: queueItem?.id,
            caption: `Post: ${candidate.concept_text}`,
            priority: 1,
            status: 'pending',
          });

          if (!igErr) queueDepth++;
        } catch (error) {
          console.error(`Queuing failed for candidate ${candidate.id}:`, error);
        }
      }
    }
  }

  // Record job run
  const { error: jobRunErr } = await supabase.from('job_runs').insert({
    job_name: 'qa-and-queue-fill',
    run_key: dateKey,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (jobRunErr) throw jobRunErr;

  return { ok: true, approved, rejected, queue_depth: queueDepth };
}

export async function GET() {
  try {
    const result = await qaAndQueueFill();
    return NextResponse.json(result);
  } catch (error) {
    console.error('QA-and-queue-fill cron failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
