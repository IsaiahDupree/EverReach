/**
 * Unit tests for SunTrace UV target utility functions.
 * Tests for: calculateDailyTarget, formatMinutes, uvIndexToColor, seasonFactor
 */

import {
  calculateDailyTarget,
  formatMinutes,
  uvIndexToColor,
  seasonFactor,
} from '../../templates/lib/uvTarget';

// ─────────────────────────────────────────────────────────────────────────────
// calculateDailyTarget
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDailyTarget', () => {
  // F2046: returns 12 for Fitzpatrick II at UV5, lat 40, August
  it('returns 12 for Fitzpatrick II at UV5, lat 40, August', () => {
    const result = calculateDailyTarget(2, 5, 40, 8);
    expect(result).toBe(12);
  });

  // F2047: returns 50 for Fitzpatrick VI at UV5, lat 40, August
  it('returns 50 for Fitzpatrick VI at UV5, lat 40, August', () => {
    const result = calculateDailyTarget(6, 5, 40, 8);
    expect(result).toBe(50);
  });

  // F2048: winter adjustment doubles target at lat 50
  it('doubles the target in winter at lat 50 compared to summer', () => {
    const summerResult = calculateDailyTarget(2, 5, 50, 7); // July (summer)
    const winterResult = calculateDailyTarget(2, 5, 50, 1); // January (winter)
    expect(winterResult).toBe(summerResult * 2);
  });

  it('returns 0 when UV index is less than 1', () => {
    expect(calculateDailyTarget(1, 0, 40, 6)).toBe(0);
    expect(calculateDailyTarget(3, 0.5, 40, 6)).toBe(0);
  });

  it('returns higher values for darker skin types at the same UV', () => {
    const typeI = calculateDailyTarget(1, 5, 40, 7);
    const typeVI = calculateDailyTarget(6, 5, 40, 7);
    expect(typeVI).toBeGreaterThan(typeI);
  });

  it('returns lower values at higher UV index', () => {
    const uv3 = calculateDailyTarget(2, 3, 40, 7);
    const uv9 = calculateDailyTarget(2, 9, 40, 7);
    expect(uv9).toBeLessThan(uv3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatMinutes
// ─────────────────────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  // F2055: formatMinutes(75) returns '1h 15m'
  it("returns '1h 15m' for 75 minutes", () => {
    expect(formatMinutes(75)).toBe('1h 15m');
  });

  // F2056: formatMinutes(0) returns '0m'
  it("returns '0m' for 0 minutes", () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it("returns '1h' for exactly 60 minutes", () => {
    expect(formatMinutes(60)).toBe('1h');
  });

  it("returns '5m' for 5 minutes", () => {
    expect(formatMinutes(5)).toBe('5m');
  });

  it("returns '2h 30m' for 150 minutes", () => {
    expect(formatMinutes(150)).toBe('2h 30m');
  });

  it('handles negative values by returning 0m', () => {
    expect(formatMinutes(-5)).toBe('0m');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// uvIndexToColor
// ─────────────────────────────────────────────────────────────────────────────

describe('uvIndexToColor', () => {
  // F2057: uvIndexToColor(0) returns green, (6) returns orange, (11) returns purple
  it('returns green for UV index 0', () => {
    expect(uvIndexToColor(0)).toBe('#22C55E');
  });

  it('returns orange for UV index 6', () => {
    expect(uvIndexToColor(6)).toBe('#F97316');
  });

  it('returns purple for UV index 11', () => {
    expect(uvIndexToColor(11)).toBe('#A855F7');
  });

  it('returns green for UV 1 and 2', () => {
    expect(uvIndexToColor(1)).toBe('#22C55E');
    expect(uvIndexToColor(2)).toBe('#22C55E');
  });

  it('returns yellow for UV 3–5', () => {
    expect(uvIndexToColor(3)).toBe('#EAB308');
    expect(uvIndexToColor(5)).toBe('#EAB308');
  });

  it('returns red for UV 8–10', () => {
    expect(uvIndexToColor(8)).toBe('#EF4444');
    expect(uvIndexToColor(10)).toBe('#EF4444');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// seasonFactor
// ─────────────────────────────────────────────────────────────────────────────

describe('seasonFactor', () => {
  it('returns 1.0 in summer at mid-latitude', () => {
    expect(seasonFactor(40, 7)).toBe(1.0); // July, lat 40 North
  });

  it('returns 2.0 in deep winter at lat 50+', () => {
    expect(seasonFactor(50, 1)).toBe(2.0); // January, lat 50 North
    expect(seasonFactor(55, 12)).toBe(2.0);
  });

  it('returns 1.6 for lat 40–49 in winter', () => {
    expect(seasonFactor(45, 1)).toBe(1.6);
  });

  it('handles southern hemisphere correctly', () => {
    // July is winter in southern hemisphere
    expect(seasonFactor(-52, 7)).toBe(2.0);
    // January is summer in southern hemisphere
    expect(seasonFactor(-52, 1)).toBe(1.0);
  });
});
