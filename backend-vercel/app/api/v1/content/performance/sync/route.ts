/**
 * Performance Sync API Route
 * POST /api/v1/content/performance/sync
 *
 * Reads instagram_post_performance, matches to post_queue and content_candidates
 * Writes to post_performance with engagement_score and conversion_score
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {

    const supabase = getServiceClient();

    // Get all instagram_post_performance records not yet synced
    const { data: igPerf } = await supabase
      .from('instagram_post_performance')
      .select('id, platform_post_id, likes, comments, saves, shares, reach, impressions, profile_visits')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!igPerf || igPerf.length === 0) {
      return NextResponse.json({ ok: true, synced: 0 });
    }

    let synced = 0;

    for (const post of igPerf) {
      try {
        // Try to find matching post_queue entry
        const { data: queueEntry } = await supabase
          .from('instagram_post_queue')
          .select('post_queue_id, content_candidate_id')
          .eq('platform_post_id', post.platform_post_id)
          .single();

        if (!queueEntry) continue;

        // Calculate scores
        const engagement_score =
          post.reach > 0
            ? ((post.likes || 0) + (post.comments || 0) * 3 + (post.saves || 0) * 5 + (post.shares || 0) * 7) / post.reach
            : 0;

        const conversion_score = post.reach > 0 ? (post.profile_visits || 0) / post.reach : 0;

        // Insert into post_performance
        const { error: insertErr } = await supabase.from('post_performance').insert({
          published_post_id: post.id,
          content_candidate_id: queueEntry.content_candidate_id,
          engagement_score: Math.min(1.0, engagement_score),
          conversion_score: Math.min(1.0, conversion_score),
          metrics: {
            likes: post.likes,
            comments: post.comments,
            saves: post.saves,
            shares: post.shares,
            reach: post.reach,
            impressions: post.impressions,
            profile_visits: post.profile_visits,
          },
        });

        if (!insertErr) {
          synced++;
        }
      } catch (error) {
        console.error(`Failed to sync performance for post ${post.id}:`, error);
      }
    }

    return NextResponse.json({ ok: true, synced });
  } catch (error) {
    console.error('Performance sync API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
