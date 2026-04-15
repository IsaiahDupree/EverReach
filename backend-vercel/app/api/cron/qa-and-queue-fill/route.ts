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

    for (const candidate of (candidates as any[])) {
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

  // Step 2: Queue approved static-format posts (IMAGE / founder_note / static_truth).
  // Carousel posts are handled separately by the carousel-render cron which
  // generates actual DALL-E slide images and inserts CAROUSEL_ALBUM rows directly.
  const { data: approvedStatic } = await supabase
    .from('content_candidates')
    .select(
      'id, total_score, concept_text, format, ' +
      'content_copy_variants(caption, hook_sentence, cta_line), ' +
      'content_assets(public_url, render_status)'
    )
    .eq('status', 'approved')
    .in('format', ['static_truth', 'founder_note', 'product_screenshot'])
    .order('total_score', { ascending: false })
    .limit(3);

  let queueDepth = 0;

  if (approvedStatic && approvedStatic.length > 0) {
    for (const candidate of (approvedStatic as any[])) {
      try {
        const variant = (candidate.content_copy_variants as any[])?.[0];
        const asset = (candidate.content_assets as any[])?.[0];

        // Only queue if we have a caption and a rendered image URL
        if (!variant?.caption || !asset?.public_url) continue;

        // Deduplicate
        const dedupeKey = `ig_static:${candidate.id}:v1`;
        const { data: existing } = await supabase
          .from('instagram_post_queue')
          .select('id')
          .eq('id', candidate.id) // check via concept lookup below instead
          .limit(1);

        // Simple dedupe via a comment-free lookup
        const { data: dupCheck } = await supabase
          .from('instagram_post_queue')
          .select('id')
          .eq('caption', variant.caption as string)
          .limit(1);
        if (dupCheck && dupCheck.length > 0) continue;

        const { error: igErr } = await supabase.from('instagram_post_queue').insert({
          media_type: 'IMAGE',
          image_url: asset.public_url as string,
          caption: variant.caption as string,
          auto_schedule: true,
          priority: 3,
          status: 'queued',
        });

        if (!igErr) {
          await supabase
            .from('content_candidates')
            .update({ status: 'queued' })
            .eq('id', candidate.id);
          queueDepth++;
        }
      } catch (error) {
        console.error(`Queuing failed for candidate ${candidate.id}:`, error);
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
    const msg = (error as any)?.message || JSON.stringify(error); return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
