import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { WARMTH_INTERACTION_KINDS } from "@/lib/warmth";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

type Payload = { contact_ids?: string[] };

// POST /v1/warmth/recompute { contact_ids: [] }
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: Payload;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const ids = Array.isArray(body?.contact_ids) ? Array.from(new Set(body.contact_ids)).slice(0, 200) : [];
  if (!ids.length) return badRequest('contact_ids array required', req);

  const supabase = getClientOrThrow(req);
  const results: Array<{ id: string, warmth?: number, warmth_band?: string, error?: string }> = [];

  const now = Date.now();
  const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const id of ids) {
    try {
      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .select('id, last_interaction_at, warmth, created_at')
        .eq('id', id)
        .maybeSingle();
      if (cErr) { results.push({ id, error: cErr.message }); continue; }
      if (!contact) { results.push({ id, error: 'not_found' }); continue; }

      // Get last MEANINGFUL interaction (exclude internal notes)
      const { data: lastMeaningful } = await supabase
        .from('interactions')
        .select('created_at')
        .eq('contact_id', id)
        .in('kind', WARMTH_INTERACTION_KINDS)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Anchor for recency/decay: prefer last meaningful interaction; fallback to contact.created_at
      let anchorAtMs: number | undefined;
      if (lastMeaningful?.created_at) {
        anchorAtMs = new Date(lastMeaningful.created_at).getTime();
      } else if ((contact as any)?.created_at) {
        anchorAtMs = new Date((contact as any).created_at).getTime();
      }
      const rawDays = anchorAtMs != null ? (now - anchorAtMs) / (1000 * 60 * 60 * 24) : undefined;
      const daysSince = typeof rawDays === 'number' ? Math.max(0, rawDays) : undefined;

      const { count: interCount, error: iErr } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', id)
        .in('kind', WARMTH_INTERACTION_KINDS)
        .gte('created_at', since90);
      if (iErr) { results.push({ id, error: iErr.message }); continue; }

      const { data: kindsRows } = await supabase
        .from('interactions')
        .select('kind')
        .eq('contact_id', id)
        .in('kind', WARMTH_INTERACTION_KINDS)
        .gte('created_at', since30);
      const distinctKinds = new Set((kindsRows || []).map(r => r.kind)).size;

      let warmth = 40;
      if (typeof daysSince === 'number') {
        const recency = clamp(90 - daysSince, 0, 90) / 90; // 1..0
        warmth += Math.round(recency * 25);
      }
      const cnt = interCount ?? 0;
      const freq = clamp(cnt, 0, 6);
      warmth += Math.round((freq / 6) * 15);
      warmth += distinctKinds >= 2 ? 5 : 0;
      if (typeof daysSince === 'number' && daysSince > 7) {
        const dec = Math.min(30, (daysSince - 7) * 0.5);
        warmth -= Math.round(dec);
      }
      warmth = clamp(warmth, 0, 100);

      // Calculate band (align with single-contact recompute thresholds)
      let band: string;
      if (warmth >= 70) band = 'hot';
      else if (warmth >= 50) band = 'warm';
      else if (warmth >= 30) band = 'neutral';
      else if (warmth >= 15) band = 'cool';
      else band = 'cold';

      const { error: uErr } = await supabase
        .from('contacts')
        .update({ warmth, warmth_band: band, warmth_updated_at: new Date().toISOString() })
        .eq('id', id);
      if (uErr) { results.push({ id, error: uErr.message }); continue; }
      results.push({ id, warmth, warmth_band: band });
    } catch (e: any) {
      results.push({ id, error: e?.message || 'unexpected' });
    }
  }

  return ok({ results }, req);
}
