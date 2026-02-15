import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { computeWarmthFromAmplitude, type WarmthMode } from "@/lib/warmth-ewma";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// POST /v1/contacts/:id/warmth/recompute
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);
    // Optional test-only time travel support
    const allowTest = req.headers.get('x-allow-test') === 'true';
    const overrideNow = allowTest ? (req.headers.get('x-warmth-now') || undefined) : undefined;
    const now = overrideNow ? new Date(overrideNow).getTime() : Date.now();
    // Load contact basics
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, amplitude, warmth_last_updated_at, warmth_mode')
      .eq('id', params.id)
      .maybeSingle();
    if (cErr) return serverError('Internal server error', req);
    if (!contact) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    // EWMA-based compute from amplitude using contact's warmth_mode
    const mode: WarmthMode = (contact.warmth_mode as WarmthMode) || 'medium';
    const { score, band } = computeWarmthFromAmplitude(contact.amplitude ?? 0, contact.warmth_last_updated_at ?? null, overrideNow, mode);
    const warmth = score;

    const { data: updated, error: uErr } = await supabase
      .from('contacts')
      .update({ warmth, warmth_band: band })
      .eq('id', params.id)
      .select('id, warmth, warmth_band')
      .maybeSingle();
    if (uErr) return serverError('Internal server error', req);
    return ok({ contact: updated, warmth_score: updated?.warmth ?? warmth }, req);
  } catch (e: any) {
    return serverError('Internal server error', req);
  }
}
