import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Cron Job: Daily Warmth Recomputation
 * Schedule: 0 1 * * * (1 AM UTC daily)
 * 
 * Recomputes warmth scores for all contacts to apply time-based decay.
 * This ensures warmth scores automatically decrease over time when
 * there are no interactions.
 * 
 * Decay Formula (from warmth/recompute/route.ts):
 * - After 7 days of no contact: -0.5 points/day
 * - Maximum decay: -30 points (at 67 days)
 * - Example: 30 days since last contact = -11.5 points
 * 
 * Flow:
 * 1. Authenticate via CRON_SECRET
 * 2. Fetch all active contacts
 * 3. Call recompute endpoint for each contact
 * 4. Return summary of recomputations
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    // Initialize Supabase service client
    const supabase = getServiceClient();

    // Fetch all active contacts (not deleted, with last_interaction_at)
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, display_name, last_interaction_at, warmth')
      .is('deleted_at', null)
      .not('last_interaction_at', 'is', null)
      .order('last_interaction_at', { ascending: true }) // Oldest first (most likely to need decay)
      .limit(1000); // Process up to 1000 contacts per run

    if (fetchError) {
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No contacts to recompute',
        recomputed: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Recompute warmth for each contact using the existing logic
    let successCount = 0;
    let errorCount = 0;
    let decayedCount = 0;
    const errors: string[] = [];

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

    for (const contact of contacts) {
      try {
        const now = Date.now();
        const lastAt = contact.last_interaction_at ? new Date(contact.last_interaction_at).getTime() : undefined;
        const daysSince = lastAt ? (now - lastAt) / (1000 * 60 * 60 * 24) : undefined;

        // Only recompute if > 7 days (when decay starts)
        if (!daysSince || daysSince <= 7) {
          continue; // Skip contacts that don't need decay yet
        }

        // Get interaction counts for this contact
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

        // Warmth formula (same as warmth/recompute endpoint)
        let warmth = 30; // base
        // recency boost: 0->90 days maps +35->+0
        if (typeof daysSince === 'number') {
          const recency = clamp(90 - daysSince, 0, 90) / 90;
          warmth += Math.round(recency * 35);
        }
        // frequency boost: up to +25, cap at 6 interactions
        const cnt = interCount ?? 0;
        const freq = clamp(cnt, 0, 6);
        warmth += Math.round((freq / 6) * 25);
        // channel bonus: >=2 kinds in last 30d -> +10
        warmth += distinctKinds >= 2 ? 10 : 0;
        // decay after 7 days: -0.5/day, cap -30
        if (typeof daysSince === 'number' && daysSince > 7) {
          const dec = Math.min(30, (daysSince - 7) * 0.5);
          warmth -= Math.round(dec);
        }

        warmth = clamp(warmth, 0, 100);

        // Determine band
        let band = 'cold';
        if (warmth >= 70) band = 'hot';
        else if (warmth >= 50) band = 'warm';
        else if (warmth >= 30) band = 'neutral';
        else if (warmth >= 15) band = 'cool';

        // Update contact
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ warmth, warmth_band: band })
          .eq('id', contact.id);

        if (updateError) {
          errorCount++;
          errors.push(`Contact ${contact.id}: ${updateError.message}`);
        } else {
          successCount++;
          // Track if warmth decreased (decay applied)
          if (warmth < (contact.warmth || 0)) {
            decayedCount++;
          }
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`Contact ${contact.id}: ${err.message}`);
      }
    }

    // Return summary
    const response = {
      success: true,
      message: 'Warmth recomputation completed',
      total_contacts_checked: contacts.length,
      recomputed: successCount,
      decayed: decayedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString()
    };

    // Log summary
    console.log('[CRON] Warmth Recomputation:', JSON.stringify(response));

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[CRON] Warmth recomputation failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
