// EWMA warmth score system — synced with production backend
// Formula: warmth = BASE + amplitude × e^(-λ × daysSinceUpdate)

export type WarmthMode = 'slow' | 'medium' | 'fast' | 'test';
export type WarmthBand = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LAMBDA_PER_DAY: Record<WarmthMode, number> = {
  slow: 0.040132,    // ~30 days to reach BASE (half-life ~17 days)
  medium: 0.085998,  // ~14 days to reach BASE (half-life ~8 days)
  fast: 0.171996,    // ~7 days to reach BASE (half-life ~4 days)
  test: 55.26,       // ~2 hours to reach BASE (half-life ~18 minutes)
};

const DEFAULT_MODE: WarmthMode = 'medium';
export const WMIN = 0;

const IMPULSE_WEIGHTS: Record<string, number> = {
  email: 5,
  sms: 4,
  dm: 4,
  call: 7,
  meeting: 9,
  note: 3,
  other: 5,
};

function impulseFor(kind?: string): number {
  const k = (kind || '').toLowerCase();
  return IMPULSE_WEIGHTS[k] ?? IMPULSE_WEIGHTS.other;
}

export async function updateAmplitudeForContact(supabase: any, contactId: string, kind?: string, nowIso?: string) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const nowMs = now.getTime();

  const { data: row } = await supabase
    .from('contacts')
    .select('amplitude, warmth_last_updated_at, warmth_mode')
    .eq('id', contactId)
    .maybeSingle();

  const mode: WarmthMode = row?.warmth_mode ?? DEFAULT_MODE;
  const lambda = LAMBDA_PER_DAY[mode];
  const prevAmp: number = row?.amplitude ?? 0;
  const lastUpdMs = row?.warmth_last_updated_at ? new Date(row.warmth_last_updated_at).getTime() : nowMs;
  const dtDays = Math.max(0, (nowMs - lastUpdMs) / (1000 * 60 * 60 * 24));
  const decay = Math.exp(-lambda * dtDays);

  const ampDecayed = prevAmp * decay;
  const ampNext = Math.min(100, ampDecayed + impulseFor(kind));

  await supabase
    .from('contacts')
    .update({ amplitude: ampNext, warmth_last_updated_at: now.toISOString(), last_interaction_at: now.toISOString() })
    .eq('id', contactId);
}

export function computeWarmthFromAmplitude(prevAmp: number, lastUpdatedAt: string | null, nowIso?: string, mode: WarmthMode = DEFAULT_MODE) {
  const base = 30;
  const lambda = LAMBDA_PER_DAY[mode];
  const now = nowIso ? new Date(nowIso) : new Date();
  const nowMs = now.getTime();
  const lastUpdMs = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : nowMs;
  const dtDays = Math.max(0, (nowMs - lastUpdMs) / (1000 * 60 * 60 * 24));
  const decay = Math.exp(-lambda * dtDays);
  const ampNow = (prevAmp ?? 0) * decay;
  let score = Math.max(0, Math.min(100, base + ampNow));
  let band = score >= 80 ? 'hot' : score >= 60 ? 'warm' : score >= 40 ? 'neutral' : score >= 20 ? 'cool' : 'cold';
  return { score: Math.round(score), band, ampNow };
}

export function getWarmthBand(score: number): WarmthBand {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}
