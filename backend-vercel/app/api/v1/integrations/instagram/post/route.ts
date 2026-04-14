/**
 * Instagram Content Publishing API
 * POST /api/v1/integrations/instagram/post  — create & publish (or schedule) a post
 * GET  /api/v1/integrations/instagram/post  — list recent published posts
 *
 * Supports: IMAGE, CAROUSEL_ALBUM, REELS, STORIES
 * Scheduling: pass scheduled_publish_time (ISO8601 or Unix ts) to schedule instead of publishing now
 *
 * Immediate publish flow:
 *   1. Create media container  → container_id
 *   2. (VIDEO) Poll status until FINISHED
 *   3. Publish container       → ig_media_id
 *
 * Scheduled publish flow:
 *   1. Create container with published=false + scheduled_publish_time
 *   2. (VIDEO) Poll status until FINISHED
 *   3. Publish container (Instagram publishes at scheduled time)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

const GRAPH_API = 'https://graph.facebook.com/v22.0';

function getToken(): string | undefined {
  return process.env.INSTAGRAM_ACCESS_TOKEN;
}

function getIgUserId(): string | undefined {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Graph API error (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

async function graphGet(path: string, params: URLSearchParams) {
  const res = await fetch(`${GRAPH_API}${path}?${params}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Graph API error (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`);
  }
  return data;
}

/** Poll container status until FINISHED or ERROR (max ~90 s) */
async function waitForContainer(containerId: string, token: string): Promise<void> {
  const maxAttempts = 18;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const params = new URLSearchParams({ fields: 'status_code', access_token: token });
    const data = await graphGet(`/${containerId}`, params);
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(`Container processing failed: ${data.status_code}`);
  }
  throw new Error('Container processing timed out after 90 s');
}

// ─── POST — publish a new post ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getToken();
    const igUserId = getIgUserId();

    if (!token || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      media_type = 'IMAGE', // IMAGE | REELS | STORIES | CAROUSEL_ALBUM
      image_url,            // public HTTPS URL (IMAGE / STORIES)
      video_url,            // public HTTPS URL (REELS)
      caption,
      location_id,
      children,             // array of { image_url } for CAROUSEL_ALBUM
      share_to_feed = true, // REELS: also show in feed
      thumb_offset,         // REELS: thumbnail offset in ms
      // Scheduling (optional — omit to publish immediately)
      // ISO8601 string or Unix timestamp. Must be 10 min–75 days in the future.
      scheduled_publish_time,
    } = body;

    // ── Resolve scheduled_publish_time to Unix seconds ────────────────────────
    let scheduledUnix: number | null = null;
    if (scheduled_publish_time) {
      const ts = typeof scheduled_publish_time === 'number'
        ? scheduled_publish_time
        : Math.floor(new Date(scheduled_publish_time).getTime() / 1000);
      const nowSec = Math.floor(Date.now() / 1000);
      const minOffset = 10 * 60;         // 10 minutes
      const maxOffset = 75 * 24 * 3600;  // 75 days
      if (ts < nowSec + minOffset || ts > nowSec + maxOffset) {
        return NextResponse.json(
          { error: 'scheduled_publish_time must be between 10 minutes and 75 days from now' },
          { status: 400 }
        );
      }
      scheduledUnix = ts;
    }

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (media_type === 'IMAGE' || media_type === 'STORIES') {
      if (!image_url) {
        return NextResponse.json({ error: 'image_url is required for IMAGE / STORIES' }, { status: 400 });
      }
    } else if (media_type === 'REELS') {
      if (!video_url) {
        return NextResponse.json({ error: 'video_url is required for REELS' }, { status: 400 });
      }
    } else if (media_type === 'CAROUSEL_ALBUM') {
      if (!children || !Array.isArray(children) || children.length < 2) {
        return NextResponse.json(
          { error: 'CAROUSEL_ALBUM requires a children array with at least 2 image_url entries' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported media_type: ${media_type}. Use IMAGE, REELS, STORIES, or CAROUSEL_ALBUM.` },
        { status: 400 }
      );
    }

    // ── Step 1: Create container(s) ──────────────────────────────────────────
    let containerId: string;

    if (media_type === 'CAROUSEL_ALBUM') {
      // Create child containers first
      const childIds: string[] = await Promise.all(
        children.map(async (child: { image_url: string }) => {
          const childParams: Record<string, string> = {
            image_url: child.image_url,
            is_carousel_item: 'true',
            access_token: token,
          };
          const childData = await graphPost(`/${igUserId}/media`, childParams);
          return childData.id as string;
        })
      );

      // Create parent carousel container
      const carouselParams: Record<string, string> = {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        access_token: token,
      };
      if (caption) carouselParams.caption = caption;
      if (location_id) carouselParams.location_id = location_id;
      if (scheduledUnix) {
        carouselParams.published = 'false';
        carouselParams.scheduled_publish_time = String(scheduledUnix);
      }

      const carouselData = await graphPost(`/${igUserId}/media`, carouselParams);
      containerId = carouselData.id;

    } else if (media_type === 'REELS') {
      const params: Record<string, string> = {
        media_type: 'REELS',
        video_url: video_url!,
        share_to_feed: String(share_to_feed),
        access_token: token,
      };
      if (caption) params.caption = caption;
      if (location_id) params.location_id = location_id;
      if (thumb_offset !== undefined) params.thumb_offset = String(thumb_offset);
      if (scheduledUnix) {
        params.published = 'false';
        params.scheduled_publish_time = String(scheduledUnix);
      }

      const data = await graphPost(`/${igUserId}/media`, params);
      containerId = data.id;

      // Reels need processing time before publish
      await waitForContainer(containerId, token);

    } else {
      // IMAGE or STORIES
      const params: Record<string, string> = {
        image_url: image_url!,
        access_token: token,
      };
      if (media_type === 'STORIES') params.media_type = 'STORIES';
      if (caption && media_type !== 'STORIES') params.caption = caption;
      if (location_id) params.location_id = location_id;
      if (scheduledUnix) {
        params.published = 'false';
        params.scheduled_publish_time = String(scheduledUnix);
      }

      const data = await graphPost(`/${igUserId}/media`, params);
      containerId = data.id;
    }

    // ── Step 2: Publish container ────────────────────────────────────────────
    const publishData = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: token,
    });

    const igMediaId = publishData.id as string;

    // ── Fetch post permalink for convenience ─────────────────────────────────
    let permalink: string | null = null;
    try {
      const params = new URLSearchParams({ fields: 'permalink,timestamp', access_token: token });
      const postData = await graphGet(`/${igMediaId}`, params);
      permalink = postData.permalink ?? null;
    } catch {
      // Non-fatal: permalink is a nice-to-have
    }

    return NextResponse.json({
      success: true,
      ig_media_id: igMediaId,
      container_id: containerId,
      media_type,
      permalink,
      ...(scheduledUnix
        ? {
            scheduled: true,
            scheduled_publish_time: new Date(scheduledUnix * 1000).toISOString(),
            status: 'SCHEDULED',
          }
        : {
            scheduled: false,
            published_at: new Date().toISOString(),
            status: 'PUBLISHED',
          }),
    });

  } catch (error) {
    console.error('Instagram post error:', error);
    return NextResponse.json(
      { error: 'Failed to publish Instagram post', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// ─── GET — list recent posts ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getToken();
    const igUserId = getIgUserId();

    if (!token || !igUserId) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10), 50);
    const cursor = searchParams.get('cursor') ?? null;
    const includeScheduled = searchParams.get('scheduled') === 'true';

    const params = new URLSearchParams({
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: String(limit),
      access_token: token,
    });
    if (cursor) params.set('after', cursor);

    const data = await graphGet(`/${igUserId}/media`, params);

    // Optionally also fetch scheduled containers
    let scheduledPosts: unknown[] = [];
    if (includeScheduled) {
      try {
        const schedParams = new URLSearchParams({
          fields: 'id,caption,media_type,scheduled_publish_time,status',
          access_token: token,
        });
        const schedData = await graphGet(`/${igUserId}/media`, schedParams);
        scheduledPosts = (schedData.data ?? []).filter(
          (p: { status?: string }) => p.status === 'SCHEDULED'
        );
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      posts: data.data ?? [],
      scheduled: includeScheduled ? scheduledPosts : undefined,
      paging: data.paging ?? null,
      fetched_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Instagram list posts error:', error);
    return NextResponse.json(
      { error: 'Failed to list Instagram posts', details: (error as Error).message },
      { status: 500 }
    );
  }
}
