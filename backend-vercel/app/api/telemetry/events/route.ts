import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /api/telemetry/events
 * 
 * @deprecated Use /api/v1/events/track instead
 * 
 * Track analytics events from mobile app
 * This is an alias for /api/v1/events/track to support legacy frontend code
 * 
 * Body:
 * {
 *   event: string (event name)
 *   properties?: Record<string, any> (event metadata)
 *   timestamp?: string (ISO 8601)
 * }
 */
export async function POST(req: Request){
  try {
    console.warn('[DEPRECATED] /api/telemetry/events is deprecated. Use /api/v1/events/track instead.');
    
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    let body: any;
    try { 
      body = await req.json(); 
    } catch { 
      return badRequest('invalid_json', req); 
    }

    // Support both 'event' and 'event_type' field names
    const eventType = String(body?.event || body?.event_type || '').trim();
    if (!eventType) {
      return badRequest('event or event_type is required', req);
    }

    const timestamp = body?.timestamp || new Date().toISOString();
    const properties = body?.properties || {};
    
    // Extract platform and app_version from properties or headers
    const platform = properties.platform || req.headers.get('x-platform') || 'web';
    const appVersion = properties.app_version || req.headers.get('x-app-version') || null;
    
    // Extract session info
    const sessionId = properties.session_id || null;
    const sessionInfo = sessionId ? { session_id: sessionId } : null;

    // Get device info from user agent
    const userAgent = req.headers.get('user-agent') || null;
    const deviceInfo = userAgent ? { user_agent: userAgent } : null;

    const supabase = getClientOrThrow(req);
    
    // Insert event into app_events table
    const { error } = await supabase
      .from('app_events')
      .insert({
        user_id: user.id,
        event_name: eventType,  // Required NOT NULL column
        event_type: eventType,  // Legacy nullable column
        platform: platform,
        app_version: appVersion,
        metadata: properties,
        device_info: deviceInfo,
        session_info: sessionInfo,
        occurred_at: timestamp,
      });

    if (error) {
      console.error('[Events API] Supabase insert error:', error);
      return serverError(`Database error: ${error.message}`, req);
    }

    return ok({ success: true, tracked: true, event_type: eventType }, req);
  } catch (e: any) {
    console.error('[Events API] Unexpected error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
