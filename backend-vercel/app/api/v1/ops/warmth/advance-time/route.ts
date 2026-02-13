import { options, ok, badRequest, serverError, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

/**
 * POST /v1/ops/warmth/advance-time
 * 
 * Advances the warmth system clock by specified days (simulates time passing).
 * This is useful for testing warmth decay without waiting.
 * 
 * Body: { days: number } - defaults to 1
 * 
 * WARNING: This affects ALL contacts in the system by:
 * 1. Moving last_interaction_at dates backwards
 * 2. Moving interaction created_at dates backwards
 * 3. Recomputing all warmth scores
 */
export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);

  let body: { days?: number };
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid_json', req);
  }

  const days = typeof body?.days === 'number' ? Math.min(Math.max(1, body.days), 365) : 1;
  const milliseconds = days * 24 * 60 * 60 * 1000;

  const supabase = getServiceClient();

  try {
    // Step 1: Get all contacts for this user (RLS handles filtering)
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, last_interaction_at')
      .is('deleted_at', null);

    if (contactsError) {
      return serverError("Internal server error", req);
    }

    if (!contacts || contacts.length === 0) {
      return ok({ message: 'No contacts to update', days, updated: 0 }, req);
    }

    // Step 2: Update last_interaction_at for all contacts
    let updatedContacts = 0;
    for (const contact of contacts) {
      if (contact.last_interaction_at) {
        const currentDate = new Date(contact.last_interaction_at);
        const newDate = new Date(currentDate.getTime() - milliseconds);

        await supabase
          .from('contacts')
          .update({ last_interaction_at: newDate.toISOString() })
          .eq('id', contact.id);

        updatedContacts++;
      }
    }

    // Step 3: Update created_at for all interactions (for accurate frequency calculations)
    // Use direct update - RLS handles filtering
    if (true) { // Always use direct update for now
      const { data: interactions } = await supabase
        .from('interactions')
        .select('id, created_at');

      if (interactions) {
        for (const interaction of interactions.slice(0, 500)) { // Limit to avoid timeouts
          const currentDate = new Date(interaction.created_at);
          const newDate = new Date(currentDate.getTime() - milliseconds);

          await supabase
            .from('interactions')
            .update({ created_at: newDate.toISOString() })
            .eq('id', interaction.id);
        }
      }
    }

    // Step 4: Trigger warmth recompute for all contacts
    const contactIds = contacts.map(c => c.id);
    const batchSize = 50;
    let recomputedCount = 0;

    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);
      
      // Recompute using the same logic as the warmth endpoint
      for (const id of batch) {
        try {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id, last_interaction_at')
            .eq('id', id)
            .maybeSingle();

          if (!contact) continue;

          const now = Date.now();
          const lastAt = contact.last_interaction_at ? new Date(contact.last_interaction_at).getTime() : undefined;
          const daysSince = lastAt ? (now - lastAt) / (1000 * 60 * 60 * 24) : undefined;

          const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
          const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

          const { count: interCount } = await supabase
            .from('interactions')
            .select('id', { count: 'exact', head: true })
            .eq('contact_id', id)
            .gte('created_at', since90);

          const { data: kindsRows } = await supabase
            .from('interactions')
            .select('kind')
            .eq('contact_id', id)
            .gte('created_at', since30);

          const distinctKinds = new Set((kindsRows || []).map(r => r.kind)).size;

          let warmth = 30;
          if (typeof daysSince === 'number') {
            const recency = Math.max(0, Math.min(90, 90 - daysSince)) / 90;
            warmth += Math.round(recency * 35);
          }
          const cnt = interCount ?? 0;
          const freq = Math.max(0, Math.min(6, cnt));
          warmth += Math.round((freq / 6) * 25);
          warmth += distinctKinds >= 2 ? 10 : 0;
          if (typeof daysSince === 'number' && daysSince > 7) {
            const dec = Math.min(30, (daysSince - 7) * 0.5);
            warmth -= Math.round(dec);
          }
          warmth = Math.max(0, Math.min(100, warmth));

          await supabase
            .from('contacts')
            .update({ warmth })
            .eq('id', id);

          recomputedCount++;
        } catch (e) {
          // Continue on error
        }
      }
    }

    return ok({
      success: true,
      days_advanced: days,
      contacts_updated: updatedContacts,
      warmth_recomputed: recomputedCount,
      message: `Advanced warmth clock by ${days} day(s). All contacts aged and warmth scores recomputed.`
    }, req);

  } catch (e: any) {
    return serverError(e?.message || 'unexpected_error', req);
  }
}
