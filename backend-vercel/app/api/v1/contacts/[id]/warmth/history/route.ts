import { options, ok, unauthorized, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /v1/contacts/:id/warmth/history
 * 
 * Legacy endpoint: Returns warmth history with limit parameter
 * 
 * Query Parameters:
 * - limit (optional): Number of historical points (default: 30, max: 90)
 * 
 * Response:
 * {
 *   "history": [
 *     { "timestamp": "2025-10-01T00:00:00Z", "warmth": 62 },
 *     { "timestamp": "2025-10-02T00:00:00Z", "warmth": 64 }
 *   ]
 * }
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const supabase = getClientOrThrow(req);
    
    // Verify contact exists and user owns it
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, user_id')
      .eq('id', params.id)
      .maybeSingle();

    if (cErr) return serverError(cErr.message, req);
    if (!contact) return notFound('Contact not found', req);
    if (contact.user_id !== user.id) return notFound('Contact not found', req);

    // Parse limit parameter
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '30', 10)),
      90
    );

    // Fetch warmth history
    const { data: historyRows, error: hErr } = await supabase
      .from('warmth_history')
      .select('recorded_at, score')
      .eq('contact_id', params.id)
      .order('recorded_at', { ascending: true })
      .limit(limit);

    if (hErr) return serverError(hErr.message, req);

    // Format response (legacy format)
    const history = (historyRows || []).map(row => ({
      timestamp: row.recorded_at,
      warmth: row.score
    }));

    return ok({ history }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
