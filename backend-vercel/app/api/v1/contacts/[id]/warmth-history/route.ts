import { options, ok, unauthorized, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /v1/contacts/:id/warmth-history
 * 
 * Primary endpoint: Returns warmth history with window parameter
 * 
 * Query Parameters:
 * - window (optional): Time window ('7d', '30d', '90d', default: '30d')
 * 
 * Response:
 * {
 *   "contact_id": "uuid",
 *   "window": "30d",
 *   "items": [
 *     {
 *       "date": "2025-10-01T00:00:00Z",
 *       "score": 62,
 *       "band": "warm"
 *     }
 *   ],
 *   "current": {
 *     "score": 65,
 *     "band": "hot",
 *     "last_updated": "2025-10-29T08:00:00Z"
 *   }
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
      .select('id, user_id, warmth, warmth_band, updated_at')
      .eq('id', params.id)
      .maybeSingle();

    if (cErr) return serverError(cErr.message, req);
    if (!contact) return notFound('Contact not found', req);
    if (contact.user_id !== user.id) return notFound('Contact not found', req);

    // Parse window parameter
    const url = new URL(req.url);
    const windowParam = url.searchParams.get('window') || '30d';
    
    // Validate window
    const validWindows = ['7d', '30d', '90d'];
    const window = validWindows.includes(windowParam) ? windowParam : '30d';
    
    // Calculate date threshold
    const days = parseInt(window.replace('d', ''), 10);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    const thresholdISO = threshold.toISOString();

    // Fetch warmth history within window
    const { data: historyRows, error: hErr } = await supabase
      .from('warmth_history')
      .select('recorded_at, score, band')
      .eq('contact_id', params.id)
      .gte('recorded_at', thresholdISO)
      .order('recorded_at', { ascending: true });

    if (hErr) return serverError(hErr.message, req);

    // Format response (primary format)
    const items = (historyRows || []).map(row => ({
      date: row.recorded_at,
      score: row.score,
      band: row.band
    }));

    const response = {
      contact_id: contact.id,
      window,
      items,
      current: {
        score: contact.warmth || 0,
        band: contact.warmth_band || 'cold',
        last_updated: contact.updated_at
      }
    };

    // Add cache headers (5 minutes)
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'private, max-age=300');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers
    });
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
