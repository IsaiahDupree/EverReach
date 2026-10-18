import { NextRequest, NextResponse } from 'next/server';
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { options, ok, unauthorized, serverError } from "@/lib/cors";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * GET /v1/contacts/import/list
 * 
 * List all import jobs for the authenticated user
 * 
 * Query params:
 * - limit: Number of jobs to return (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - provider: Filter by provider (optional)
 * - status: Filter by status (optional)
 */
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const provider = searchParams.get('provider');
  const status = searchParams.get('status');

  const supabase = getClientOrThrow(req);

  try {
    let query = supabase
      .from('contact_import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (provider) {
      query = query.eq('provider', provider);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('[Import List] Database error:', error);
      return serverError("Internal server error", req);
    }

    return ok({
      jobs: jobs || [],
      total: count || 0,
      limit,
      offset,
    }, req);

  } catch (error: any) {
    console.error('[Import List] Error:', error);
    return serverError("Internal server error", req);
  }
}
