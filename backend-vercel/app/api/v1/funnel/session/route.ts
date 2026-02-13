import { NextRequest } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/funnel/session
 * Creates or updates a tracking session for funnel analytics
 * No auth required - public endpoint for waitlist funnel
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      idea_id = 'everreach_waitlist',
      funnel_id = 'everreach_waitlist_v01',
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbp,
      fbc,
      meta_ad_id,
      meta_adset_id,
      meta_campaign_id,
      landing_url,
      referrer,
    } = body;

    if (!session_id) {
      return badRequest('Missing session_id', req);
    }

    const supabase = getClientOrThrow(req);

    // Get IP and user agent from request
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Upsert session
    const { data, error } = await supabase
      .from('sessions')
      .upsert({
        session_id,
        idea_id,
        funnel_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        fbp,
        fbc,
        meta_ad_id,
        meta_adset_id,
        meta_campaign_id,
        ip_address,
        user_agent,
        landing_url,
        referrer,
        last_seen_at: new Date().toISOString(),
      }, { 
        onConflict: 'session_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('[Funnel Session] Error upserting session:', error);
      return serverError("Internal server error", req);
    }

    return ok({ success: true, session: data }, req);

  } catch (error: any) {
    console.error('[Funnel Session] Error:', error);
    return serverError("Internal server error", req);
  }
}

/**
 * GET /api/v1/funnel/session?session_id=xxx
 * Retrieves session details
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
      return badRequest('Missing session_id query parameter', req);
    }

    const supabase = getClientOrThrow(req);

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ok({ session: null }, req);
      }
      console.error('[Funnel Session] Error fetching session:', error);
      return serverError("Internal server error", req);
    }

    return ok({ session: data }, req);

  } catch (error: any) {
    console.error('[Funnel Session] Error:', error);
    return serverError("Internal server error", req);
  }
}
