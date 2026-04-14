/**
 * Instagram Engagement Sync — Cron Job
 *
 * Runs daily. For posts published 24–72 hours ago that have no metrics yet:
 *   1. Fetch likes, comments, saves, reach, impressions from Graph API.
 *   2. Compute engagement_score.
 *   3. Update instagram_post_performance.
 *   4. Call updateModel() to feed the Thompson Sampling engine.
 *
 * Trigger: daily at 4am UTC
 * GET /api/cron/instagram-engagement-sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { updateModel, getOrCreateConfig } from '@/lib/instagram-scheduler';

const GRAPH_API = 'https://graph.facebook.com/v22.0';

function getToken() { return process.env.INSTAGRAM_ACCESS_TOKEN; }

async function graphGet(path: string, params: URLSearchParams) {
  const res = await fetch(`${GRAPH_API}${path}?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`Graph API (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function fetchPostMetrics(igMediaId: string, token: string) {
  // Fetch basic media fields
  const mediaParams = new URLSearchParams({
    fields: 'like_count,comments_count,timestamp',
    access_token: token,
  });
  const mediaData = await graphGet(`/${igMediaId}`, mediaParams);

  // Fetch insights (reach, impressions, saved)
  let reach = 0, impressions = 0, saves = 0, shares = 0;
  try {
    const insightParams = new URLSearchParams({
      metric: 'impressions,reach,saved,shares',
      access_token: token,
    });
    const insightData = await graphGet(`/${igMediaId}/insights`, insightParams);
    for (const m of insightData?.data ?? []) {
      if (m.name === 'reach') reach = m.values?.[0]?.value ?? m.value ?? 0;
      if (m.name === 'impressions') impressions = m.values?.[0]?.value ?? m.value ?? 0;
      if (m.name === 'saved') saves = m.values?.[0]?.value ?? m.value ?? 0;
      if (m.name === 'shares') shares = m.values?.[0]?.value ?? m.value ?? 0;
    }
  } catch {
    // Insights may not be available for all media types
  }

  return {
    likes: mediaData.like_count ?? 0,
    comments: mediaData.comments_count ?? 0,
    saves,
    shares,
    reach,
    impressions,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getToken();
  if (!token) {
    return NextResponse.json({ skipped: true, reason: 'INSTAGRAM_ACCESS_TOKEN not configured' });
  }

  const supabase = getServiceClient();
  const now = new Date();

  // Fetch posts that need metrics: published 24h–72h ago, no metrics yet
  const windowStart = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() - 23 * 3600 * 1000).toISOString();

  const { data: pendingPosts } = await supabase
    .from('instagram_post_performance')
    .select('*')
    .is('metrics_fetched_at', null)
    .gte('posted_at', windowStart)
    .lte('posted_at', windowEnd)
    .limit(50);

  if (!pendingPosts?.length) {
    return NextResponse.json({ message: 'No posts needing metrics sync', synced: 0 });
  }

  const results: Array<{ ig_media_id: string; status: string; engagement_score?: number }> = [];

  for (const post of pendingPosts) {
    try {
      const metrics = await fetchPostMetrics(post.ig_media_id, token);

      // Compute engagement score: (likes + comments*2 + saves*3 + shares*4) / reach
      const engagementScore = metrics.reach > 0
        ? (metrics.likes + metrics.comments * 2 + metrics.saves * 3 + metrics.shares * 4) / metrics.reach
        : 0;

      // Update performance record
      await supabase
        .from('instagram_post_performance')
        .update({
          likes: metrics.likes,
          comments: metrics.comments,
          saves: metrics.saves,
          shares: metrics.shares,
          reach: metrics.reach,
          impressions: metrics.impressions,
          metrics_fetched_at: now.toISOString(),
        })
        .eq('id', post.id);

      // Feed the learning model
      if (post.user_id) {
        const config = await getOrCreateConfig(supabase, post.user_id);
        await updateModel(
          supabase,
          post.user_id,
          post.hour_of_day,
          post.day_of_week,
          engagementScore,
          config
        );
      }

      results.push({ ig_media_id: post.ig_media_id, status: 'synced', engagement_score: engagementScore });

    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[engagement-sync] Error for ${post.ig_media_id}:`, msg);
      results.push({ ig_media_id: post.ig_media_id, status: 'error' });
    }
  }

  const synced = results.filter(r => r.status === 'synced').length;
  const avgEngagement = results
    .filter(r => r.engagement_score !== undefined)
    .reduce((sum, r) => sum + (r.engagement_score ?? 0), 0) / Math.max(synced, 1);

  return NextResponse.json({
    message: 'Engagement sync complete',
    synced,
    errors: results.filter(r => r.status === 'error').length,
    avg_engagement_score: Math.round(avgEngagement * 10000) / 100 + '%',
    ran_at: now.toISOString(),
  });
}
