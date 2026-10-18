import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, badRequest, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /v1/tracking/register-manifest
 * 
 * Register app route manifest on boot
 * Called once when app initializes with complete list of pages
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appVersion, generatedAt, routes } = body;

    if (!appVersion || !routes || !Array.isArray(routes)) {
      return badRequest('Missing appVersion or routes array', req);
    }

    const supabase = getClientOrThrow(req);

    // Upsert all routes
    const rows = routes.map((r: any) => ({
      app_version: appVersion,
      route: r.route,
      dynamic: r.dynamic || false,
      file: r.file || '',
      generated_at: generatedAt || new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('tracking_route_manifest')
      .upsert(rows, { onConflict: 'app_version,route' });

    if (error) {
      console.error('[Tracking] Failed to register manifest:', error);
      return serverError("Internal server error", req);
    }

    return ok({ 
      registered: rows.length,
      appVersion,
    }, req);

  } catch (error: any) {
    console.error('[Tracking] Error registering manifest:', error);
    return serverError("Internal server error", req);
  }
}
