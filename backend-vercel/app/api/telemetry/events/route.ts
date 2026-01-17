import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { mirrorEventToSupabase } from "@/lib/event-mirror";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// POST /api/telemetry/events
// Body: { event: string; properties?: Record<string, any>; timestamp?: string }
export async function POST(req: Request){
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    let body: any;
    try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
    const eventName = String(body?.event || '').trim();
    if (!eventName || eventName.length < 2) return badRequest('invalid_event_name', req);

    const properties = (body?.properties && typeof body.properties === 'object') ? body.properties : {};

    // Minimal context from request
    const context = {
      user_agent: req.headers.get('user-agent') || null,
      referer: req.headers.get('referer') || null,
      path: new URL(req.url).pathname,
      timestamp: body?.timestamp || new Date().toISOString(),
    } as Record<string, any>;

    // Best-effort mirror to Supabase analytics table
    await mirrorEventToSupabase(eventName, user.id, null, properties, context);

    return ok({ tracked: true }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
