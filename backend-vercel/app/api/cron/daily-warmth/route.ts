/**
 * Consolidated Cron Job: Daily Warmth Pipeline
 * GET /api/cron/daily-warmth
 * 
 * Merges (in order):
 * 1. /api/cron/warmth-snapshots — Record daily warmth score snapshots
 * 2. /api/cron/recompute-warmth — Apply time-based warmth decay
 * 
 * Note: check-warmth-alerts remains separate (runs at 9 AM, sends push notifs)
 * 
 * Schedule: 0 0 * * * (midnight UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large contact sets

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const supabase = getServiceClient();
    const startTime = Date.now();
    const results: Record<string, any> = {};

    // ──────────────────────────────────────────────
    // Step 1: Record warmth snapshots (was warmth-snapshots)
    // ──────────────────────────────────────────────
    console.log('[daily-warmth] Step 1: Recording snapshots...');
    try {
      const { data: contacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, warmth, warmth_band')
        .not('warmth', 'is', null)
        .order('id');

      if (fetchError) throw fetchError;

      let snapSuccess = 0, snapErrors = 0;

      for (const contact of contacts || []) {
        const { error: snapshotError } = await supabase.rpc('record_warmth_snapshot', {
          p_contact_id: contact.id,
          p_score: contact.warmth || 0,
          p_band: contact.warmth_band || 'cold',
        });
        snapshotError ? snapErrors++ : snapSuccess++;
      }

      results.snapshots = {
        total: contacts?.length || 0,
        success: snapSuccess,
        errors: snapErrors,
      };
      console.log(`[daily-warmth] Snapshots: ${snapSuccess}/${contacts?.length || 0}`);
    } catch (e: any) {
      console.error('[daily-warmth] Snapshots failed:', e);
      results.snapshots = { error: e.message };
    }

    // ──────────────────────────────────────────────
    // Step 2: Recompute warmth with decay (was recompute-warmth)
    // ──────────────────────────────────────────────
    console.log('[daily-warmth] Step 2: Recomputing warmth...');
    try {
      const { data: contacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, display_name, last_interaction_at, warmth')
        .is('deleted_at', null)
        .not('last_interaction_at', 'is', null)
        .order('last_interaction_at', { ascending: true })
        .limit(1000);

      if (fetchError) throw fetchError;

      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
      let recomputed = 0, decayed = 0, recomputeErrors = 0;
      const now = Date.now();

      for (const contact of contacts || []) {
        try {
          const lastAt = contact.last_interaction_at ? new Date(contact.last_interaction_at).getTime() : undefined;
          const daysSince = lastAt ? (now - lastAt) / (1000 * 60 * 60 * 24) : undefined;

          // Only recompute if > 7 days (when decay starts)
          if (!daysSince || daysSince <= 7) continue;

          // Get interaction counts
          const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
          const { count: interCount } = await supabase
            .from('interactions')
            .select('id', { count: 'exact', head: true })
            .eq('contact_id', contact.id)
            .gte('created_at', since90);

          const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: kindsRows } = await supabase
            .from('interactions')
            .select('kind')
            .eq('contact_id', contact.id)
            .gte('created_at', since30);
          const distinctKinds = new Set((kindsRows || []).map((r: any) => r.kind)).size;

          // Warmth formula
          let warmth = 30; // base
          const recency = clamp(90 - daysSince, 0, 90) / 90;
          warmth += Math.round(recency * 35);
          const freq = clamp(interCount ?? 0, 0, 6);
          warmth += Math.round((freq / 6) * 25);
          warmth += distinctKinds >= 2 ? 10 : 0;
          if (daysSince > 7) {
            warmth -= Math.round(Math.min(30, (daysSince - 7) * 0.5));
          }
          warmth = clamp(warmth, 0, 100);

          // Determine band
          let band = 'cold';
          if (warmth >= 70) band = 'hot';
          else if (warmth >= 50) band = 'warm';
          else if (warmth >= 30) band = 'neutral';
          else if (warmth >= 15) band = 'cool';

          const { error: updateError } = await supabase
            .from('contacts')
            .update({ warmth, warmth_band: band })
            .eq('id', contact.id);

          if (updateError) {
            recomputeErrors++;
          } else {
            recomputed++;
            if (warmth < (contact.warmth || 0)) decayed++;
          }
        } catch (err: any) {
          recomputeErrors++;
        }
      }

      results.recompute = {
        checked: contacts?.length || 0,
        recomputed,
        decayed,
        errors: recomputeErrors,
      };
      console.log(`[daily-warmth] Recomputed: ${recomputed}, decayed: ${decayed}`);
    } catch (e: any) {
      console.error('[daily-warmth] Recompute failed:', e);
      results.recompute = { error: e.message };
    }

    const duration = Date.now() - startTime;
    console.log(`[daily-warmth] Pipeline completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('[daily-warmth] Fatal error:', error);
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
