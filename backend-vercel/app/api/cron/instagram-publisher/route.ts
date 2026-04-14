/**
 * Instagram Autonomous Publisher — Cron Job
 *
 * Runs every hour. For each user with an enabled publisher config:
 *   1. Checks if it's time to post (based on learned frequency target).
 *   2. Picks the best time slot using Thompson Sampling.
 *   3. Grabs the next queued post.
 *   4. Publishes via the Instagram Graph API.
 *   5. Records the post in instagram_post_performance for later feedback.
 *
 * Trigger: every hour at :00 UTC
 * GET /api/cron/instagram-publisher
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import {
  getOrCreateConfig,
  pickNextSlot,
  shouldPostNow,
  seedPriors,
} from '@/lib/instagram-scheduler';

const GRAPH_API = 'https://graph.facebook.com/v22.0';

function getToken(): string | undefined {
  return process.env.INSTAGRAM_ACCESS_TOKEN;
}
function getIgUserId(): string | undefined {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
}

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Graph API (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function graphGet(path: string, params: URLSearchParams) {
  const res = await fetch(`${GRAPH_API}${path}?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`Graph API (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

async function waitForContainer(containerId: string, token: string, maxAttempts = 18) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const p = new URLSearchParams({ fields: 'status_code', access_token: token });
    const d = await graphGet(`/${containerId}`, p);
    if (d.status_code === 'FINISHED') return;
    if (d.status_code === 'ERROR') throw new Error('Container processing failed');
  }
  throw new Error('Container processing timed out');
}

async function publishPost(
  post: Record<string, unknown>,
  token: string,
  igUserId: string
): Promise<{ ig_media_id: string; permalink: string | null }> {
  const params: Record<string, string> = { access_token: token };

  let containerId: string;

  if (post.media_type === 'CAROUSEL_ALBUM') {
    const children = post.children as Array<{ image_url: string }>;
    const childIds = await Promise.all(
      children.map(async c => {
        const d = await graphPost(`/${igUserId}/media`, {
          image_url: c.image_url,
          is_carousel_item: 'true',
          access_token: token,
        });
        return d.id as string;
      })
    );
    const carouselP: Record<string, string> = {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      access_token: token,
    };
    if (post.caption) carouselP.caption = post.caption as string;
    if (post.location_id) carouselP.location_id = post.location_id as string;
    containerId = (await graphPost(`/${igUserId}/media`, carouselP)).id;

  } else if (post.media_type === 'REELS') {
    const p: Record<string, string> = {
      media_type: 'REELS',
      video_url: post.video_url as string,
      share_to_feed: String(post.share_to_feed ?? true),
      access_token: token,
    };
    if (post.caption) p.caption = post.caption as string;
    if (post.location_id) p.location_id = post.location_id as string;
    containerId = (await graphPost(`/${igUserId}/media`, p)).id;
    await waitForContainer(containerId, token);

  } else {
    // IMAGE or STORIES
    const p: Record<string, string> = {
      image_url: post.image_url as string,
      access_token: token,
    };
    if (post.media_type === 'STORIES') p.media_type = 'STORIES';
    if (post.caption && post.media_type !== 'STORIES') p.caption = post.caption as string;
    if (post.location_id) p.location_id = post.location_id as string;
    containerId = (await graphPost(`/${igUserId}/media`, p)).id;
  }

  const { id: igMediaId } = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: containerId,
    ...params,
  });

  // Fetch permalink
  let permalink: string | null = null;
  try {
    const d = await graphGet(`/${igMediaId}`, new URLSearchParams({ fields: 'permalink', access_token: token }));
    permalink = d.permalink ?? null;
  } catch { /* non-fatal */ }

  return { ig_media_id: igMediaId, permalink };
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getToken();
  const igUserId = getIgUserId();

  if (!token || !igUserId) {
    return NextResponse.json({
      skipped: true,
      reason: 'INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID not configured',
    });
  }

  const supabase = getServiceClient();
  const now = new Date();
  const results: Array<{ user_id: string; status: string; detail?: string }> = [];

  // Get all users with enabled publisher configs
  const { data: configs } = await supabase
    .from('instagram_publisher_config')
    .select('*')
    .eq('enabled', true);

  if (!configs || configs.length === 0) {
    // Auto-discover users with queued posts and create configs
    const { data: queuedUsers } = await supabase
      .from('instagram_post_queue')
      .select('user_id')
      .eq('status', 'queued');

    if (!queuedUsers?.length) {
      return NextResponse.json({ message: 'No queued posts or configs found', processed: 0 });
    }

    // Create configs for users with queued posts
    const uniqueUsers = [...new Set(queuedUsers.map(r => r.user_id))];
    for (const userId of uniqueUsers) {
      await getOrCreateConfig(supabase, userId);
    }
  }

  // Reload configs after possible seeding
  const { data: allConfigs } = await supabase
    .from('instagram_publisher_config')
    .select('*')
    .eq('enabled', true);

  for (const config of allConfigs ?? []) {
    try {
      // Should we post for this user right now?
      if (!shouldPostNow(config)) {
        results.push({ user_id: config.user_id, status: 'skipped', detail: 'not_time_yet' });
        continue;
      }

      // Check quiet hours
      const currentHour = now.getUTCHours();
      const { quiet_start_hour: qs, quiet_end_hour: qe } = config;
      const inQuiet = qs > qe
        ? (currentHour >= qs || currentHour < qe)
        : (currentHour >= qs && currentHour < qe);
      if (inQuiet) {
        results.push({ user_id: config.user_id, status: 'skipped', detail: 'quiet_hours' });
        continue;
      }

      // Get next queued post for this user (highest priority, oldest first)
      const { data: post } = await supabase
        .from('instagram_post_queue')
        .select('*')
        .eq('user_id', config.user_id)
        .in('status', ['queued', 'failed'])
        .lt('retry_count', 3)
        .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!post) {
        results.push({ user_id: config.user_id, status: 'skipped', detail: 'no_queued_posts' });
        continue;
      }

      // Mark as publishing
      await supabase
        .from('instagram_post_queue')
        .update({ status: 'publishing', updated_at: now.toISOString() })
        .eq('id', post.id);

      // Publish
      const { ig_media_id, permalink } = await publishPost(post, token, igUserId);

      const publishedAt = new Date();
      await supabase
        .from('instagram_post_queue')
        .update({
          status: 'published',
          ig_media_id,
          permalink,
          published_at: publishedAt.toISOString(),
          updated_at: publishedAt.toISOString(),
        })
        .eq('id', post.id);

      // Record in performance table (metrics fetched later by engagement-sync cron)
      await supabase.from('instagram_post_performance').insert({
        ig_media_id,
        queue_id: post.id,
        user_id: config.user_id,
        posted_at: publishedAt.toISOString(),
        hour_of_day: publishedAt.getUTCHours(),
        day_of_week: publishedAt.getUTCDay(),
        media_type: post.media_type,
      });

      // Update last_posted_at + posts_last_7d
      await supabase
        .from('instagram_publisher_config')
        .update({
          last_posted_at: publishedAt.toISOString(),
          posts_last_7d: config.posts_last_7d + 1,
          updated_at: publishedAt.toISOString(),
        })
        .eq('user_id', config.user_id);

      results.push({
        user_id: config.user_id,
        status: 'published',
        detail: `ig_media_id=${ig_media_id}${permalink ? `, url=${permalink}` : ''}`,
      });

    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[instagram-publisher] Error for user ${config.user_id}:`, msg);

      // Find the publishing post and mark as failed
      const { data: failedPost } = await supabase
        .from('instagram_post_queue')
        .select('id, retry_count')
        .eq('user_id', config.user_id)
        .eq('status', 'publishing')
        .single();

      if (failedPost) {
        const nextRetry = new Date(Date.now() + Math.pow(2, failedPost.retry_count) * 60 * 60 * 1000);
        await supabase
          .from('instagram_post_queue')
          .update({
            status: 'failed',
            error: msg,
            retry_count: failedPost.retry_count + 1,
            next_retry_at: nextRetry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', failedPost.id);
      }

      results.push({ user_id: config.user_id, status: 'error', detail: msg });
    }
  }

  const published = results.filter(r => r.status === 'published').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    message: `Instagram publisher complete`,
    published,
    skipped,
    errors,
    results,
    ran_at: now.toISOString(),
  });
}
