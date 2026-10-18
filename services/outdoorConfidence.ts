/**
 * outdoorConfidence.ts
 *
 * Calculates confidence score (0–1) that a user is actually outdoors.
 * Uses weighted scoring from motion type, daylight, location freshness, movement distance, and walking speed.
 */

import { MotionType } from './sunDoseCalculator';

export interface SessionSignals {
  motionType: MotionType;
  isDaylight: boolean;
  locationFreshSeconds: number;  // seconds since last GPS location
  distanceMovedMeters: number;    // meters moved in the session
  speed: number;                  // m/s
  durationMinutes: number;
}

/**
 * Calculates outdoor confidence score (0–1).
 * Starts at 0.5 baseline and adjusts based on signals.
 *
 * Motion type bonuses:
 *   walking    → +0.25
 *   running    → +0.30
 *   cycling    → +0.20
 *   automotive → override to 0.05 (strong signal of NOT outdoor exposure)
 *   stationary → -0.10
 *
 * Other signals:
 *   isDaylight (true)         → +0.15
 *   locationFreshSeconds < 300 → +0.10 (recent GPS reading)
 *   distanceMovedMeters > 50   → +0.10 (meaningful movement)
 *   speed 0–2.5 m/s            → +0.05 (walking pace)
 *
 * Final: clamp to [0, 1]
 */
export function calcOutdoorConfidence(signals: SessionSignals): number {
  let score = 0.5; // baseline

  // Motion type scoring
  switch (signals.motionType) {
    case 'walking':
      score += 0.25;
      break;
    case 'running':
      score += 0.30;
      break;
    case 'cycling':
      score += 0.20;
      break;
    case 'automotive':
      // Strong override: automotive means low outdoor exposure (windows filter UV)
      score = 0.05;
      break;
    case 'stationary':
      score -= 0.10;
      break;
    case 'unknown':
      // no adjustment
      break;
  }

  // Daylight bonus
  if (signals.isDaylight) {
    score += 0.15;
  }

  // GPS freshness bonus
  if (signals.locationFreshSeconds < 300) {
    score += 0.10;
  }

  // Movement distance bonus
  if (signals.distanceMovedMeters > 50) {
    score += 0.10;
  }

  // Walking pace bonus (0–2.5 m/s is pedestrian pace)
  if (signals.speed > 0 && signals.speed <= 2.5) {
    score += 0.05;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1.0, score));
}
