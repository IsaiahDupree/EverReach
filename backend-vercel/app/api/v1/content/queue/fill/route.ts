/**
 * Queue Fill API Route
 * POST /api/v1/content/queue/fill
 *
 * Submits approved candidates to instagram_post_queue if backlog < 7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const supabase = getServiceClient();

    // Check current queue depth
    const { data: queuedPosts } = await supabase
      .from('post_queue')
      .select('id')
      .eq('queue_status', 'queued');

    const queueDepth = queuedPosts?.length || 0;

    // Only fill if below minimum
    if (queueDepth >= 7) {
      return NextResponse.json({ ok: true, added: 0, queue_depth: queueDepth, note: 'Queue already at capacity' });
    }

    const needToAdd = Math.min(14 - queueDepth, 7); // Fill to ideal backlog of 14, max 7 per run

    // Get top approved candidates not yet queued
    const { data: approved } = await supabase
      .from('content_candidates')
      .select('id, total_score, concept_text, pillar, format, cta_type')
      .eq('status', 'approved')
      .order('total_score', { ascending: false })
      .limit(needToAdd);

    if (!approved || approved.length === 0) {
      return NextResponse.json({ ok: true, added: 0, queue_depth: queueDepth });
    }

    let added = 0;

    for (const candidate of approved) {
      try {
        const dedupeKey = `instagram:${candidate.id}:v1`;

        // Check if already in post_queue
        const { data: existing } = await supabase
          .from('post_queue')
          .select('id')
          .eq('dedupe_key', dedupeKey)
          .single();

        if (existing) {
          console.log(`Candidate ${candidate.id} already queued`);
          continue;
        }

        // Insert into post_queue
        const { data: queueItem, error: insertErr } = await supabase
          .from('post_queue')
          .insert({
            content_candidate_id: candidate.id,
            queue_status: 'queued',
            queue_source: 'autonomous',
            dedupe_key: dedupeKey,
            auto_schedule: true,
            scheduled_for: null,
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error(`Failed to queue candidate ${candidate.id}:`, insertErr);
          continue;
        }

        // Submit to instagram_post_queue (existing integration)
        const { error: igErr } = await supabase.from('instagram_post_queue').insert({
          content_candidate_id: candidate.id,
          post_queue_id: queueItem?.id,
          caption: `Post: ${candidate.concept_text}`, // Will be replaced with full caption when published
          scheduled_for: null,
          priority: 1,
          status: 'pending',
        });

        if (igErr) {
          console.error(`Failed to submit to Instagram queue for candidate ${candidate.id}:`, igErr);
        } else {
          added++;
        }
      } catch (error) {
        console.error(`Error queuing candidate ${candidate.id}:`, error);
      }
    }

    const newQueueDepth = queueDepth + added;

    return NextResponse.json({ ok: true, added, queue_depth: newQueueDepth });
  } catch (error) {
    console.error('Queue fill API error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
