/**
 * POST /api/v1/sessions/start
 * 
 * Start a new user session for tracking usage during trial
 * Call on app launch, login, or page load
 */

import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const supabase = getClientOrThrow(req);

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({ user_id: user.id })
      .select('id, started_at')
      .single();

    if (sessionError) {
      return serverError("Internal server error", req);
    }

    // Update first_seen_at if this is the first session
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_seen_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .is('first_seen_at', null);

    // If user already has first_seen_at, just update last_active_at
    if (profileError) {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }

    return ok({
      session_id: session.id,
      started_at: session.started_at,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
