/**
 * Unit tests for templates/utils/sunCalculations.ts
 *
 * Covers: calculateDEarned, getBurnThreshold, calculateDailyTarget,
 *         uvIndexToColor, formatMinutes, formatIU, getBurnRiskLevel.
 */

import {
  calculateDEarned,
  getBurnThreshold,
  calculateDailyTarget,
  uvIndexToColor,
  formatMinutes,
  formatIU,
  getBurnRiskLevel,
} from '../../templates/utils/sunCalculations';

// ─────────────────────────────────────────────────────────────────────────────
// calculateDEarned
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDEarned', () => {
  it('returns 0 for UV < 1 (no meaningful synthesis)', () => {
    expect(calculateDEarned(0, 30, 1)).toBe(0);
    expect(calculateDEarned(0.9, 30, 1)).toBe(0);
  });

  it('calculates correctly for skin type 1 at UV 5 for 30 min', () => {
    // factor=1.0, result = 5 * 1.0 * 40 * 30 = 6000
    expect(calculateDEarned(5, 30, 1)).toBe(6000);
  });

  it('calculates correctly for skin type 6 at UV 5 for 30 min', () => {
    // factor=0.25, result = 5 * 0.25 * 40 * 30 = 1500
    expect(calculateDEarned(5, 30, 6)).toBe(1500);
  });

  it('all 6 skin types at UV5 30min: type 1 earns more than type 6', () => {
    const values = [1, 2, 3, 4, 5, 6].map((st) => calculateDEarned(5, 30, st));
    // Monotonically decreasing
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThan(values[i + 1]);
    }
  });

  it('returns 0 for 0 minutes regardless of UV', () => {
    expect(calculateDEarned(8, 0, 2)).toBe(0);
  });

  it('scales linearly with minutes', () => {
    const base = calculateDEarned(5, 1, 2);
    expect(calculateDEarned(5, 10, 2)).toBe(base * 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBurnThreshold
// ─────────────────────────────────────────────────────────────────────────────

describe('getBurnThreshold', () => {
  it('type 1 at UV 10 has a threshold under 10 minutes', () => {
    // MED type1=25, irradiance = 10*(25/60)=4.167 mJ/cm²/min, threshold ≈ 6 min
    const threshold = getBurnThreshold(10, 1);
    expect(threshold).toBeLessThan(10);
  });

  it('type 6 at UV 10 gives a longer threshold than type 1', () => {
    const t1 = getBurnThreshold(10, 1);
    const t6 = getBurnThreshold(10, 6);
    expect(t6).toBeGreaterThan(t1);
  });

  it('UV 1 gives a much longer safe time than UV 10 for same skin type', () => {
    const lowUV = getBurnThreshold(1, 2);
    const highUV = getBurnThreshold(10, 2);
    expect(lowUV).toBeGreaterThan(highUV * 5);
  });

  it('returns Infinity for UV <= 0', () => {
    expect(getBurnThreshold(0, 1)).toBe(Infinity);
  });

  it('all skin types at same UV: type 6 > type 5 > ... > type 1', () => {
    const thresholds = [1, 2, 3, 4, 5, 6].map((st) => getBurnThreshold(5, st));
    for (let i = 0; i < thresholds.length - 1; i++) {
      expect(thresholds[i + 1]).toBeGreaterThan(thresholds[i]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateDailyTarget
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDailyTarget', () => {
  it('returns a positive number for all skin types', () => {
    [1, 2, 3, 4, 5, 6].forEach((st) => {
      expect(calculateDailyTarget(st, 30)).toBeGreaterThan(0);
    });
  });

  it('type 1 target < type 6 target (lighter skin produces Vitamin D faster)', () => {
    const type1 = calculateDailyTarget(1, 30);
    const type6 = calculateDailyTarget(6, 30);
    expect(type1).toBeLessThan(type6);
  });

  it('age > 50 gives a higher target than age 30 for same skin type', () => {
    const young = calculateDailyTarget(2, 30);
    const older = calculateDailyTarget(2, 55);
    expect(older).toBeGreaterThan(young);
  });

  it('age > 70 gives a higher target than age 55', () => {
    const over50 = calculateDailyTarget(2, 55);
    const over70 = calculateDailyTarget(2, 75);
    expect(over70).toBeGreaterThan(over50);
  });

  it('target is monotonically increasing from type 1 to type 6', () => {
    const targets = [1, 2, 3, 4, 5, 6].map((st) => calculateDailyTarget(st, 30));
    for (let i = 0; i < targets.length - 1; i++) {
      expect(targets[i + 1]).toBeGreaterThan(targets[i]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatMinutes
// ─────────────────────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('0 → "0m"', () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it('30 → "30m"', () => {
    expect(formatMinutes(30)).toBe('30m');
  });

  it('75 → "1h 15m"', () => {
    expect(formatMinutes(75)).toBe('1h 15m');
  });

  it('60 → "1h 0m"', () => {
    expect(formatMinutes(60)).toBe('1h 0m');
  });

  it('90 → "1h 30m"', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });

  it('negative value → "0m"', () => {
    expect(formatMinutes(-10)).toBe('0m');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// uvIndexToColor
// ─────────────────────────────────────────────────────────────────────────────

describe('uvIndexToColor', () => {
  it('0 → green (#22C55E)', () => {
    expect(uvIndexToColor(0)).toBe('#22C55E');
  });

  it('2 → green (upper bound of Low range)', () => {
    expect(uvIndexToColor(2)).toBe('#22C55E');
  });

  it('3 → yellow (lower bound of Moderate range)', () => {
    expect(uvIndexToColor(3)).toBe('#EAB308');
  });

  it('5 → yellow (upper bound of Moderate range)', () => {
    expect(uvIndexToColor(5)).toBe('#EAB308');
  });

  it('6 → orange (High range)', () => {
    expect(uvIndexToColor(6)).toBe('#F97316');
  });

  it('8 → red (Very High range)', () => {
    expect(uvIndexToColor(8)).toBe('#EF4444');
  });

  it('10 → red (upper bound of Very High range)', () => {
    expect(uvIndexToColor(10)).toBe('#EF4444');
  });

  it('11 → purple (Extreme range)', () => {
    expect(uvIndexToColor(11)).toBe('#A855F7');
  });

  it('15 → purple (deep Extreme range)', () => {
    expect(uvIndexToColor(15)).toBe('#A855F7');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatIU
// ─────────────────────────────────────────────────────────────────────────────

describe('formatIU', () => {
  it('800 → "800 IU"', () => {
    expect(formatIU(800)).toBe('800 IU');
  });

  it('1200 → "1.2k IU"', () => {
    expect(formatIU(1200)).toBe('1.2k IU');
  });

  it('50000 → "50k IU"', () => {
    expect(formatIU(50000)).toBe('50k IU');
  });

  it('1000 → "1k IU" (exact thousand)', () => {
    expect(formatIU(1000)).toBe('1k IU');
  });

  it('0 → "0 IU"', () => {
    expect(formatIU(0)).toBe('0 IU');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBurnRiskLevel
// ─────────────────────────────────────────────────────────────────────────────

describe('getBurnRiskLevel', () => {
  it('returns "low" when below 50% of threshold', () => {
    expect(getBurnRiskLevel(10, 60)).toBe('low'); // 16.7%
  });

  it('returns "moderate" at exactly 50% of threshold', () => {
    expect(getBurnRiskLevel(30, 60)).toBe('moderate'); // 50%
  });

  it('returns "moderate" between 50–80%', () => {
    expect(getBurnRiskLevel(45, 60)).toBe('moderate'); // 75%
  });

  it('returns "high" at exactly 80% of threshold', () => {
    expect(getBurnRiskLevel(48, 60)).toBe('high'); // 80%
  });

  it('returns "high" above 80% of threshold', () => {
    expect(getBurnRiskLevel(55, 60)).toBe('high'); // 91.7%
  });

  it('returns "high" when exposed beyond threshold', () => {
    expect(getBurnRiskLevel(70, 60)).toBe('high'); // 116.7%
  });

  it('returns "high" when threshold is 0', () => {
    expect(getBurnRiskLevel(0, 0)).toBe('high');
  });
});
