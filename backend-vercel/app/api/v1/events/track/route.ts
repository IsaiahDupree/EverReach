import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /api/v1/events/track
 * 
 * Track analytics events from mobile app
 * Stores events in app_events table
 * 
 * Body:
 * {
 *   event_type: string (snake_case)
 *   timestamp: string (ISO 8601)
 *   metadata: {
 *     session_id: string
 *     platform: 'ios' | 'android' | 'web'
 *     app_version: string
 *     ...other properties
 *   }
 * }
 */
export async function POST(req: Request){
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    let body: any;
    try { 
      body = await req.json(); 
    } catch { 
      return badRequest('invalid_json', req); 
    }

    const eventType = String(body?.event_type || '').trim();
    if (!eventType) {
      return badRequest('event_type is required', req);
    }

    const timestamp = body?.timestamp || new Date().toISOString();
    const metadata = body?.metadata || {};
    
    // Extract platform and app_version from metadata or headers
    const platform = metadata.platform || req.headers.get('x-platform') || 'unknown';
    const appVersion = metadata.app_version || req.headers.get('x-app-version') || null;
    
    // Extract session info
    const sessionId = metadata.session_id || null;
    const sessionInfo = sessionId ? { session_id: sessionId } : null;

    // Get device info from user agent
    const userAgent = req.headers.get('user-agent') || null;
    const deviceInfo = userAgent ? { user_agent: userAgent } : null;

    const supabase = getClientOrThrow(req);
    
    // Insert event into app_events table
    // If user doesn't exist (e.g., deleted but JWT still valid), set user_id to null
    const { error } = await supabase
      .from('app_events')
      .insert({
        user_id: user.id,
        event_name: eventType,      // Required NOT NULL column
        event_type: eventType,      // Legacy column (nullable)
        platform: platform,
        app_version: appVersion,
        metadata: metadata,
        device_info: deviceInfo,
        session_info: sessionInfo,
        occurred_at: timestamp,
      });

    if (error) {
      // If foreign key constraint fails (user doesn't exist), try with null user_id
      if (error.code === '23503' && error.message?.includes('user_id_fkey')) {
        console.warn(`[Events API] User ${user.id} not found in auth.users, inserting event with null user_id`);
        const { error: retryError } = await supabase
          .from('app_events')
          .insert({
            user_id: null,  // Allow anonymous events for deleted users
            event_name: eventType,
            event_type: eventType,
            platform: platform,
            app_version: appVersion,
            metadata: metadata,
            device_info: deviceInfo,
            session_info: sessionInfo,
            occurred_at: timestamp,
          });
        
        if (retryError) {
          console.error('[Events API] Supabase insert error (retry):', retryError);
          return serverError(`Database error: ${retryError.message}`, req);
        }
        // Successfully inserted with null user_id
        return ok({ tracked: true, event_type: eventType, anonymous: true }, req);
      }
      
      console.error('[Events API] Supabase insert error:', error);
      return serverError(`Database error: ${error.message}`, req);
    }

    return ok({ tracked: true, event_type: eventType }, req);
  } catch (e: any) {
    console.error('[Events API] Unexpected error:', e);
    return serverError(e?.message || 'Internal error', req);
  }
}
