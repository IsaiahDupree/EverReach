/**
 * Instagram Post Queue API
 *
 * POST /api/v1/integrations/instagram/queue  — add a post to the autonomous queue
 * GET  /api/v1/integrations/instagram/queue  — view queue + model summary
 * DELETE /api/v1/integrations/instagram/queue?id=<uuid>  — cancel a queued post
 *
 * When auto_schedule=true (default), the publisher cron picks the optimal
 * time using Thompson Sampling. Pass scheduled_at to override.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { getServiceClient } from '@/lib/supabase';
import { getOrCreateConfig, pickNextSlot, getModelSummary } from '@/lib/instagram-scheduler';

// ─── POST — add to queue ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      media_type = 'IMAGE',
      image_url,
      video_url,
      children,
      caption,
      location_id,
      share_to_feed = true,
      priority = 5,
      auto_schedule = true,
      scheduled_at,          // ISO8601 override
    } = body;

    // Validate media
    if (media_type === 'IMAGE' || media_type === 'STORIES') {
      if (!image_url) return NextResponse.json({ error: 'image_url is required for IMAGE/STORIES' }, { status: 400 });
    } else if (media_type === 'REELS') {
      if (!video_url) return NextResponse.json({ error: 'video_url is required for REELS' }, { status: 400 });
    } else if (media_type === 'CAROUSEL_ALBUM') {
      if (!children || !Array.isArray(children) || children.length < 2) {
        return NextResponse.json({ error: 'CAROUSEL_ALBUM requires ≥2 children' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: `Unsupported media_type: ${media_type}` }, { status: 400 });
    }

    const supabase = getServiceClient();
    const config = await getOrCreateConfig(supabase, auth.userId!);

    // Determine scheduled time
    let resolvedScheduledAt: string | null = null;

    if (scheduled_at) {
      resolvedScheduledAt = new Date(scheduled_at).toISOString();
    } else if (auto_schedule) {
      // Use Thompson Sampling to pick the best next slot
      const slot = await pickNextSlot(supabase, auth.userId!, config);
      resolvedScheduledAt = slot?.scheduled_at.toISOString() ?? null;
    }

    // Insert into queue
    const { data: queued, error } = await supabase
      .from('instagram_post_queue')
      .insert({
        user_id: auth.userId,
        media_type,
        image_url,
        video_url,
        children,
        caption,
        location_id,
        share_to_feed,
        priority,
        auto_schedule,
        scheduled_at: resolvedScheduledAt,
        status: 'queued',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      queued_post: queued,
      scheduled_at: resolvedScheduledAt,
      will_auto_post: auto_schedule,
      message: resolvedScheduledAt
        ? `Post scheduled for ${new Date(resolvedScheduledAt).toUTCString()}`
        : 'Post queued — will be auto-scheduled by the publisher',
    });

  } catch (err) {
    console.error('[instagram/queue POST]', err);
    return NextResponse.json({ error: 'Failed to queue post', details: (err as Error).message }, { status: 500 });
  }
}

// ─── GET — view queue + model ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') ?? 'queued';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const { data: posts } = await supabase
      .from('instagram_post_queue')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('status', status)
      .order('scheduled_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    const summary = await getModelSummary(supabase, auth.userId!);

    return NextResponse.json({
      success: true,
      queue: posts ?? [],
      total: posts?.length ?? 0,
      model_summary: summary,
      fetched_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[instagram/queue GET]', err);
    return NextResponse.json({ error: 'Failed to fetch queue', details: (err as Error).message }, { status: 500 });
  }
}

// ─── DELETE — cancel a queued post ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = getServiceClient();

    const { data: post } = await supabase
      .from('instagram_post_queue')
      .select('status, user_id')
      .eq('id', id)
      .single();

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (post.user_id !== auth.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (post.status === 'published') return NextResponse.json({ error: 'Cannot cancel a published post' }, { status: 409 });
    if (post.status === 'publishing') return NextResponse.json({ error: 'Post is currently publishing' }, { status: 409 });

    await supabase
      .from('instagram_post_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true, cancelled_id: id });

  } catch (err) {
    console.error('[instagram/queue DELETE]', err);
    return NextResponse.json({ error: 'Failed to cancel post', details: (err as Error).message }, { status: 500 });
  }
}
