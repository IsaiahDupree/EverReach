/**
 * QA Gate API Route
 * POST /api/v1/content/qa/run
 *
 * Hard-rejection rules:
 * - Duplicate concept (30 days) → reject
 * - Duplicate hook (14 days) → reject
 * - Pillar frequency (last 5 posts) 3+ times → reject
 * - CTA frequency (last 5 posts) 3+ times → reject
 * - No CTA → reject
 * - No asset → reject
 * - Caption < 50 or > 2200 → reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const supabase = getServiceClient();
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    // Get all assets_done candidates
    const { data: candidates } = await supabase
      .from('content_candidates')
      .select('*, content_copy_variants(caption, hook_sentence, cta_line), content_assets(id)')
      .eq('status', 'assets_done')
      .gte('created_at', `${dateKey}T00:00:00Z`);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ ok: true, approved: 0, rejected: 0, reasons: [] });
    }

    // Get recent published posts for deduplication
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
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

    const { data: recentHooks } = await supabase
      .from('published_posts')
      .select('hook_sentence')
      .gte('created_at', `${fourteenDaysAgo}T00:00:00Z`);

    const recentHookTexts = recentHooks?.map((p: any) => p.hook_sentence) || [];
    const recentConcepts = recentPublished?.map((p: any) => p.concept_text) || [];

    const reasons = [];
    let approved = 0;
    let rejected = 0;

    for (const candidate of candidates) {
      const variant = candidate.content_copy_variants?.[0];
      const hasAsset = (candidate.content_assets?.length || 0) > 0;

      let rejectionReason = null;

      // Check hard rejections
      if (!variant?.cta_line) {
        rejectionReason = 'no_cta';
      } else if (!hasAsset) {
        rejectionReason = 'no_asset';
      } else if ((variant?.caption?.length || 0) < 50 || (variant?.caption?.length || 0) > 2200) {
        rejectionReason = 'caption_length';
      } else if (
        recentConcepts.some((c: string) => {
          const similarity = Math.min(candidate.concept_text.length, c.length) / Math.max(candidate.concept_text.length, c.length);
          return similarity > 0.92;
        })
      ) {
        rejectionReason = 'duplicate_concept_30d';
      } else if (
        recentHookTexts.some((h: string) => {
          return h?.toLowerCase() === variant.hook_sentence?.toLowerCase();
        })
      ) {
        rejectionReason = 'duplicate_hook_14d';
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
        reasons.push(rejectionReason);
        rejected++;
      } else {
        await supabase.from('content_candidates').update({ status: 'approved' }).eq('id', candidate.id);
        approved++;
      }
    }

    return NextResponse.json({ ok: true, approved, rejected, reasons });
  } catch (error) {
    console.error('QA run API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
