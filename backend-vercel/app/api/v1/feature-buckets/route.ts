/**
 * Feature Buckets API (AI-Powered Clustering)
 *
 * Endpoints:
 * - GET /api/v1/feature-buckets - List buckets (leaderboard)
 * - POST /api/v1/feature-buckets - Create bucket (admin)
 */

import { options, ok, serverError, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

/**
 * GET /api/v1/feature-buckets
 * List feature buckets with vote counts and momentum
 * 
 * Query params:
 * - sort: hot (momentum), top (votes), new (recent)
 * - status: backlog, planned, in_progress, shipped, declined
 * - limit: number (default 50, max 100)
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const url = new URL(req.url);
    const sort = url.searchParams.get('sort') || 'hot';
    const status = url.searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const supabase = getClientOrThrow(req);

    // Attempt to read from rollups for performance; fall back to base table on error
    let query = supabase.from('feature_bucket_rollups').select('*').limit(limit);
    if (status) query = query.eq('status', status);

    switch (sort) {
      case 'hot':
        query = query.order('momentum_7d', { ascending: false, nullsFirst: false }).order('votes_count', { ascending: false });
        break;
      case 'top':
        query = query.order('votes_count', { ascending: false }).order('last_activity_at', { ascending: false });
        break;
      case 'new':
        query = query.order('bucket_created_at', { ascending: false });
        break;
      default:
        query = query.order('votes_count', { ascending: false });
    }

    let { data, error } = await query;
    if (error) {
      // Fallback to base table without failing the endpoint
      let q2 = supabase.from('feature_buckets').select('*').limit(limit);
      if (status) q2 = q2.eq('status', status);
      const { data: fbData } = await q2;
      return ok({ buckets: fbData || [] }, req);
    }
    return ok({ buckets: data || [] }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}

/**
 * POST /api/v1/feature-buckets
 * Create a new bucket (admin only, or system)
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return badRequest('invalid_json', req);
    const { title, summary, description, status, priority, goal_votes, tags } = body as any;
    if (!title || typeof title !== 'string') return badRequest('title_required', req);

    const supabase = getClientOrThrow(req);
    const { data, error } = await supabase
      .from('feature_buckets')
      .insert([{
        title,
        summary,
        description,
        status: status || 'backlog',
        priority: priority || 'low',
        goal_votes: goal_votes || 100,
        tags: Array.isArray(tags) ? tags : [],
      }])
      .select('*')
      .single();
    if (error) return serverError(error.message, req);
    return ok({ bucket: data }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
