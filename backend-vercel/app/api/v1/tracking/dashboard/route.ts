import { NextRequest, NextResponse } from 'next/server';
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * GET /v1/tracking/dashboard?appVersion=1.0.0&days=7
 * 
 * Get comprehensive analytics dashboard data
 */
export async function GET(req: NextRequest) {
  try {
    const appVersion = req.nextUrl.searchParams.get('appVersion') || '0.0.0';
    const days = parseInt(req.nextUrl.searchParams.get('days') || '7', 10);

    const supabase = getClientOrThrow(req);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get summary stats
    const { data: summary } = await supabase
      .from('tracking_coverage_summary')
      .select('*')
      .eq('app_version', appVersion)
      .maybeSingle();

    // Get recent events
    const { data: recentEvents } = await supabase
      .from('tracking_events')
      .select('event_name, route, created_at, user_id, authed')
      .eq('app_version', appVersion)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get route performance
    const { data: routeStats } = await supabase
      .from('tracking_route_seen')
      .select('route, views, total_duration_ms, last_seen_at')
      .eq('app_version', appVersion)
      .order('views', { ascending: false })
      .limit(50);

    // Get element interactions
    const { data: elementStats } = await supabase
      .from('tracking_element_seen')
      .select('route, element_id, label, taps, last_tapped_at')
      .eq('app_version', appVersion)
      .order('taps', { ascending: false })
      .limit(100);

    // Get missing coverage
    const { data: missingRoutes } = await supabase
      .from('tracking_missing_routes')
      .select('route, dynamic, file')
      .eq('app_version', appVersion);

    const { data: missingElements } = await supabase
      .from('tracking_missing_elements')
      .select('route, element_id, critical')
      .eq('app_version', appVersion);

    // Calculate event breakdown
    const eventBreakdown: Record<string, number> = {};
    (recentEvents || []).forEach(e => {
      eventBreakdown[e.event_name] = (eventBreakdown[e.event_name] || 0) + 1;
    });

    // Calculate route categories
    const routeCategories = {
      tabs: (routeStats || []).filter(r => r.route.includes('/(tabs)/')).length,
      auth: (routeStats || []).filter(r => r.route.includes('/sign-in') || r.route.includes('/onboarding')).length,
      contacts: (routeStats || []).filter(r => r.route.includes('/contact')).length,
      modals: (routeStats || []).filter(r => r.route.includes('/add-') || r.route.includes('/goal-') || r.route.includes('/message-')).length,
      settings: (routeStats || []).filter(r => r.route.includes('/settings') || r.route.includes('-settings')).length,
      test: (routeStats || []).filter(r => r.route.includes('-test')).length,
      other: 0,
    };
    routeCategories.other = (routeStats || []).length - Object.values(routeCategories).reduce((sum, count) => sum + count, 0);

    return ok({
      appVersion,
      period: `${days} days`,
      summary: summary || {
        total_routes: 0,
        covered_routes: 0,
        coverage_percent: 0,
        total_views: 0,
      },
      routeCategories,
      eventBreakdown,
      recentEvents: (recentEvents || []).slice(0, 50),
      topRoutes: (routeStats || []).slice(0, 20),
      topElements: (elementStats || []).slice(0, 30),
      coverage: {
        missingRoutes: missingRoutes || [],
        missingElements: missingElements || [],
        criticalMissing: (missingElements || []).filter(e => e.critical).length,
      },
      stats: {
        totalEvents: (recentEvents || []).length,
        uniqueRoutes: new Set((recentEvents || []).map(e => e.route)).size,
        authedEvents: (recentEvents || []).filter(e => e.authed).length,
        uniqueUsers: new Set((recentEvents || []).filter(e => e.user_id).map(e => e.user_id)).size,
      },
    }, req);

  } catch (error: any) {
    console.error('[Tracking] Error getting dashboard data:', error);
    return serverError("Internal server error", req);
  }
}
