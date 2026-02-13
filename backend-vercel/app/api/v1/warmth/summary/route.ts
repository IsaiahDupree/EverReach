import { options, ok, serverError, unauthorized, badRequest } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "edge";

export function OPTIONS(req: Request) {
  return options(req);
}

/**
 * GET /v1/warmth/summary
 * 
 * Returns an overview of relationship health across all contacts.
 * Includes:
 * - Total contact count
 * - Breakdown by warmth band (hot, warm, cooling, cold)
 * - Average warmth score
 * - Count of contacts needing attention
 */
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return unauthorized("Unauthorized", req);
  }

  // Rate limiting: 60 requests per minute
  const rl = checkRateLimit(`u:${user.id}:GET:/v1/warmth/summary`, 60, 60_000);
  if (!rl.allowed) {
    return badRequest(`Rate limited. Retry after ${rl.retryAfter}ms`, req);
  }

  try {
    const supabase = getClientOrThrow(req);

    // Get all contacts with warmth scores
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, warmth')
      .is('deleted_at', null); // Only active contacts

    if (error) {
      console.error('Error fetching contacts for warmth summary:', error);
      return serverError("Internal server error", req);
    }

    const contactsList = contacts || [];
    const totalContacts = contactsList.length;

    // Calculate warmth bands
    // Band thresholds: hot (81-100), warm (61-80), cooling (41-60), cold (0-40)
    const bands = {
      hot: 0,
      warm: 0,
      cooling: 0,
      cold: 0,
    };

    let totalWarmth = 0;

    for (const contact of contactsList) {
      const warmth = contact.warmth || 0;
      totalWarmth += warmth;

      if (warmth >= 81) {
        bands.hot++;
      } else if (warmth >= 61) {
        bands.warm++;
      } else if (warmth >= 41) {
        bands.cooling++;
      } else {
        bands.cold++;
      }
    }

    const averageScore = totalContacts > 0 
      ? Math.round((totalWarmth / totalContacts) * 10) / 10 // Round to 1 decimal
      : 0;

    // Contacts needing attention (cooling or cold)
    const contactsNeedingAttention = bands.cooling + bands.cold;

    const summary = {
      total_contacts: totalContacts,
      by_band: bands,
      average_score: averageScore,
      contacts_needing_attention: contactsNeedingAttention,
      last_updated_at: new Date().toISOString(),
    };

    return ok(summary, req);
  } catch (e: any) {
    console.error('Unexpected error in warmth summary:', e);
    return serverError("Internal server error", req);
  }
}
