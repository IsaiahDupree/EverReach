/**
 * GET /api/v1/contacts/:id/warmth/timeline
 * 
 * Returns timeline of warmth score changes for a contact
 * Shows interactions, decay, mode changes, manual adjustments
 * 
 * Query params: ?limit=100
 */

import { options, ok, unauthorized, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (limit < 1 || limit > 500) {
      return badRequest('limit must be between 1 and 500', req);
    }

    const supabase = getClientOrThrow(req);

    // Verify contact ownership
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, warmth, warmth_band')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) {
      return serverError(contactError.message, req);
    }

    if (!contact) {
      return badRequest('Contact not found', req);
    }

    // Fetch warmth events
    const { data: events, error: eventsError } = await supabase
      .from('warmth_events')
      .select('created_at, type, delta, mode, note')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventsError) {
      return serverError(eventsError.message, req);
    }

    return ok({
      contact_id: params.id,
      current_score: contact.warmth || 0,
      current_band: contact.warmth_band || 'cold',
      events: (events || []).map(e => ({
        at: e.created_at,
        type: e.type,
        delta: e.delta,
        mode: e.mode,
        note: e.note,
      })),
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
