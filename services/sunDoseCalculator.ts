/**
 * sunDoseCalculator.ts
 *
 * Pure TypeScript dose calculation engine.
 * Implements formula: durationMinutes × uvIndex × outdoorConfidence × cloudFactor × shadeFactor × exposureFactor × protectionFactor
 *
 * No side effects, fully unit-testable.
 */

// ── Type Definitions ────────────────────────────────────────
export type ShadeFactor = 'full_sun' | 'partial_sun' | 'open_shade' | 'deep_shade';
export type ExposureFactor = 'face_hands' | 'face_forearms' | 'arms_legs' | 'shorts_tshirt' | 'swimwear';
export type ProtectionFactor = 'none' | 'spf_15' | 'spf_30' | 'spf_50' | 'covered';
export type OverexposureRisk = 'low' | 'moderate' | 'high' | 'very_high';
export type MotionType = 'walking' | 'running' | 'cycling' | 'automotive' | 'stationary' | 'unknown';

// ── Factor Lookup Tables ────────────────────────────────────
export const SHADE_FACTORS: Record<ShadeFactor, number> = {
  full_sun: 1.00,
  partial_sun: 0.65,
  open_shade: 0.35,
  deep_shade: 0.15,
};

export const EXPOSURE_FACTORS: Record<ExposureFactor, number> = {
  face_hands: 0.25,
  face_forearms: 0.40,
  arms_legs: 0.60,
  shorts_tshirt: 0.75,
  swimwear: 1.00,
};

export const PROTECTION_FACTORS: Record<ProtectionFactor, number> = {
  none: 1.00,
  spf_15: 0.70,
  spf_30: 0.45,
  spf_50: 0.25,
  covered: 0.10,
};

// ── Cloud Factor Derivation ────────────────────────────────
/**
 * Derives cloud factor from cloud cover percentage.
 * 0–15% → 1.00, 16–40% → 0.85, 41–65% → 0.65, 66–100% → 0.40
 */
export function cloudFactor(cloudCoverPct: number): number {
  if (cloudCoverPct <= 15) return 1.00;
  if (cloudCoverPct <= 40) return 0.85;
  if (cloudCoverPct <= 65) return 0.65;
  return 0.40;
}

// ── Dose Calculator ────────────────────────────────────────
export interface DoseInputs {
  durationMinutes: number;
  uvIndex: number;
  outdoorConfidence: number;
  cloudFactor: number;
  shadeFactor: number;
  exposureFactor: number;
  protectionFactor: number;
}

/**
 * Calculates session UV dose score.
 * Formula: durationMinutes × uvIndex × outdoorConfidence × cloudFactor × shadeFactor × exposureFactor × protectionFactor
 */
export function calcSessionUVDose(inputs: DoseInputs): number {
  const {
    durationMinutes,
    uvIndex,
    outdoorConfidence,
    cloudFactor: cloudFact,
    shadeFactor,
    exposureFactor,
    protectionFactor,
  } = inputs;

  return (
    durationMinutes *
    uvIndex *
    outdoorConfidence *
    cloudFact *
    shadeFactor *
    exposureFactor *
    protectionFactor
  );
}

// ── Daily Totals ────────────────────────────────────────────
export interface ScoredSession {
  id: string;
  durationMinutes: number;
  uvDoseScore: number;
  daylightMinutesEffective: number;
  startTime: Date;
  sunriseTime?: Date;
  motionType?: MotionType;
}

export interface DailyTotals {
  uvDoseScore: number;
  daylightMinutes: number;
  morningLightMinutes: number;
  overexposureRisk: OverexposureRisk;
}

/**
 * Helper: check if session falls in morning light window.
 * Morning session = starts within morningWindowHours after sunrise.
 */
export function isMorningSession(
  startTime: Date,
  sunriseTime: Date | undefined,
  morningWindowHours: number = 3
): boolean {
  if (!sunriseTime) return false;
  const sunriseMs = sunriseTime.getTime();
  const windowMs = morningWindowHours * 60 * 60 * 1000;
  const startMs = startTime.getTime();
  return startMs >= sunriseMs && startMs <= sunriseMs + windowMs;
}

/**
 * Calculates daily totals from a list of scored sessions.
 */
export function calcDailyTotals(
  sessions: ScoredSession[],
  userSkinSensitivity: string = 'medium',
  morningWindowHours: number = 3
): DailyTotals {
  const uvDoseScore = sessions.reduce((sum, s) => sum + s.uvDoseScore, 0);
  const daylightMinutes = sessions.reduce((sum, s) => sum + s.daylightMinutesEffective, 0);
  const morningLightMinutes = sessions
    .filter((s) => isMorningSession(s.startTime, s.sunriseTime, morningWindowHours))
    .reduce((sum, s) => sum + s.daylightMinutesEffective, 0);
  const overexposureRisk = deriveOverexposureRisk(uvDoseScore, userSkinSensitivity);

  return {
    uvDoseScore: Math.round(uvDoseScore * 100) / 100,
    daylightMinutes: Math.round(daylightMinutes * 100) / 100,
    morningLightMinutes: Math.round(morningLightMinutes * 100) / 100,
    overexposureRisk,
  };
}

// ── Overexposure Risk ────────────────────────────────────────
/**
 * Derives overexposure risk category based on daily dose and skin sensitivity.
 * Thresholds adjust by skin sensitivity:
 * - very_fair: ~60% of medium threshold
 * - dark: ~150% of medium threshold
 */
export function deriveOverexposureRisk(
  dailyScore: number,
  skinSensitivity: string = 'medium'
): OverexposureRisk {
  // Base thresholds for medium sensitivity
  const baseThresholds = {
    low: 30,
    moderate: 80,
    high: 150,
    veryHigh: 250,
  };

  // Adjust by skin sensitivity
  const multiplier = getSkinSensitivityMultiplier(skinSensitivity);
  const thresholds = {
    low: baseThresholds.low * multiplier,
    moderate: baseThresholds.moderate * multiplier,
    high: baseThresholds.high * multiplier,
    veryHigh: baseThresholds.veryHigh * multiplier,
  };

  if (dailyScore < thresholds.low) return 'low';
  if (dailyScore < thresholds.moderate) return 'moderate';
  if (dailyScore < thresholds.high) return 'high';
  return 'very_high';
}

function getSkinSensitivityMultiplier(sensitivity: string): number {
  const multipliers: Record<string, number> = {
    very_fair: 0.60,
    fair: 0.75,
    medium: 1.00,
    olive: 1.25,
    dark: 1.50,
  };
  return multipliers[sensitivity] ?? 1.00;
}

// ── Remaining Suggested Minutes ────────────────────────────
/**
 * Calculates estimated minutes until daily target dose is reached,
 * given current conditions.
 * Returns null if target already met or UV=0.
 */
export function calcRemainingMinutes(
  currentDailyScore: number,
  targetDose: number,
  currentUV: number,
  currentCloudFactor: number,
  outdoorConfidence: number,
  exposureFactor: number,
  protectionFactor: number,
  shadeFactor: number = 1.0
): number | null {
  if (currentDailyScore >= targetDose || currentUV === 0) {
    return null;
  }

  const remaining = targetDose - currentDailyScore;
  const dosePerMinute =
    currentUV *
    outdoorConfidence *
    currentCloudFactor *
    shadeFactor *
    exposureFactor *
    protectionFactor;

  if (dosePerMinute <= 0) {
    return null;
  }

  return Math.ceil(remaining / dosePerMinute);
}
