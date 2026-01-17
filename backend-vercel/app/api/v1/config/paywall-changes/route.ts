/**
 * Paywall Config Changes History API
 * GET: Fetch config change history
 */

import { options, ok, badRequest } from '@/lib/cors';
import { getClientOrThrow } from '@/lib/supabase';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /api/v1/config/paywall-changes
 * Fetches paywall configuration change history
 * 
 * Query params:
 * - platform: 'mobile' | 'web' | 'all' (optional)
 * - limit: number (default: 50)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const supabase = getClientOrThrow(request);

    let query = supabase
      .from('paywall_config_changes')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    // Filter by platform if specified
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: changes, error } = await query;

    if (error) {
      console.error('[PaywallChanges] Error fetching changes:', error);
      return badRequest('Failed to fetch config changes', request);
    }

    return ok({ changes: changes || [], total: changes?.length || 0 }, request);

  } catch (error: any) {
    console.error('[PaywallChanges] Unexpected error:', error);
    return badRequest(error?.message || 'Internal server error', request);
  }
}
