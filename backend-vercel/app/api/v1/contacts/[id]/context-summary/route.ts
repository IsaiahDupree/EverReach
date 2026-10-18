import { options, ok, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "nodejs";

export function OPTIONS(req: Request){ return options(req); }

// GET /v1/contacts/:id/context-summary
export async function GET(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  try {
    const supabase = getClientOrThrow(req);

    // Contact basics
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, tags, warmth, warmth_band, last_interaction_at')
      .eq('id', params.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (cErr) return serverError(cErr.message, req);
    if (!contact) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    // Recent interactions (limit 5)
    const { data: inter, error: iErr } = await supabase
      .from('interactions')
      .select('id, kind, content, created_at')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(5);
    if (iErr) return serverError(iErr.message, req);

    // Compute last contact delta days
    const latestAt = contact.last_interaction_at || (inter && inter[0]?.created_at) || null;
    let last_contact_delta_days: number | null = null;
    if (latestAt) {
      const now = Date.now();
      const last = new Date(latestAt as string).getTime();
      last_contact_delta_days = Math.max(0, Math.round((now - last) / (1000 * 60 * 60 * 24)));
    }

    // Topics: take first 3 recent snippets (shortened)
    const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
    const last_topics: string[] = (inter || [])
      .map(r => (r.content || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(s => trim(s.replace(/\s+/g, ' '), 80));

    const interests: string[] = Array.isArray(contact.tags) ? contact.tags : [];
    const recent_interactions = (inter || []).map(r => ({ id: r.id, type: r.kind, created_at: r.created_at, snippet: trim((r.content || '').replace(/\s+/g, ' '), 120) }));

    return ok({
      last_contact_delta_days,
      last_topics,
      interests,
      warmth: contact.warmth ?? null,
      warmth_band: contact.warmth_band ?? null,
      recent_interactions,
    }, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
