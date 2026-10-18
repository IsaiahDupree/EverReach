/**
 * Paywall Configuration History API
 * Get history of feature flag changes
 * 
 * GET /api/v1/config/paywall/history
 */

import { options, ok, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(request: Request) {
  try {
    // Auth check - require authenticated user
    const user = await getUser(request);
    if (!user) {
      return unauthorized('Authentication required', request);
    }

    const supabase = getClientOrThrow(request);

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const flagKey = url.searchParams.get('flag_key');

    // Build query
    let query = supabase
      .from('feature_flag_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)); // Cap at 100

    // Filter by flag key if provided
    if (flagKey) {
      query = query.eq('flag_key', flagKey);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('[PaywallHistory] Error fetching history:', error);
      return serverError('Failed to fetch history', request);
    }

    // Group by date for easier display
    const groupedByDate: { [date: string]: any[] } = {};
    
    (history || []).forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString();
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(item);
    });

    return ok({
      history: history || [],
      grouped_by_date: groupedByDate,
      total: (history || []).length,
    }, request);

  } catch (error: any) {
    console.error('[PaywallHistory] Unexpected error:', error);
    return serverError(error?.message || 'Internal server error', request);
  }
}
