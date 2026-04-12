/**
 * Focused formatter tests for sunCalculations utilities.
 * Validates formatMinutes and formatIU output strings.
 */

import { formatMinutes, formatIU } from '../templates/utils/sunCalculations';

// ─────────────────────────────────────────────────────────────────────────────
// formatMinutes
// ─────────────────────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('formatMinutes(0) returns "0m"', () => expect(formatMinutes(0)).toBe('0m'));
  it('formatMinutes(75) returns "1h 15m"', () => expect(formatMinutes(75)).toBe('1h 15m'));
  it('formatMinutes(60) returns "1h 0m"', () => expect(formatMinutes(60)).toBe('1h 0m'));
  it('formatMinutes(30) returns "30m"', () => expect(formatMinutes(30)).toBe('30m'));
  it('formatMinutes(90) returns "1h 30m"', () => expect(formatMinutes(90)).toBe('1h 30m'));
});

// ─────────────────────────────────────────────────────────────────────────────
// formatIU
// ─────────────────────────────────────────────────────────────────────────────

describe('formatIU', () => {
  it('formatIU(800) returns "800 IU"', () => expect(formatIU(800)).toBe('800 IU'));
  it('formatIU(1200) returns "1.2k IU"', () => expect(formatIU(1200)).toBe('1.2k IU'));
  it('formatIU(1000) returns "1k IU"', () => expect(formatIU(1000)).toBe('1k IU'));
  it('formatIU(50000) returns "50k IU"', () => expect(formatIU(50000)).toBe('50k IU'));
});
