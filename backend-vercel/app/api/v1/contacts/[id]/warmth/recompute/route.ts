import { options, ok, badRequest, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";
import { WARMTH_INTERACTION_KINDS } from "@/lib/warmth";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// POST /v1/contacts/:id/warmth/recompute
export async function POST(req: Request, { params }: { params: { id: string } }){
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    const supabase = getClientOrThrow(req);
    // Optional QA param to simulate time shift (in days)
    const url = new URL(req.url);
    const rawOffset = url.searchParams.get('offset_days');
    const parsed = rawOffset != null ? parseInt(rawOffset, 10) : 0;
    const offsetDays = Number.isFinite(parsed) ? Math.max(-90, Math.min(90, parsed)) : 0;
    const debug = url.searchParams.get('debug') === '1';
    const forceRecompute = url.searchParams.get('force') === '1';
    
    // Load contact basics
    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, last_interaction_at, warmth, warmth_updated_at, created_at')
      .eq('id', params.id)
      .maybeSingle();
    if (cErr) return serverError(cErr.message, req);
    if (!contact) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    // Debounce: Only recompute if warmth_updated_at is older than 6 hours (unless forced)
    const staleThreshold = 6 * 60 * 60 * 1000; // 6 hours in ms
    const lastUpdate = (contact as any).warmth_updated_at ? new Date((contact as any).warmth_updated_at).getTime() : 0;
    const nowMs = Date.now();
    
    if (!forceRecompute && (nowMs - lastUpdate) < staleThreshold) {
      console.log(`[Warmth] Skipping recompute for ${params.id} (updated ${Math.round((nowMs - lastUpdate) / 1000 / 60)}min ago)`);
      return ok({ 
        contact: { 
          id: contact.id, 
          warmth: contact.warmth, 
          warmth_updated_at: (contact as any).warmth_updated_at 
        },
        warmth_score: contact.warmth,
        from_cache: true,
        cached_age_minutes: Math.round((nowMs - lastUpdate) / 1000 / 60)
      }, req);
    }

    const now = nowMs + offsetDays * 24 * 60 * 60 * 1000;
    
    // Get last MEANINGFUL interaction (exclude internal notes)
    const { data: lastMeaningful } = await supabase
      .from('interactions')
      .select('created_at')
      .eq('contact_id', params.id)
      .in('kind', WARMTH_INTERACTION_KINDS)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Anchor for recency/decay: prefer last meaningful interaction; fallback to contact.created_at
    let anchorAtMs: number | undefined;
    let anchorSource: 'last_meaningful' | 'created_at' | null = null;
    if (lastMeaningful?.created_at) {
      anchorAtMs = new Date(lastMeaningful.created_at).getTime();
      anchorSource = 'last_meaningful';
    } else if ((contact as any)?.created_at) {
      anchorAtMs = new Date((contact as any).created_at).getTime();
      anchorSource = 'created_at';
    }
    const rawDays = anchorAtMs != null ? (now - anchorAtMs) / (1000 * 60 * 60 * 24) : undefined;
    const daysSince = typeof rawDays === 'number' ? Math.max(0, rawDays) : undefined;

    // interactions in last 90 days (only meaningful kinds)
    const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: interCount, error: iErr } = await supabase
      .from('interactions')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', params.id)
      .in('kind', WARMTH_INTERACTION_KINDS)
      .gte('created_at', since90);
    if (iErr) return serverError(iErr.message, req);

    // distinct kinds in last 30 days (proxy for channel breadth, only meaningful kinds)
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: kindsRows } = await supabase
      .from('interactions')
      .select('kind')
      .eq('contact_id', params.id)
      .in('kind', WARMTH_INTERACTION_KINDS)
      .gte('created_at', since30);
    const distinctKinds = new Set((kindsRows || []).map(r => r.kind)).size;

    // Starter-simple formula
    let warmth = 40; // base
    // recency boost: 0->90 days maps +25->+0
    let recencyBoost = 0;
    if (typeof daysSince === 'number') {
      const recency = clamp(90 - daysSince, 0, 90) / 90; // 1..0
      recencyBoost = Math.round(recency * 25);
      warmth += recencyBoost;
    }
    // frequency boost: up to +15, cap at 6 interactions
    const cnt = interCount ?? 0;
    const freq = clamp(cnt, 0, 6);
    const freqBoost = Math.round((freq / 6) * 15);
    warmth += freqBoost;
    // channel bonus: >=2 kinds in last 30d -> +5 else +0
    const channelBonus = distinctKinds >= 2 ? 5 : 0;
    warmth += channelBonus;
    // decay after 7 days: -0.5/day, cap -30
    let decay = 0;
    if (typeof daysSince === 'number' && daysSince > 7) {
      const dec = Math.min(30, (daysSince - 7) * 0.5);
      decay = Math.round(dec);
      warmth -= decay;
    }

    warmth = clamp(warmth, 0, 100);

    // Calculate warmth band from score
    let band: string;
    if (warmth >= 70) band = 'hot';
    else if (warmth >= 50) band = 'warm';
    else if (warmth >= 30) band = 'neutral';
    else if (warmth >= 15) band = 'cool';
    else band = 'cold';

    // Debug logging
    console.log(`[Warmth] Contact ${params.id}: anchor=${anchorSource || 'n/a'}, daysSince=${typeof daysSince === 'number' ? daysSince.toFixed(1) : 'n/a'}, interCount=${interCount}, distinctKinds=${distinctKinds}, warmth=${warmth}`);

    const { data: updated, error: uErr } = await supabase
      .from('contacts')
      .update({ warmth, warmth_band: band, warmth_updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, warmth, warmth_band, warmth_updated_at')
      .maybeSingle();
    if (uErr) return serverError(uErr.message, req);
    const payload: any = { contact: updated, warmth_score: warmth };
    if (debug) {
      payload.metrics = {
        offsetDays,
        lastMeaningfulAt: lastMeaningful?.created_at || null,
        createdAt: (contact as any)?.created_at || null,
        anchor: anchorSource,
        daysSince: typeof daysSince === 'number' ? Number(daysSince.toFixed(2)) : null,
        interCount: cnt,
        distinctKinds,
        recencyBoost,
        freqBoost,
        channelBonus,
        decay,
      };
    }
    return ok(payload, req);
  } catch (e: any) {
    return serverError(e?.message || 'Internal error', req);
  }
}
