import { calculateWarmth, getWarmthColor, getWarmthLabel } from '@/lib/warmth-utils';

describe('warmth utilities', () => {
  test('calculateWarmth returns 0 without date', () => {
    expect(calculateWarmth(undefined)).toBe(0);
  });

  test('calculateWarmth decays with days', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();
    const wToday = calculateWarmth(today);
    const wYesterday = calculateWarmth(yesterday);
    expect(wToday).toBeGreaterThan(wYesterday);
  });

  test('getWarmthColor and label map correctly', () => {
    expect(getWarmthColor(85)).toBe('#EF4444');
    expect(getWarmthLabel(85)).toBe('Hot');
    expect(getWarmthColor(65)).toBe('#F59E0B');
    expect(getWarmthLabel(65)).toBe('Warm');
    expect(getWarmthColor(45)).toBe('#10B981');
    expect(getWarmthLabel(45)).toBe('Neutral');
    expect(getWarmthColor(25)).toBe('#3B82F6');
    expect(getWarmthLabel(25)).toBe('Cool');
    expect(getWarmthColor(5)).toBe('#6B7280');
    expect(getWarmthLabel(5)).toBe('Cold');
  });
});
