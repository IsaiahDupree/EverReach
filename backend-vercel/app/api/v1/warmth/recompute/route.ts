import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { computeWarmthFromAmplitude, type WarmthMode } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

type Payload = { contact_ids?: string[] };

// POST /v1/warmth/recompute { contact_ids: [] }
// Bulk EWMA recompute — reads amplitude + warmth_last_updated_at, computes score
export async function POST(req: Request){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  let body: Payload;
  try { body = await req.json(); } catch { return badRequest('invalid_json', req); }
  const ids = Array.isArray(body?.contact_ids) ? Array.from(new Set(body.contact_ids)).slice(0, 200) : [];
  if (!ids.length) return badRequest('contact_ids array required', req);

  const supabase = getClientOrThrow(req);
  const results: Array<{ id: string, warmth?: number, warmth_band?: string, error?: string }> = [];

  for (const id of ids) {
    try {
      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .select('id, amplitude, warmth_last_updated_at, warmth_mode')
        .eq('id', id)
        .maybeSingle();
      if (cErr) { results.push({ id, error: 'Internal error' }); continue; }
      if (!contact) { results.push({ id, error: 'not_found' }); continue; }

      // EWMA-based compute from amplitude
      const mode: WarmthMode = (contact.warmth_mode as WarmthMode) || 'medium';
      const { score, band } = computeWarmthFromAmplitude(
        contact.amplitude ?? 0,
        contact.warmth_last_updated_at ?? null,
        undefined,
        mode
      );

      const { error: uErr } = await supabase
        .from('contacts')
        .update({ warmth: score, warmth_band: band })
        .eq('id', id);
      if (uErr) { results.push({ id, error: 'Update failed' }); continue; }
      results.push({ id, warmth: score, warmth_band: band });
    } catch (e: any) {
      results.push({ id, error: 'Internal error' });
    }
  }

  return ok({ results }, req);
}
