/**
 * Signals Sync API Route
 *
 * POST /api/v1/content/signals/sync
 * Same logic as the cron job, but callable via API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {

    const supabase = getServiceClient();

    // Check if already run today
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    const { data: existingRun } = await supabase
      .from('job_runs')
      .select('id')
      .eq('job_name', 'signals-sync')
      .eq('run_key', dateKey)
      .single();

    if (existingRun) {
      return NextResponse.json({ ok: true, inserted: 0, note: 'Already ran today' });
    }

    const inserted: string[] = [];

    // Ingest top posts from instagram_post_performance
    const { data: topPosts } = await supabase
      .from('instagram_post_performance')
      .select('id, platform_post_id, caption, likes, comments, saves, shares, reach, pillar, format_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (topPosts && topPosts.length > 0) {
      const signals = topPosts.map((post: any) => ({
        source_type: 'instagram_performance',
        signal_category: 'pillar_success',
        signal_text: `High-performing post (${post.likes} likes, ${post.reach} reach): "${post.caption?.substring(0, 100)}"`,
        pillar: post.pillar || null,
        format: post.format_type || null,
        engagement_score: post.reach > 0 ? ((post.likes || 0) + (post.comments || 0) * 3 + (post.saves || 0) * 5 + (post.shares || 0) * 7) / post.reach : 0,
        source_id: post.platform_post_id,
        metadata: {
          post_id: post.platform_post_id,
          engagement: (post.likes || 0) + (post.comments || 0) * 3 + (post.saves || 0) * 5 + (post.shares || 0) * 7,
          format: post.format_type,
        },
      }));

      const { error: insertErr } = await supabase.from('content_signals').insert(signals);
      if (insertErr) throw insertErr;
      inserted.push(...signals.map((_, i) => `ig_perf_${i}`));
    }

    // Seed evergreen app-store review signals (matching CHECK constraints)
    const seedSignals = [
      {
        source_type: 'app_review',
        signal_category: 'pain_point',
        signal_text: 'Users mention: losing touch with old friends, reconnecting after years',
        pillar: 'friendship_fade',
      },
      {
        source_type: 'app_review',
        signal_category: 'pain_point',
        signal_text: 'Review highlights: how hard it is to make friends as an adult',
        pillar: 'adult_friendship_psychology',
      },
      {
        source_type: 'app_review',
        signal_category: 'topic_interest',
        signal_text: 'Common mention: structured approach to maintaining relationships',
        pillar: 'relationship_systems',
      },
      {
        source_type: 'app_review',
        signal_category: 'topic_interest',
        signal_text: 'Users appreciate: quantified relationship health metrics',
        pillar: 'warmth_score',
      },
      {
        source_type: 'app_review',
        signal_category: 'desire',
        signal_text: 'Feature request: smarter timing for reaching out to contacts',
        pillar: 'outreach_intelligence',
      },
      {
        source_type: 'app_review',
        signal_category: 'topic_interest',
        signal_text: 'Feedback: users need onboarding on relationship pillar framework',
        pillar: 'product_education',
      },
      {
        source_type: 'app_review',
        signal_category: 'desire',
        signal_text: 'Users mention: trust in data accuracy and privacy',
        pillar: 'proof_and_trust',
      },
      {
        source_type: 'app_review',
        signal_category: 'objection',
        signal_text: 'Review: users upgrade to Pro for advanced features',
        pillar: 'conversion',
      },
      {
        source_type: 'app_review',
        signal_category: 'pain_point',
        signal_text: 'Common pain point: maintaining childhood friendships over distance',
        pillar: 'friendship_fade',
      },
      {
        source_type: 'app_review',
        signal_category: 'pain_point',
        signal_text: 'Users report: anxiety about initiating contact with long-lost friends',
        pillar: 'adult_friendship_psychology',
      },
    ];

    const { error: seedErr } = await supabase.from('content_signals').insert(seedSignals);
    if (seedErr) throw seedErr;
    inserted.push(...seedSignals.map((_, i) => `seed_${i}`));

    // Record in job_runs
    const { error: jobRunErr } = await supabase.from('job_runs').insert({
      job_name: 'signals-sync',
      run_key: dateKey,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    if (jobRunErr) throw jobRunErr;

    return NextResponse.json({ ok: true, inserted: inserted.length });
  } catch (error) {
    console.error('Signals sync API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
