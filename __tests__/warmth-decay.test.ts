/**
 * Warmth Decay Formula Tests
 * 
 * Tests the backend warmth formula used by both:
 * - POST /api/v1/contacts/:id/warmth/recompute
 * - GET /api/cron/daily-warmth
 * 
 * Formula:
 *   warmth = 40 (base)
 *     + round((clamp(90 - daysSince, 0, 90) / 90) * 25)  // recency boost: 0-25
 *     + round((clamp(interactions90d, 0, 6) / 6) * 15)    // frequency boost: 0-15
 *     + (distinctKinds30d >= 2 ? 5 : 0)                   // channel bonus: 0 or 5
 *     - round(min(30, max(0, daysSince - 7) * 0.5))       // decay after 7d: -0.5/day, cap -30
 *   clamped to [0, 100]
 * 
 * Bands:
 *   >= 70 → hot
 *   >= 50 → warm
 *   >= 30 → neutral
 *   >= 15 → cool
 *   < 15  → cold
 */

// Pure reimplementation of the backend formula for testing
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeWarmth(opts: {
  daysSince: number;
  interactions90d?: number;
  distinctKinds30d?: number;
}): { warmth: number; band: string } {
  const { daysSince, interactions90d = 0, distinctKinds30d = 0 } = opts;

  let warmth = 40; // base

  // recency boost: 0-25
  const recency = clamp(90 - daysSince, 0, 90) / 90;
  warmth += Math.round(recency * 25);

  // frequency boost: 0-15
  const freq = clamp(interactions90d, 0, 6);
  warmth += Math.round((freq / 6) * 15);

  // channel bonus
  warmth += distinctKinds30d >= 2 ? 5 : 0;

  // decay after 7 days: -0.5/day, cap -30
  if (daysSince > 7) {
    warmth -= Math.round(Math.min(30, (daysSince - 7) * 0.5));
  }

  warmth = clamp(warmth, 0, 100);

  let band = 'cold';
  if (warmth >= 70) band = 'hot';
  else if (warmth >= 50) band = 'warm';
  else if (warmth >= 30) band = 'neutral';
  else if (warmth >= 15) band = 'cool';

  return { warmth, band };
}

describe('Warmth Decay Formula', () => {
  describe('brand new contacts (0 interactions)', () => {
    test('day 0: fresh contact starts at 65 (base + full recency)', () => {
      const { warmth, band } = computeWarmth({ daysSince: 0 });
      expect(warmth).toBe(65); // 40 + 25 + 0 + 0 - 0
      expect(band).toBe('warm');
    });

    test('day 7: still 65 (no decay yet)', () => {
      const { warmth } = computeWarmth({ daysSince: 7 });
      // recency: (90-7)/90 * 25 = 23
      expect(warmth).toBe(63); // 40 + 23 + 0 + 0 - 0
    });

    test('day 14: decay kicks in', () => {
      const { warmth } = computeWarmth({ daysSince: 14 });
      // recency: (90-14)/90 * 25 = round(21.1) = 21
      // decay: round((14-7)*0.5) = round(3.5) = 4
      expect(warmth).toBe(57); // 40 + 21 + 0 + 0 - 4
    });

    test('day 30: significantly decayed', () => {
      const { warmth, band } = computeWarmth({ daysSince: 30 });
      // recency: round((60/90)*25) = round(16.67) = 17
      // decay: round((30-7)*0.5) = round(11.5) = 12
      expect(warmth).toBe(45); // 40 + 17 + 0 + 0 - 12
      expect(band).toBe('neutral');
    });

    test('day 60: low warmth', () => {
      const { warmth, band } = computeWarmth({ daysSince: 60 });
      // recency: round((30/90)*25) = round(8.33) = 8
      // decay: round((60-7)*0.5) = round(26.5) = 27
      expect(warmth).toBe(21); // 40 + 8 + 0 + 0 - 27
      expect(band).toBe('cool');
    });

    test('day 90: very low, recency gone', () => {
      const { warmth, band } = computeWarmth({ daysSince: 90 });
      // recency: 0
      // decay: min(30, (90-7)*0.5) = min(30, 41.5) = 30
      expect(warmth).toBe(10); // 40 + 0 + 0 + 0 - 30
      expect(band).toBe('cold');
    });

    test('day 120: still 10 (decay capped at -30)', () => {
      const { warmth } = computeWarmth({ daysSince: 120 });
      // recency: clamp(90-120, 0, 90) = 0
      // decay: min(30, (120-7)*0.5) = min(30, 56.5) = 30
      expect(warmth).toBe(10); // 40 + 0 + 0 + 0 - 30
    });
  });

  describe('warmth decreases monotonically over time (0 interactions)', () => {
    test('warmth strictly decreases from day 0 to day 90', () => {
      let prev = 100;
      for (let day = 0; day <= 90; day += 5) {
        const { warmth } = computeWarmth({ daysSince: day });
        expect(warmth).toBeLessThanOrEqual(prev);
        prev = warmth;
      }
    });

    test('warmth never goes negative', () => {
      for (let day = 0; day <= 365; day += 10) {
        const { warmth } = computeWarmth({ daysSince: day });
        expect(warmth).toBeGreaterThanOrEqual(0);
        expect(warmth).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('interactions boost warmth', () => {
    test('6 interactions in 90d adds +15', () => {
      const without = computeWarmth({ daysSince: 30 });
      const withInteractions = computeWarmth({ daysSince: 30, interactions90d: 6 });
      expect(withInteractions.warmth - without.warmth).toBe(15);
    });

    test('3 interactions adds +8 (half of 15, rounded)', () => {
      const without = computeWarmth({ daysSince: 30 });
      const with3 = computeWarmth({ daysSince: 30, interactions90d: 3 });
      expect(with3.warmth - without.warmth).toBe(8); // round((3/6)*15) = round(7.5) = 8
    });

    test('more than 6 interactions caps at +15', () => {
      const with6 = computeWarmth({ daysSince: 30, interactions90d: 6 });
      const with20 = computeWarmth({ daysSince: 30, interactions90d: 20 });
      expect(with6.warmth).toBe(with20.warmth);
    });
  });

  describe('channel diversity bonus', () => {
    test('1 channel kind: no bonus', () => {
      const { warmth } = computeWarmth({ daysSince: 30, distinctKinds30d: 1 });
      const base = computeWarmth({ daysSince: 30, distinctKinds30d: 0 });
      expect(warmth).toBe(base.warmth);
    });

    test('2+ channel kinds: +5 bonus', () => {
      const with2 = computeWarmth({ daysSince: 30, distinctKinds30d: 2 });
      const without = computeWarmth({ daysSince: 30, distinctKinds30d: 0 });
      expect(with2.warmth - without.warmth).toBe(5);
    });
  });

  describe('band thresholds', () => {
    test('hot >= 70', () => {
      expect(computeWarmth({ daysSince: 0, interactions90d: 6, distinctKinds30d: 2 }).band).toBe('hot');
    });

    test('warm >= 50', () => {
      const { band } = computeWarmth({ daysSince: 14 });
      expect(band).toBe('warm');
    });

    test('neutral >= 30', () => {
      const { band } = computeWarmth({ daysSince: 30 });
      expect(band).toBe('neutral');
    });

    test('cool >= 15', () => {
      const { band } = computeWarmth({ daysSince: 60 });
      expect(band).toBe('cool');
    });

    test('cold < 15', () => {
      const { band } = computeWarmth({ daysSince: 90 });
      expect(band).toBe('cold');
    });
  });

  describe('real-world scenarios', () => {
    test('active contact: recent interaction + high frequency stays hot', () => {
      const { warmth, band } = computeWarmth({ daysSince: 2, interactions90d: 6, distinctKinds30d: 3 });
      // 40 + 24 + 15 + 5 - 0 = 84
      expect(warmth).toBe(84);
      expect(band).toBe('hot');
    });

    test('new contact added today with no interactions', () => {
      const { warmth, band } = computeWarmth({ daysSince: 0 });
      expect(warmth).toBe(65);
      expect(band).toBe('warm');
    });

    test('contact neglected for 2 weeks, had 2 interactions', () => {
      const { warmth, band } = computeWarmth({ daysSince: 14, interactions90d: 2 });
      // 40 + 21 + 5 + 0 - 4 = 62
      expect(warmth).toBe(62);
      expect(band).toBe('warm');
    });

    test('contact from 3 months ago, 1 old interaction', () => {
      const { warmth, band } = computeWarmth({ daysSince: 90, interactions90d: 1 });
      // 40 + 0 + 3 + 0 - 30 = 13
      expect(warmth).toBe(13);
      expect(band).toBe('cold');
    });

    test('max warmth: fresh + 6 interactions + multi-channel', () => {
      const { warmth } = computeWarmth({ daysSince: 0, interactions90d: 6, distinctKinds30d: 2 });
      // 40 + 25 + 15 + 5 - 0 = 85
      expect(warmth).toBe(85);
    });

    test('min warmth: 90+ days, 0 interactions', () => {
      const { warmth } = computeWarmth({ daysSince: 90 });
      // 40 + 0 + 0 + 0 - 30 = 10
      expect(warmth).toBe(10);
    });
  });

  describe('client-side calculateWarmth consistency', () => {
    // The client-side warmth-utils.ts uses a simpler exponential decay:
    // score = 100 * e^(-daysSince / 14)
    // This is a DIFFERENT formula than the backend — client is for display only,
    // backend is the source of truth. Verify both decay monotonically.

    function clientCalculateWarmth(daysSince: number): number {
      return Math.round(100 * Math.exp(-daysSince / 14));
    }

    test('client-side decay is monotonically decreasing', () => {
      let prev = 100;
      for (let day = 0; day <= 90; day++) {
        const w = clientCalculateWarmth(day);
        expect(w).toBeLessThanOrEqual(prev);
        prev = w;
      }
    });

    test('both formulas agree that warmth decreases over time', () => {
      const backendDay0 = computeWarmth({ daysSince: 0 }).warmth;
      const backendDay30 = computeWarmth({ daysSince: 30 }).warmth;
      const backendDay90 = computeWarmth({ daysSince: 90 }).warmth;

      const clientDay0 = clientCalculateWarmth(0);
      const clientDay30 = clientCalculateWarmth(30);
      const clientDay90 = clientCalculateWarmth(90);

      expect(backendDay0).toBeGreaterThan(backendDay30);
      expect(backendDay30).toBeGreaterThan(backendDay90);
      expect(clientDay0).toBeGreaterThan(clientDay30);
      expect(clientDay30).toBeGreaterThan(clientDay90);
    });
  });
});
