/**
 * SunTrace — UV Target Utility Functions
 *
 * Provides helper functions for:
 * - calculateDailyTarget: recommended daily exposure minutes given UV + skin type + location
 * - formatMinutes: human-readable duration string
 * - uvIndexToColor: hex color code for a UV index value
 */

import type { FitzpatrickSkinType } from '@/types/models';

// ── Data: base exposure minutes at UV3 reference per skin type ────────────────
// Darker skin requires longer exposure to produce equivalent vitamin D
const BASE_MINUTES_AT_UV3: Record<FitzpatrickSkinType, number> = {
  1: 12, // Very Fair — maximum UV sensitivity
  2: 20, // Fair
  3: 25, // Medium
  4: 35, // Olive
  5: 55, // Brown
  6: 83, // Dark — needs most sun time
};

/**
 * Calculate seasonal adjustment factor based on latitude and month.
 * High latitudes in winter receive significantly less effective UV.
 *
 * @param lat    Latitude in degrees (-90 to 90)
 * @param month  Month number (1 = January, ..., 12 = December)
 * @returns  Season factor (1.0 = peak summer; 2.0 = deep winter at high lat)
 */
export function seasonFactor(lat: number, month: number): number {
  const absLat = Math.abs(lat);

  // Northern hemisphere: winter = Dec-Feb; summer = Jun-Aug
  // Southern hemisphere: winter = Jun-Aug; summer = Dec-Feb
  const isNorth = lat >= 0;
  const isWinterMonth =
    isNorth ? (month === 12 || month <= 2) : (month >= 6 && month <= 8);

  if (isWinterMonth) {
    // Deep winter penalty scales with latitude
    if (absLat >= 50) return 2.0;
    if (absLat >= 40) return 1.6;
    if (absLat >= 30) return 1.3;
    return 1.1;
  }

  return 1.0; // Summer / equatorial — no adjustment
}

/**
 * Calculate recommended daily sun exposure in minutes for a given skin type,
 * current UV index, latitude, and month.
 *
 * Formula: baseMinutes(skinType) * (3 / uvIndex) * seasonFactor(lat, month)
 *
 * Returns 0 if UV index < 1 (no meaningful vitamin D synthesis).
 * Rounds to nearest integer.
 *
 * @param skinType  Fitzpatrick skin type (1–6)
 * @param uvIndex   Current or daily peak UV index
 * @param lat       User latitude
 * @param month     Current month (1–12)
 */
export function calculateDailyTarget(
  skinType: FitzpatrickSkinType,
  uvIndex: number,
  lat: number,
  month: number,
): number {
  if (uvIndex < 1) return 0;

  const base = BASE_MINUTES_AT_UV3[skinType] ?? 30;
  const raw = base * (3 / uvIndex) * seasonFactor(lat, month);
  return Math.round(raw);
}

// ── Format minutes ────────────────────────────────────────────────────────────

/**
 * Format a duration in minutes as a human-readable string.
 *
 * @example
 *   formatMinutes(75)  // '1h 15m'
 *   formatMinutes(60)  // '1h'
 *   formatMinutes(5)   // '5m'
 *   formatMinutes(0)   // '0m'
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── UV index color ────────────────────────────────────────────────────────────

/**
 * Map a UV index value to a display hex color.
 *
 * WHO standard:
 *  0–2   Low       → green   (#22C55E)
 *  3–5   Moderate  → yellow  (#EAB308)
 *  6–7   High      → orange  (#F97316)
 *  8–10  Very High → red     (#EF4444)
 *  11+   Extreme   → purple  (#A855F7)
 */
export function uvIndexToColor(uvIndex: number): string {
  if (uvIndex <= 2) return '#22C55E'; // green
  if (uvIndex <= 5) return '#EAB308'; // yellow
  if (uvIndex <= 7) return '#F97316'; // orange
  if (uvIndex <= 10) return '#EF4444'; // red
  return '#A855F7'; // purple (extreme)
}

/**
 * UV index label string for display.
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
