/**
 * Changelog API
 * 
 * Public endpoint for viewing shipped features
 * 
 * Endpoints:
 * - GET /api/v1/changelog - Get published changelog entries
 */

import { options, ok, serverError } from "@/lib/cors";
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export function OPTIONS(req: Request) { return options(req); }


/**
 * GET /api/v1/changelog
 * Get published changelog entries
 * 
 * Query params:
 * - version: Filter by version (e.g., "1.2.0")
 * - category: feature, improvement, bugfix, breaking
 * - limit: number (default 50, max 100)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const supabase = getServiceClient();

    let query = supabase
      .from('feature_changelog')
      .select(`
        *,
        feature:feature_requests(id, title, type, votes_count)
      `)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    // Filters
    if (version) {
      query = query.eq('version', version);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Changelog] Query error:', error);
      // Return empty result instead of 500 if table is empty or relationship broken
      return ok({
        success: true,
        data: [],
        grouped: {},
        count: 0,
      }, request, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' });
    }

    // Group by version
    const groupedByVersion: Record<string, any[]> = {};
    data?.forEach(entry => {
      const v = entry.version || 'Unknown';
      if (!groupedByVersion[v]) {
        groupedByVersion[v] = [];
      }
      groupedByVersion[v].push(entry);
    });

    return ok({
      success: true,
      data,
      grouped: groupedByVersion,
      count: data?.length || 0,
    }, request, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' });
  } catch (error: any) {
    console.error('[Changelog] Error:', error);
    return serverError('Internal server error', request);
  }
}
