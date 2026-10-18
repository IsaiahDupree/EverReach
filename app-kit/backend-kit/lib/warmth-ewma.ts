/**
 * APP-KIT: Warmth EWMA (Exponentially Weighted Moving Average)
 *
 * Server-side warmth scoring for contacts. The frontend should
 * NEVER compute warmth — it only displays `warmth` and `warmth_band`
 * from the database.
 *
 * Formula: score = BASE + amplitude × e^(-λ × daysSinceUpdate)
 *
 * Bands: hot ≥ 80, warm ≥ 60, neutral ≥ 40, cool ≥ 20, cold < 20
 *
 * 🔧 CUSTOMIZE: Adjust BASE, DECAY_RATES, and IMPULSE_WEIGHTS for your use case.
 */

// ============================================
// 🔧 CUSTOMIZE: Warmth constants
// ============================================

const BASE = 30; // Score that neglected contacts settle to

const DECAY_RATES: Record<string, number> = {
  fast: 0.138629,   // Half-life ≈ 5 days
  medium: 0.085998, // Half-life ≈ 8 days (default)
  slow: 0.046210,   // Half-life ≈ 15 days
};

// 🔧 CUSTOMIZE: Impulse added to amplitude per interaction type
const IMPULSE_WEIGHTS: Record<string, number> = {
  meeting: 9,
  call: 7,
  email: 5,
  sms: 4,
  note: 3,
};

// ============================================
// ✅ KEEP: Core EWMA functions
// ============================================

export type WarmthBand = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
export type WarmthMode = 'fast' | 'medium' | 'slow';

export interface WarmthResult {
  warmth: number;
  warmth_band: WarmthBand;
}

/**
 * Compute warmth from current amplitude and time since last update.
 */
export function computeWarmthFromAmplitude(
  amplitude: number,
  warmthLastUpdatedAt: Date | string,
  warmthMode: WarmthMode = 'medium'
): WarmthResult {
  const now = new Date();
  const lastUpdated = new Date(warmthLastUpdatedAt);
  const daysSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

  const lambda = DECAY_RATES[warmthMode] ?? DECAY_RATES.medium;
  const rawScore = BASE + amplitude * Math.exp(-lambda * daysSince);
  const warmth = Math.round(Math.min(100, Math.max(0, rawScore)));
  const warmth_band = getWarmthBand(warmth);

  return { warmth, warmth_band };
}

/**
 * Update amplitude after an interaction. Call this whenever a user
 * logs a meeting, call, email, SMS, or note with a contact.
 *
 * Returns the new amplitude and updated warmth score.
 */
export function updateAmplitudeForContact(
  currentAmplitude: number,
  warmthLastUpdatedAt: Date | string,
  interactionType: string,
  warmthMode: WarmthMode = 'medium'
): {
  amplitude: number;
  warmth: number;
  warmth_band: WarmthBand;
  warmth_last_updated_at: string;
} {
  // First decay existing amplitude to current time
  const now = new Date();
  const lastUpdated = new Date(warmthLastUpdatedAt);
  const daysSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  const lambda = DECAY_RATES[warmthMode] ?? DECAY_RATES.medium;

  const decayedAmplitude = currentAmplitude * Math.exp(-lambda * daysSince);

  // Add impulse for the interaction
  const impulse = IMPULSE_WEIGHTS[interactionType] ?? 3;
  const newAmplitude = decayedAmplitude + impulse;

  // Compute new warmth score
  const rawScore = BASE + newAmplitude;
  const warmth = Math.round(Math.min(100, Math.max(0, rawScore)));
  const warmth_band = getWarmthBand(warmth);

  return {
    amplitude: newAmplitude,
    warmth,
    warmth_band,
    warmth_last_updated_at: now.toISOString(),
  };
}

/**
 * Map a warmth score to its band label.
 */
export function getWarmthBand(score: number): WarmthBand {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}

/**
 * Default warmth values for newly created contacts.
 */
export const CONTACT_WARMTH_DEFAULTS = {
  warmth: BASE,
  warmth_band: 'cool' as WarmthBand,
  warmth_mode: 'medium' as WarmthMode,
  amplitude: 0,
  warmth_anchor_score: BASE,
  warmth_anchor_at: () => new Date().toISOString(),
  warmth_last_updated_at: () => new Date().toISOString(),
};
