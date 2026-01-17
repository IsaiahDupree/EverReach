import { NextRequest } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /api/v1/funnel/event
 * Stores funnel events (Lead, CompleteRegistration, ViewContent, etc.)
 * No auth required - public endpoint for waitlist funnel
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      event_name,
      event_properties = {},
      event_id,
    } = body;

    if (!session_id) {
      return badRequest('Missing session_id', req);
    }

    if (!event_name) {
      return badRequest('Missing event_name', req);
    }

    const supabase = getClientOrThrow(req);

    // Insert funnel event
    const { data, error } = await supabase
      .from('funnel_events')
      .insert({
        session_id,
        event_name,
        event_properties: {
          ...event_properties,
          event_id, // For deduplication with Meta Pixel
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[Funnel Event] Error inserting event:', error);
      return serverError(`Database error: ${error.message}`, req);
    }

    // Update session last_seen_at
    await supabase
      .from('sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_id', session_id);

    return ok({ 
      success: true, 
      event: data,
      event_id: data.id 
    }, req);

  } catch (error: any) {
    console.error('[Funnel Event] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}

/**
 * GET /api/v1/funnel/event?session_id=xxx
 * Retrieves events for a session
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
      .from('funnel_events')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Funnel Event] Error fetching events:', error);
      return serverError(`Database error: ${error.message}`, req);
    }

    return ok({ events: data || [] }, req);

  } catch (error: any) {
    console.error('[Funnel Event] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
