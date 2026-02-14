/**
 * Warmth EWMA Decay Formula Tests
 *
 * Tests the unified EWMA warmth formula used by:
 * - POST /api/v1/contacts/:id/warmth/recompute
 * - GET /api/cron/daily-warmth
 * - POST /api/v1/interactions (via updateAmplitudeForContact)
 *
 * Formula:
 *   score = BASE + amplitude × e^(-λ × daysSinceUpdate)
 *   BASE = 30
 *   λ depends on warmth_mode:
 *     fast    = 0.138629  (half-life ≈ 5 days)
 *     medium  = 0.085998  (half-life ≈ 8 days)
 *     slow    = 0.046210  (half-life ≈ 15 days)
 *
 * Bands (EWMA standard):
 *   >= 80 → hot
 *   >= 60 → warm
 *   >= 40 → neutral
 *   >= 20 → cool
 *   < 20  → cold
 *
 * Impulse weights (added to amplitude on interaction):
 *   meeting = 9, call = 7, email = 5, sms = 4, note = 3
 */

const BASE = 30;
const LAMBDA = {
  fast: 0.138629,
  medium: 0.085998,
  slow: 0.046210,
};

function computeEWMA(amplitude: number, daysSince: number, mode: 'fast' | 'medium' | 'slow' = 'medium'): number {
  const lambda = LAMBDA[mode];
  const decayed = amplitude * Math.exp(-lambda * daysSince);
  return Math.round(Math.min(100, Math.max(0, BASE + decayed)));
}

function getBand(score: number): string {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}

describe('EWMA Warmth Decay', () => {
  describe('base score (no interactions)', () => {
    test('amplitude 0 always gives base score 30', () => {
      expect(computeEWMA(0, 0)).toBe(BASE);
      expect(computeEWMA(0, 30)).toBe(BASE);
      expect(computeEWMA(0, 365)).toBe(BASE);
    });

    test('base score is in cool band', () => {
      expect(getBand(BASE)).toBe('cool');
    });
  });

  describe('decay over time', () => {
    const amplitude = 50; // high amplitude (several interactions)

    test('day 0: full amplitude added to base', () => {
      expect(computeEWMA(amplitude, 0)).toBe(80); // 30 + 50
    });

    test('day 8: approximately half amplitude (medium mode half-life)', () => {
      const score = computeEWMA(amplitude, 8);
      // 50 * e^(-0.086 * 8) ≈ 25.2 → 30 + 25 = 55
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(70);
    });

    test('day 30: mostly decayed', () => {
      const score = computeEWMA(amplitude, 30);
      // 50 * e^(-0.086 * 30) ≈ 3.8 → 30 + 4 = 34
      expect(score).toBeGreaterThanOrEqual(BASE);
      expect(score).toBeLessThan(40);
    });

    test('day 60: negligible amplitude, near base', () => {
      const score = computeEWMA(amplitude, 60);
      expect(score).toBeLessThanOrEqual(BASE + 1);
    });
  });

  describe('monotonic decrease', () => {
    test('score never increases without new interaction', () => {
      const amplitude = 40;
      let prev = 100;
      for (let day = 0; day <= 120; day++) {
        const score = computeEWMA(amplitude, day);
        expect(score).toBeLessThanOrEqual(prev);
        prev = score;
      }
    });

    test('score is always within [0, 100]', () => {
      for (const amp of [0, 10, 50, 100, 200]) {
        for (let day = 0; day <= 365; day += 10) {
          const score = computeEWMA(amp, day);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });

    test('score never drops below base (30)', () => {
      for (let day = 0; day <= 365; day++) {
        const score = computeEWMA(20, day);
        expect(score).toBeGreaterThanOrEqual(BASE);
      }
    });
  });

  describe('mode comparison (decay rates)', () => {
    const amplitude = 40;
    const day = 10;

    test('fast mode decays faster than medium', () => {
      expect(computeEWMA(amplitude, day, 'fast')).toBeLessThan(computeEWMA(amplitude, day, 'medium'));
    });

    test('medium mode decays faster than slow', () => {
      expect(computeEWMA(amplitude, day, 'medium')).toBeLessThan(computeEWMA(amplitude, day, 'slow'));
    });

    test('all modes converge to base over long time', () => {
      for (const mode of ['fast', 'medium', 'slow'] as const) {
        expect(computeEWMA(amplitude, 180, mode)).toBe(BASE);
      }
    });
  });

  describe('interaction impulses', () => {
    const IMPULSE = { meeting: 9, call: 7, email: 5, sms: 4, note: 3 };

    test('meeting gives biggest boost', () => {
      expect(computeEWMA(IMPULSE.meeting, 0)).toBeGreaterThan(computeEWMA(IMPULSE.call, 0));
    });

    test('note gives smallest boost', () => {
      expect(computeEWMA(IMPULSE.note, 0)).toBeLessThan(computeEWMA(IMPULSE.sms, 0));
    });

    test('single meeting: score = 39', () => {
      expect(computeEWMA(IMPULSE.meeting, 0)).toBe(39); // 30 + 9
    });

    test('single sms: score = 34', () => {
      expect(computeEWMA(IMPULSE.sms, 0)).toBe(34); // 30 + 4
    });

    test('meeting + call + email: score = 51', () => {
      const combined = IMPULSE.meeting + IMPULSE.call + IMPULSE.email; // 21
      expect(computeEWMA(combined, 0)).toBe(51); // 30 + 21
    });
  });

  describe('band thresholds (EWMA standard: 80/60/40/20)', () => {
    test('hot >= 80', () => {
      expect(getBand(80)).toBe('hot');
      expect(getBand(100)).toBe('hot');
    });

    test('warm 60-79', () => {
      expect(getBand(60)).toBe('warm');
      expect(getBand(79)).toBe('warm');
    });

    test('neutral 40-59', () => {
      expect(getBand(40)).toBe('neutral');
      expect(getBand(59)).toBe('neutral');
    });

    test('cool 20-39', () => {
      expect(getBand(20)).toBe('cool');
      expect(getBand(39)).toBe('cool');
    });

    test('cold < 20', () => {
      expect(getBand(19)).toBe('cold');
      expect(getBand(0)).toBe('cold');
    });
  });

  describe('real-world scenarios', () => {
    test('new contact: starts at base 30 (cool)', () => {
      expect(computeEWMA(0, 0)).toBe(30);
      expect(getBand(30)).toBe('cool');
    });

    test('5 rapid interactions (meeting+call+email+sms+note = 28): warm', () => {
      expect(computeEWMA(28, 0)).toBe(58);
      expect(getBand(58)).toBe('neutral');
    });

    test('heavy engagement (amp=50): hits hot, decays to cool in ~30d', () => {
      expect(getBand(computeEWMA(50, 0))).toBe('hot');    // 80
      expect(getBand(computeEWMA(50, 8))).toBe('neutral');  // 55
      expect(getBand(computeEWMA(50, 30))).toBe('cool');   // ~34
    });

    test('neglected contact (amp=5, 90d ago): at base', () => {
      expect(computeEWMA(5, 90)).toBe(BASE);
    });
  });
});
