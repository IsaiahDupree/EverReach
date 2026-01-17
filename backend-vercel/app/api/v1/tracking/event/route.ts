import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /v1/tracking/event
 * 
 * Ingest analytics events from mobile app
 * Handles: screen_view, screen_duration, ui_press, and custom events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, props = {} } = body;

    if (!event) {
      return badRequest('Missing event name', req);
    }

    const app_version = props.app_version || '0.0.0';
    const route = props.screen_name || props.route || 'unknown';
    const user_id = props.user_id || null;
    const authed = props.authed || false;

    const supabase = getClientOrThrow(req);

    // Log raw event
    await supabase
      .from('tracking_events')
      .insert([{
        app_version,
        event_name: event,
        route,
        user_id,
        authed,
        props,
      }])
      .select()
      .single();

    // Handle specific event types
    if (event === 'screen_view') {
      // Upsert route_seen (increment views)
      const { data: existing } = await supabase
        .from('tracking_route_seen')
        .select('views')
        .eq('app_version', app_version)
        .eq('route', route)
        .maybeSingle();

      await supabase
        .from('tracking_route_seen')
        .upsert([{
          app_version,
          route,
          user_id,
          authed,
          views: (existing?.views || 0) + 1,
          last_seen_at: new Date().toISOString(),
        }], { onConflict: 'app_version,route' });
    }

    if (event === 'screen_duration' && typeof props.duration_ms === 'number') {
      // Add duration to total
      const { data: existing } = await supabase
        .from('tracking_route_seen')
        .select('total_duration_ms')
        .eq('app_version', app_version)
        .eq('route', route)
        .maybeSingle();

      const totalDuration = (existing?.total_duration_ms || 0) + props.duration_ms;

      await supabase
        .from('tracking_route_seen')
        .upsert([{
          app_version,
          route,
          total_duration_ms: totalDuration,
          last_seen_at: new Date().toISOString(),
        }], { onConflict: 'app_version,route' });
    }

    // Track UI elements (buttons, etc)
    if ((event.startsWith('ui_') || event === 'press') && props.element_id) {
      const element_id = props.element_id;
      const label = props.label || null;

      const { data: existing } = await supabase
        .from('tracking_element_seen')
        .select('taps')
        .eq('app_version', app_version)
        .eq('route', route)
        .eq('element_id', element_id)
        .maybeSingle();

      await supabase
        .from('tracking_element_seen')
        .upsert([{
          app_version,
          route,
          element_id,
          label,
          taps: (existing?.taps || 0) + 1,
          last_tapped_at: new Date().toISOString(),
        }], { onConflict: 'app_version,route,element_id' });
    }

    return ok({ received: true }, req);

  } catch (error: any) {
    console.error('[Tracking] Error processing event:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
