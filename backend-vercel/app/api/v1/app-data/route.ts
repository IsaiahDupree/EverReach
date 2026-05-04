/**
 * GET /api/v1/app-data
 * Batch endpoint returning core app data for mobile initial load.
 */

import { options, ok, unauthorized } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request) { return options(req); }

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  try {
    const supabase = getClientOrThrow(req);

    // Fetch core data in parallel
    const [contactsRes, interactionsRes, goalsRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, display_name, emails, phones, company, warmth, warmth_band, last_interaction_at, avatar_url, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase
        .from('interactions')
        .select('id, contact_id, type, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('goals')
        .select('id, title, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const contacts = contactsRes.data || [];
    const interactions = interactionsRes.data || [];
    const goals = goalsRes.data || [];

    // Compute warmth summary
    const byBand = { hot: 0, warm: 0, cool: 0, cold: 0 };
    let warmthSum = 0;
    for (const c of contacts) {
      const w = c.warmth ?? 0;
      warmthSum += w;
      if (w >= 80) byBand.hot++;
      else if (w >= 60) byBand.warm++;
      else if (w >= 40) byBand.cool++;
      else byBand.cold++;
    }

    return ok({
      contacts: contacts.map(c => ({
        id: c.id,
        fullName: c.display_name,
        email: c.emails?.[0],
        phone: c.phones?.[0],
        company: c.company,
        warmth: c.warmth,
        warmthBand: c.warmth_band,
        lastInteraction: c.last_interaction_at,
        avatarUrl: c.avatar_url,
      })),
      interactions: interactions.map(i => ({
        id: i.id,
        contactId: i.contact_id,
        type: i.type,
        content: i.content,
        createdAt: i.created_at,
      })),
      voiceNotes: [],
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        status: g.status,
      })),
      warmthSummary: {
        totalContacts: contacts.length,
        byBand,
        avgWarmth: contacts.length > 0 ? Math.round(warmthSum / contacts.length) : 0,
      },
      recentActivity: interactions.slice(0, 10).map(i => ({
        id: i.id,
        contactId: i.contact_id,
        type: i.type,
        content: i.content,
        createdAt: i.created_at,
      })),
    }, req);
  } catch (error: any) {
    console.error('[app-data] Error:', error);
    return ok({
      contacts: [],
      interactions: [],
      voiceNotes: [],
      goals: [],
      warmthSummary: { totalContacts: 0, byBand: { hot: 0, warm: 0, cool: 0, cold: 0 }, avgWarmth: 0 },
      recentActivity: [],
    }, req);
  }
}
