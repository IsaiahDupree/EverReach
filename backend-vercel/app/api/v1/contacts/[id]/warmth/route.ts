import { options, ok, unauthorized, notFound, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /v1/contacts/:id/warmth
 * 
 * Returns current warmth score (no history)
 * 
 * Response:
 * {
 *   "contact_id": "uuid",
 *   "warmth": 65,
 *   "warmth_band": "hot",
 *   "last_interaction_at": "2025-10-27T12:00:00Z",
 *   "last_updated": "2025-10-29T08:00:00Z"
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
    
    // Fetch contact with warmth info
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, user_id, warmth, warmth_band, last_interaction_at, updated_at')
      .eq('id', params.id)
      .maybeSingle();

    if (cErr) return serverError(cErr.message, req);
    if (!contact) return notFound('Contact not found', req);
    if (contact.user_id !== user.id) return notFound('Contact not found', req);

    // Return current warmth
    return ok({
      contact_id: contact.id,
      warmth: contact.warmth || 0,
      warmth_band: contact.warmth_band || 'cold',
      last_interaction_at: contact.last_interaction_at,
      last_updated: contact.updated_at
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
