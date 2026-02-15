import { 
  getWarmthColor, 
  getWarmthColorScheme, 
  getWarmthLabel,
  getWarmthColorInterpolated,
  WARMTH_COLORS 
} from '@/lib/warmthColors';

describe('warmth color utilities', () => {
  describe('getWarmthColor', () => {
    test('returns cold color for 0-19 (cold band)', () => {
      expect(getWarmthColor(0)).toBe('#B91C1C');
      expect(getWarmthColor(10)).toBe('#B91C1C');
      expect(getWarmthColor(19)).toBe('#B91C1C');
    });

    test('returns cool color for 20-39 (cool band)', () => {
      expect(getWarmthColor(20)).toBe('#DC2626');
      expect(getWarmthColor(30)).toBe('#DC2626');
      expect(getWarmthColor(39)).toBe('#DC2626');
    });

    test('returns neutral color for 40-59 (neutral band)', () => {
      expect(getWarmthColor(40)).toBe('#F59E0B');
      expect(getWarmthColor(50)).toBe('#F59E0B');
      expect(getWarmthColor(59)).toBe('#F59E0B');
    });

    test('returns warm color for 60-79 (warm band)', () => {
      expect(getWarmthColor(60)).toBe('#10B981');
      expect(getWarmthColor(70)).toBe('#10B981');
      expect(getWarmthColor(79)).toBe('#10B981');
    });

    test('returns hot color for 80-100 (hot band)', () => {
      expect(getWarmthColor(80)).toBe('#059669');
      expect(getWarmthColor(90)).toBe('#059669');
      expect(getWarmthColor(100)).toBe('#059669');
    });

    test('clamps values below 0', () => {
      expect(getWarmthColor(-10)).toBe('#B91C1C');
    });

    test('clamps values above 100', () => {
      expect(getWarmthColor(150)).toBe('#059669');
    });
  });

  describe('getWarmthLabel', () => {
    test('returns correct EWMA labels for ranges', () => {
      expect(getWarmthLabel(0)).toBe('Cold');
      expect(getWarmthLabel(19)).toBe('Cold');
      expect(getWarmthLabel(20)).toBe('Cool');
      expect(getWarmthLabel(39)).toBe('Cool');
      expect(getWarmthLabel(40)).toBe('Neutral');
      expect(getWarmthLabel(59)).toBe('Neutral');
      expect(getWarmthLabel(60)).toBe('Warm');
      expect(getWarmthLabel(79)).toBe('Warm');
      expect(getWarmthLabel(80)).toBe('Hot');
      expect(getWarmthLabel(100)).toBe('Hot');
    });

    test('clamps edge cases', () => {
      expect(getWarmthLabel(-10)).toBe('Cold');
      expect(getWarmthLabel(150)).toBe('Hot');
    });
  });

  describe('getWarmthColorScheme', () => {
    test('returns complete scheme with all properties', () => {
      const scheme = getWarmthColorScheme(50);
      expect(scheme).toHaveProperty('background');
      expect(scheme).toHaveProperty('text');
      expect(scheme).toHaveProperty('border');
      expect(scheme).toHaveProperty('gradient');
      expect(Array.isArray(scheme.gradient)).toBe(true);
      expect(scheme.gradient).toHaveLength(2);
    });

    test('returns cold scheme for 0-19', () => {
      const scheme = getWarmthColorScheme(10);
      expect(scheme.background).toBe('#FEE2E2');
      expect(scheme.text).toBe('#991B1B');
    });

    test('returns neutral scheme for 41-60', () => {
      const scheme = getWarmthColorScheme(50);
      expect(scheme.background).toBe('#FEF3C7');
      expect(scheme.text).toBe('#92400E');
    });

    test('returns hot scheme for 80-100', () => {
      const scheme = getWarmthColorScheme(100);
      expect(scheme.background).toBe('#A7F3D0');
      expect(scheme.text).toBe('#064E3B');
    });
  });

  describe('getWarmthColorInterpolated', () => {
    test('returns rgb color string', () => {
      const color = getWarmthColorInterpolated(50);
      expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });

    test('interpolates from red to orange in 0-50 range', () => {
      const low = getWarmthColorInterpolated(0);
      const mid = getWarmthColorInterpolated(25);
      const high = getWarmthColorInterpolated(50);
      
      expect(low).toMatch(/^rgb\(185, 28, 28\)$/);
      expect(mid).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(high).toMatch(/^rgb\(245, 158, 11\)$/);
    });

    test('interpolates from orange to green in 51-100 range', () => {
      const low = getWarmthColorInterpolated(50);
      const mid = getWarmthColorInterpolated(75);
      const high = getWarmthColorInterpolated(100);
      
      expect(low).toMatch(/^rgb\(245, 158, 11\)$/);
      expect(mid).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      expect(high).toMatch(/^rgb\(5, 150, 105\)$/);
    });

    test('clamps out of range values', () => {
      expect(getWarmthColorInterpolated(-10)).toMatch(/^rgb\(185, 28, 28\)$/);
      expect(getWarmthColorInterpolated(150)).toMatch(/^rgb\(5, 150, 105\)$/);
    });
  });

  describe('WARMTH_COLORS constant', () => {
    test('contains all warmth levels', () => {
      expect(WARMTH_COLORS).toHaveProperty('veryCold');
      expect(WARMTH_COLORS).toHaveProperty('cold');
      expect(WARMTH_COLORS).toHaveProperty('neutral');
      expect(WARMTH_COLORS).toHaveProperty('warm');
      expect(WARMTH_COLORS).toHaveProperty('veryWarm');
    });

    test('each level has required properties', () => {
      Object.values(WARMTH_COLORS).forEach(colors => {
        expect(colors).toHaveProperty('main');
        expect(colors).toHaveProperty('background');
        expect(colors).toHaveProperty('text');
        expect(colors).toHaveProperty('border');
      });
    });
  });
});
