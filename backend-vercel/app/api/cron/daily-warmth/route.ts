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
import { computeWarmthFromAmplitude, type WarmthMode } from '@/lib/warmth-ewma';

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
    // Step 2: Recompute warmth via EWMA (same formula as recompute endpoint)
    // ──────────────────────────────────────────────
    console.log('[daily-warmth] Step 2: Recomputing warmth via EWMA...');
    try {
      const { data: contacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, warmth, amplitude, warmth_last_updated_at, warmth_mode')
        .is('deleted_at', null)
        .limit(1000);

      if (fetchError) throw fetchError;

      let recomputed = 0, decayed = 0, unchanged = 0, recomputeErrors = 0;

      for (const contact of contacts || []) {
        try {
          const mode: WarmthMode = (contact.warmth_mode as WarmthMode) || 'medium';
          const { score: warmth, band } = computeWarmthFromAmplitude(
            contact.amplitude ?? 0,
            contact.warmth_last_updated_at ?? null,
            undefined, // use current time
            mode
          );

          // Skip update if score hasn't changed
          if (warmth === (contact.warmth || 0)) { unchanged++; continue; }

          const { error: updateError } = await supabase
            .from('contacts')
            .update({ warmth, warmth_band: band, warmth_updated_at: new Date().toISOString() })
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
        unchanged,
        errors: recomputeErrors,
      };
      console.log(`[daily-warmth] Recomputed: ${recomputed}, decayed: ${decayed}, unchanged: ${unchanged}`);
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
