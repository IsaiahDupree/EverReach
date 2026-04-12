/**
 * Core SunTrace calculation utilities
 *
 * Covers Vitamin D synthesis estimation, burn threshold, UV colour/label
 * helpers, and formatting utilities used across the app.
 */

// ── Fitzpatrick skin type factors for Vitamin D production ───────────────────
// Index 0 = skin type 1 (very fair), index 5 = skin type 6 (dark).
// These represent relative efficiency of Vitamin D synthesis (type 1 = fastest).
const SKIN_TYPE_FACTORS = [1.0, 0.9, 0.75, 0.6, 0.4, 0.25];

// Minimal Erythemal Dose (MED) in mJ/cm² per skin type (WHO/CIE reference values).
// A higher MED means the skin tolerates more UV before burning.
const SKIN_TYPE_MED = [25, 35, 50, 70, 100, 150]; // types 1–6

// ── Vitamin D earned ─────────────────────────────────────────────────────────

/**
 * Calculate Vitamin D earned (IU) from a sun session.
 *
 * Formula: uvIndex * skinTypeFactor * 40 * minutes
 *
 * Returns 0 if uvIndex < 1 (no meaningful UV-B synthesis below this threshold).
 *
 * @param uvIndex   Current UV index (0–16+)
 * @param minutes   Duration of exposure in minutes
 * @param skinType  Fitzpatrick skin type (1–6)
 */
export function calculateDEarned(
  uvIndex: number,
  minutes: number,
  skinType: number,
): number {
  if (uvIndex < 1) return 0;
  const factor = SKIN_TYPE_FACTORS[(skinType - 1)] ?? SKIN_TYPE_FACTORS[0];
  return Math.round(uvIndex * factor * 40 * minutes);
}

// ── Burn threshold ───────────────────────────────────────────────────────────

/**
 * Get the safe exposure time in minutes before erythema (sunburn) occurs.
 *
 * Based on the Minimal Erythemal Dose (MED) concept:
 *   UV irradiance ≈ uvIndex × 25 mJ/cm² per hour = uvIndex × (25/60) mJ/cm² per minute
 *   safeMinutes   = MED[skinType-1] / (uvIndex × 25/60)
 *
 * @param uvIndex   Current UV index
 * @param skinType  Fitzpatrick skin type (1–6)
 */
export function getBurnThreshold(uvIndex: number, skinType: number): number {
  if (uvIndex <= 0) return Infinity;
  const med = SKIN_TYPE_MED[(skinType - 1)] ?? SKIN_TYPE_MED[0];
  // uvIndex * (25/60) mJ/cm²/min
  const irradiancePerMinute = uvIndex * (25 / 60);
  return med / irradiancePerMinute;
}

// ── Daily target ─────────────────────────────────────────────────────────────

/**
 * Calculate daily Vitamin D target in minutes of sun exposure.
 *
 * Targets 1 000 IU from sun at a reference UV index of 3.
 * Age multiplier: >50 → ×1.2, >70 → ×1.5 (reduced skin synthesis efficiency).
 *
 * @param skinType  Fitzpatrick skin type (1–6)
 * @param age       User age in years
 */
export function calculateDailyTarget(skinType: number, age: number): number {
  const factor = SKIN_TYPE_FACTORS[(skinType - 1)] ?? SKIN_TYPE_FACTORS[0];
  // Rate at UV 3, a moderate reference index
  const baseRate = 3 * factor * 40; // IU per minute

  let ageMultiplier = 1;
  if (age > 70) ageMultiplier = 1.5;
  else if (age > 50) ageMultiplier = 1.2;

  const targetMinutes = (1000 * ageMultiplier) / baseRate;
  return Math.round(targetMinutes);
}

// ── UV index colour ──────────────────────────────────────────────────────────

/**
 * Map a UV index value to a display hex colour (WHO standard scale).
 *
 * 0–2:  Low       → green   (#22C55E)
 * 3–5:  Moderate  → yellow  (#EAB308)
 * 6–7:  High      → orange  (#F97316)
 * 8–10: Very High → red     (#EF4444)
 * 11+:  Extreme   → purple  (#A855F7)
 */
export function uvIndexToColor(uvIndex: number): string {
  if (uvIndex <= 2) return '#22C55E';
  if (uvIndex <= 5) return '#EAB308';
  if (uvIndex <= 7) return '#F97316';
  if (uvIndex <= 10) return '#EF4444';
  return '#A855F7';
}

// ── UV index label ───────────────────────────────────────────────────────────

/**
 * Map a UV index value to a human-readable label (WHO standard scale).
 */
export function uvIndexToLabel(
  uvIndex: number,
): 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme' {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
}

// ── Duration formatter ───────────────────────────────────────────────────────

/**
 * Format a duration in minutes as a human-readable string.
 *
 * @example
 *   formatMinutes(0)   // '0m'
 *   formatMinutes(30)  // '30m'
 *   formatMinutes(60)  // '1h 0m'
 *   formatMinutes(75)  // '1h 15m'
 *   formatMinutes(90)  // '1h 30m'
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';

  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);

  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ── IU formatter ─────────────────────────────────────────────────────────────

/**
 * Format an IU value in compact form.
 *
 * @example
 *   formatIU(800)    // '800 IU'
 *   formatIU(1200)   // '1.2k IU'
 *   formatIU(50000)  // '50k IU'
 */
export function formatIU(iu: number): string {
  if (iu >= 1000) {
    const k = iu / 1000;
    // Show one decimal only when needed (e.g. 1.2k but not 50.0k)
    const formatted = Number.isInteger(k) ? `${k}k` : `${parseFloat(k.toFixed(1))}k`;
    return `${formatted} IU`;
  }
  return `${Math.round(iu)} IU`;
}

// ── Burn risk level ──────────────────────────────────────────────────────────

/**
 * Determine the current burn risk level based on elapsed exposure vs. threshold.
 *
 * < 50% of threshold  → 'low'
 * 50–80% of threshold → 'moderate'
 * > 80% of threshold  → 'high'
 *
 * @param minutesExposed  Minutes already spent in the sun
 * @param burnThreshold   Safe exposure limit in minutes (from getBurnThreshold)
 */
export function getBurnRiskLevel(
  minutesExposed: number,
  burnThreshold: number,
): 'low' | 'moderate' | 'high' {
  if (burnThreshold <= 0) return 'high';
  const ratio = minutesExposed / burnThreshold;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'moderate';
  return 'low';
}
