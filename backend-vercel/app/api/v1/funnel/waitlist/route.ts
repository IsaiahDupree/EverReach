import { NextRequest } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * Calculate intent score and high intent flag based on answers
 * High Intent Rule: Real pain + 200+ contacts + urgency = high intent
 */
function calculateIntent(pain_point: string, network_size: string, urgency: string): { intent_score: number; is_high_intent: boolean } {
  let score = 0;
  
  // Pain point scoring (max 40 points)
  const painScores: Record<string, number> = {
    'forget_followup': 40,
    'dont_know_who': 35,
    'dont_know_what_to_say': 35,
    'scattered_contacts': 30,
    'just_curious': 5,
  };
  score += painScores[pain_point] || 0;
  
  // Network size scoring (max 30 points)
  const networkScores: Record<string, number> = {
    '0-50': 10,
    '50-200': 20,
    '200-1000': 30,
    '1000+': 30,
  };
  score += networkScores[network_size] || 0;
  
  // Urgency scoring (max 30 points)
  const urgencyScores: Record<string, number> = {
    'this_week': 30,
    'this_month': 25,
    'eventually': 10,
  };
  score += urgencyScores[urgency] || 0;
  
  // High intent: real pain + 200+ contacts + urgency this week/month
  const hasRealPain = pain_point !== 'just_curious';
  const hasLargeNetwork = network_size === '200-1000' || network_size === '1000+';
  const hasUrgency = urgency === 'this_week' || urgency === 'this_month';
  
  const is_high_intent = hasRealPain && hasLargeNetwork && hasUrgency;
  
  return { intent_score: score, is_high_intent };
}

/**
 * POST /api/v1/funnel/waitlist
 * Stores waitlist signup with all form data
 * No auth required - public endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      email,
      pain_point,
      network_size,
      urgency,
      event_id,
    } = body;

    if (!email) {
      return badRequest('Missing email', req);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequest('Invalid email format', req);
    }

    const supabase = getClientOrThrow(req);

    // Calculate intent
    const { intent_score, is_high_intent } = calculateIntent(
      pain_point || '',
      network_size || '',
      urgency || ''
    );

    // Insert waitlist signup
    const { data, error } = await supabase
      .from('waitlist_signups')
      .insert({
        session_id,
        email: email.toLowerCase().trim(),
        pain_point,
        network_size,
        urgency,
        intent_score,
        is_high_intent,
        event_id,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate email
      if (error.code === '23505') {
        return ok({ 
          success: true, 
          message: 'Already on waitlist',
          is_high_intent,
          intent_score,
        }, req);
      }
      console.error('[Funnel Waitlist] Error inserting signup:', error);
      return serverError("Internal server error", req);
    }

    // Update session last_seen_at
    if (session_id) {
      await supabase
        .from('sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('session_id', session_id);
    }

    return ok({ 
      success: true, 
      signup: data,
      is_high_intent,
      intent_score,
    }, req);

  } catch (error: any) {
    console.error('[Funnel Waitlist] Error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * GET /api/v1/funnel/waitlist?email=xxx
 * Check if email is already on waitlist
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return badRequest('Missing email query parameter', req);
    }

    const supabase = getClientOrThrow(req);

    const { data, error } = await supabase
      .from('waitlist_signups')
      .select('id, email, is_high_intent, created_at')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('[Funnel Waitlist] Error checking email:', error);
      return serverError("Internal server error", req);
    }

    return ok({ 
      exists: !!data,
      signup: data 
    }, req);

  } catch (error: any) {
    console.error('[Funnel Waitlist] Error:', error);
    return serverError("Internal server error", req);
  }
}
