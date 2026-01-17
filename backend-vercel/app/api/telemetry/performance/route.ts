import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { mirrorEventToSupabase } from "@/lib/event-mirror";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

// POST /api/telemetry/performance
// Body: { screen: string; load_time_ms: number; api_calls?: number; errors?: string[]; timestamp?: string }
export async function POST(req: Request){
  try {
    const user = await getUser(req);
    if (!user) return unauthorized('Unauthorized', req);

    let body: any;
    try { body = await req.json(); } catch { return badRequest('invalid_json', req); }

    const screen = String(body?.screen || '').trim();
    const loadTime = Number(body?.load_time_ms);
    if (!screen || !Number.isFinite(loadTime)) return badRequest('invalid_payload', req);

    const properties = {
      screen,
      load_time_ms: loadTime,
      api_calls: typeof body?.api_calls === 'number' ? body.api_calls : undefined,
      errors: Array.isArray(body?.errors) ? body.errors : undefined,
    } as Record<string, any>;

    const context = {
      user_agent: req.headers.get('user-agent') || null,
      path: new URL(req.url).pathname,
      timestamp: body?.timestamp || new Date().toISOString(),
    } as Record<string, any>;

    await mirrorEventToSupabase('performance_measured', user.id, null, properties, context);
    return ok({ tracked: true }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
