/**
 * POST /api/v1/sessions/end
 * 
 * End a user session (idempotent)
 * Call on app background, logout, or page unload
 * 
 * Body: { session_id: string }
 */

import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const body = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return badRequest('session_id is required', req);
    }

    const supabase = getClientOrThrow(req);

    // End session using secure RPC (idempotent & user-scoped)
    const { error: endError } = await supabase.rpc('end_session_secure', {
      p_session_id: session_id,
      p_user_id: user.id,
    });

    if (endError) {
      return serverError(`Failed to end session: ${endError.message}`, req);
    }

    // Update last_active_at
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return ok({ ok: true }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
