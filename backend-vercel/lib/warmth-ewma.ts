// Multi-mode warmth score system with anchor-based decay
// Anchor model: score(t) = Wmin + (anchor_score - Wmin) * e^{-λ (t - anchor_at)}
// This prevents score jumps when switching modes.

export type WarmthMode = 'slow' | 'medium' | 'fast' | 'test';

// Lambda constants for each mode (decay per day)
export const LAMBDA_PER_DAY: Record<WarmthMode, number> = {
  slow: 0.040132,    // ~30 days to reach score 30 (half-life ~17 days)
  medium: 0.085998,  // ~14 days to reach score 30 (half-life ~8 days)
  fast: 0.171996,    // ~7 days to reach score 30 (half-life ~4 days)
  test: 55.26,       // ~2 hours to reach score 0 (half-life ~18 minutes)
};

const DEFAULT_MODE: WarmthMode = 'medium';
export const WMIN = 0;  // Minimum warmth score
const DAY_MS = 86_400_000;

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
  const base = WMIN;  // decays to 0 with no interactions
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

// Calculate warmth score from last interaction (direct exponential decay)
export function warmthScoreFromLastTouch(
  lastTouchAt: Date | string | null,
  mode: WarmthMode = DEFAULT_MODE,
  nowIso?: string,
  w0 = 100,
  wmin = 0
): number {
  if (!lastTouchAt) return wmin;
  
  const lambda = LAMBDA_PER_DAY[mode];
  const now = nowIso ? new Date(nowIso) : new Date();
  const lastTouch = typeof lastTouchAt === 'string' ? new Date(lastTouchAt) : lastTouchAt;
  const dtDays = Math.max(0, (now.getTime() - lastTouch.getTime()) / (1000 * 60 * 60 * 24));
  
  const raw = wmin + (w0 - wmin) * Math.exp(-lambda * dtDays);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// Calculate days until warmth score reaches threshold
export function daysUntilThreshold(
  currentScore: number,
  mode: WarmthMode = DEFAULT_MODE,
  threshold = 30
): number {
  if (currentScore <= threshold) return 0;
  const lambda = LAMBDA_PER_DAY[mode];
  return (Math.log(currentScore) - Math.log(threshold)) / lambda;
}

// Get warmth band from score
export function getWarmthBand(score: number): string {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}

// Get mode metadata
export function getWarmthModeInfo(mode: WarmthMode) {
  const halfLifeDays = Math.log(2) / LAMBDA_PER_DAY[mode];
  const daysTo30 = daysUntilThreshold(100, mode, 30);
  
  return {
    mode,
    lambda: LAMBDA_PER_DAY[mode],
    halfLifeDays: Math.round(halfLifeDays * 10) / 10,
    daysToReachout: Math.round(daysTo30 * 10) / 10,
    description: {
      slow: '~30 days between touches',
      medium: '~14 days between touches',
      fast: '~7 days between touches',
      test: '~12 hours (testing only)',
    }[mode],
  };
}

// ============================================================
// ANCHOR-BASED MODEL (prevents score jump on mode switch)
// ============================================================

/**
 * Calculate warmth score from anchor point
 * Formula: score(t) = Wmin + (anchor_score - Wmin) * e^{-λ (t - anchor_at)}
 * 
 * @param anchorScore - Score at anchor time
 * @param anchorAt - Timestamp when anchor was set
 * @param mode - Warmth mode (determines decay rate)
 * @param now - Current time (defaults to now)
 * @param wmin - Minimum score (defaults to 0)
 */
export function warmthScoreFromAnchor(
  anchorScore: number,
  anchorAt: Date | string,
  mode: WarmthMode,
  now: Date = new Date(),
  wmin = WMIN
): number {
  const anchorTime = typeof anchorAt === 'string' ? new Date(anchorAt) : anchorAt;
  const dtDays = Math.max(0, (now.getTime() - anchorTime.getTime()) / DAY_MS);
  const lambda = LAMBDA_PER_DAY[mode];
  const raw = wmin + (anchorScore - wmin) * Math.exp(-lambda * dtDays);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Calculate days until score reaches threshold
 * Solves: threshold = wmin + (currentScore - wmin) * e^{-λ t}
 */
export function nextDueDays(
  currentScore: number,
  mode: WarmthMode,
  threshold = 30,
  wmin = WMIN
): number {
  if (currentScore <= threshold) return 0;
  const lambda = LAMBDA_PER_DAY[mode];
  return Math.log((currentScore - wmin) / (threshold - wmin)) / lambda;
}

/**
 * Apply mode switch without score jump (re-anchor to current score)
 * This is the key function for smooth mode transitions.
 * 
 * @param contact - Contact with current warmth state
 * @param newMode - New mode to switch to
 * @returns Updated warmth fields with no score discontinuity
 */
export function applyModeSwitchNoJump(
  contact: {
    warmth_mode: WarmthMode;
    warmth_anchor_score: number;
    warmth_anchor_at: string | Date;
  },
  newMode: WarmthMode
) {
  const now = new Date();
  
  // Calculate current score with OLD mode
  const currentScore = warmthScoreFromAnchor(
    contact.warmth_anchor_score,
    contact.warmth_anchor_at,
    contact.warmth_mode,
    now
  );

  // Re-anchor: keep the current score, reset time origin to now
  // This ensures C⁰ continuity (no jump) but changes future slope
  return {
    warmth_mode: newMode,
    warmth_anchor_score: currentScore,
    warmth_anchor_at: now.toISOString(),
    warmth: currentScore,
    warmth_band: getWarmthBand(currentScore),
    warmth_score_cached: currentScore,
    warmth_cached_at: now.toISOString(),
  };
}

/**
 * Apply touch event (meaningful interaction)
 * Resets anchor to high score at current time
 * 
 * @param intensity - Touch intensity (0=light, 1=normal, 2=strong)
 */
export function applyTouch(intensity: 0 | 1 | 2 = 1) {
  const now = new Date();
  const baseScore = 80 + 20 * intensity; // 80, 100, or 120
  const anchorScore = Math.min(100, baseScore);
  
  return {
    warmth_anchor_score: anchorScore,
    warmth_anchor_at: now.toISOString(),
    warmth: anchorScore,
    warmth_band: getWarmthBand(anchorScore),
    warmth_score_cached: anchorScore,
    warmth_cached_at: now.toISOString(),
  };
}
