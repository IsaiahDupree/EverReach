/**
 * Campaign Attribution Analysis
 * 
 * Analyze user's complete journey from ad → email → trial → purchase
 * 
 * GET /api/v1/marketing/attribution/:userId
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: {
    userId: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = getSupabase();
    const { userId } = params;

    // Fetch user's complete event journey
    const { data: events, error: eventsError } = await supabase
      .from('user_event')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Identify key milestones
    const firstTouch = events.find(e => 
      ['ad_click', 'ad_impression', 'landing_view'].includes(e.etype)
    );
    
    const emailCapture = events.find(e => e.etype === 'email_submitted');
    const enrichment = events.find(e => e.etype === 'identity_enriched');
    const trialStart = events.find(e => e.etype === 'trial_started');
    const purchase = events.find(e => e.etype === 'purchase_completed');

    // Calculate last touch before conversion
    const lastTouchBeforeEmail = emailCapture ? 
      events
        .filter(e => e.occurred_at < emailCapture.occurred_at)
        .filter(e => e.campaign_id)
        .slice(-1)[0] : null;

    const lastTouchBeforeTrial = trialStart ?
      events
        .filter(e => e.occurred_at < trialStart.occurred_at)
        .filter(e => e.campaign_id)
        .slice(-1)[0] : null;

    const lastTouchBeforePurchase = purchase ?
      events
        .filter(e => e.occurred_at < purchase.occurred_at)
        .filter(e => e.campaign_id)
        .slice(-1)[0] : null;

    // Calculate time deltas
    const timings = {
      first_touch_to_email: emailCapture && firstTouch ?
        daysBetween(firstTouch.occurred_at, emailCapture.occurred_at) : null,
      email_to_trial: trialStart && emailCapture ?
        daysBetween(emailCapture.occurred_at, trialStart.occurred_at) : null,
      trial_to_purchase: purchase && trialStart ?
        daysBetween(trialStart.occurred_at, purchase.occurred_at) : null,
      first_touch_to_purchase: purchase && firstTouch ?
        daysBetween(firstTouch.occurred_at, purchase.occurred_at) : null
    };

    // Calculate intent score at email capture
    const { data: intentScore } = await supabase.rpc('compute_intent_score', {
      p_user_id: userId,
      p_start_time: firstTouch?.occurred_at || null,
      p_end_time: emailCapture?.occurred_at || new Date().toISOString()
    });

    // Fetch persona
    const { data: persona } = await supabase
      .from('user_persona')
      .select('*, persona_bucket(*)')
      .eq('user_id', userId)
      .single();

    // Build attribution response
    return NextResponse.json({
      user_id: userId,
      journey: {
        first_touch: firstTouch || null,
        email_capture: emailCapture || null,
        enrichment: enrichment || null,
        trial_start: trialStart || null,
        purchase: purchase || null
      },
      attribution: {
        first_touch_channel: firstTouch?.properties?.channel || null,
        first_touch_campaign: firstTouch?.campaign_id || null,
        last_touch_before_email: lastTouchBeforeEmail || null,
        last_touch_before_trial: lastTouchBeforeTrial || null,
        last_touch_before_purchase: lastTouchBeforePurchase || null
      },
      timings,
      intent_score_at_email: intentScore,
      persona: persona?.persona_bucket || null,
      total_events: events.length,
      event_timeline: events.map(e => ({
        event: e.etype,
        occurred_at: e.occurred_at,
        campaign_id: e.campaign_id,
        source: e.source
      }))
    });

  } catch (error) {
    console.error('Attribution analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Calculate days between two timestamps
 */
function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
