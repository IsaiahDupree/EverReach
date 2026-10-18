import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /v1/tracking/contract
 * 
 * Register expected elements/events for a route
 * Called by TrackedPressable and page contracts
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      appVersion, 
      route, 
      requiredElements = [], 
      requiredEvents = [], 
      critical = false 
    } = body;

    if (!appVersion || !route) {
      return badRequest('Missing appVersion or route', req);
    }

    const supabase = getClientOrThrow(req);

    // Check if contract exists
    const { data: existing } = await supabase
      .from('tracking_contracts')
      .select('required_elements, required_events')
      .eq('app_version', appVersion)
      .eq('route', route)
      .maybeSingle();

    let finalElements = requiredElements;
    let finalEvents = requiredEvents;

    if (existing) {
      // Merge with existing (add new, keep old)
      finalElements = [...new Set([
        ...(existing.required_elements || []),
        ...requiredElements
      ])];
      finalEvents = [...new Set([
        ...(existing.required_events || []),
        ...requiredEvents
      ])];
    }

    const { error } = await supabase
      .from('tracking_contracts')
      .upsert([{
        app_version: appVersion,
        route,
        required_elements: finalElements,
        required_events: finalEvents,
        critical,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'app_version,route' });

    if (error) {
      console.error('[Tracking] Failed to register contract:', error);
      return serverError("Internal server error", req);
    }

    return ok({ 
      route,
      requiredElements: finalElements.length,
      requiredEvents: finalEvents.length,
    }, req);

  } catch (error: any) {
    console.error('[Tracking] Error registering contract:', error);
    return serverError("Internal server error", req);
  }
}
