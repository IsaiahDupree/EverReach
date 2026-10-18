/**
 * POST /api/v1/me/devices/register
 * 
 * Register a device for trial abuse prevention
 * Ties hashed device ID to user account
 * 
 * Body: { device_hash, platform, app_version }
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
    const { device_hash, platform, app_version } = body;

    // Validation
    if (!device_hash || !platform) {
      return badRequest('device_hash and platform are required', req);
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return badRequest('platform must be ios, android, or web', req);
    }

    const supabase = getClientOrThrow(req);

    // Upsert device (update last_seen_at if exists)
    const { data, error } = await supabase
      .from('devices')
      .upsert({
        user_id: user.id,
        device_hash,
        platform,
        app_version: app_version || null,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_hash',
      })
      .select('id, registered_at, last_seen_at')
      .single();

    if (error) {
      return serverError("Internal server error", req);
    }

    return ok({
      device_id: data.id,
      registered_at: data.registered_at,
      last_seen_at: data.last_seen_at,
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
