/**
 * EWMA Warmth Decay Formula Tests
 * 
 * Tests the unified warmth system used by both:
 * - POST /api/v1/contacts/:id/warmth/recompute (via computeWarmthFromAmplitude)
 * - GET /api/cron/daily-warmth (via computeWarmthFromAmplitude)
 * - lib/warmth-ewma.ts
 * 
 * Formula: score = base(30) + amplitude * e^(-λ * dtDays)
 * Where λ depends on mode: slow=0.040, medium=0.086, fast=0.172
 * 
 * Bands (unified EWMA standard):
 *   >= 80 → hot
 *   >= 60 → warm
 *   >= 40 → neutral
 *   >= 20 → cool
 *   < 20  → cold
 */

// Reimplementation of the EWMA formula for testing
const LAMBDA: Record<string, number> = {
  slow: 0.040132,
  medium: 0.085998,
  fast: 0.171996,
};

function computeWarmth(amplitude: number, daysSinceUpdate: number, mode = 'medium'): { score: number; band: string } {
  const base = 30;
  const lambda = LAMBDA[mode] || LAMBDA.medium;
  const decay = Math.exp(-lambda * daysSinceUpdate);
  const ampNow = amplitude * decay;
  const score = Math.max(0, Math.min(100, Math.round(base + ampNow)));

  let band = 'cold';
  if (score >= 80) band = 'hot';
  else if (score >= 60) band = 'warm';
  else if (score >= 40) band = 'neutral';
  else if (score >= 20) band = 'cool';

  return { score, band };
}

// Simulate an interaction touch (adds impulse to amplitude)
const IMPULSE_WEIGHTS: Record<string, number> = {
  email: 5,
  sms: 4,
  dm: 4,
  call: 7,
  meeting: 9,
  note: 3,
  other: 5,
};

function applyImpulse(currentAmplitude: number, daysSinceUpdate: number, kind: string, mode = 'medium'): number {
  const lambda = LAMBDA[mode] || LAMBDA.medium;
  const decay = Math.exp(-lambda * daysSinceUpdate);
  const ampDecayed = currentAmplitude * decay;
  const impulse = IMPULSE_WEIGHTS[kind] || IMPULSE_WEIGHTS.other;
  return Math.min(100, ampDecayed + impulse);
}

describe('EWMA Warmth Formula', () => {
  describe('basic decay behavior', () => {
    test('fresh contact with 0 amplitude scores base (30)', () => {
      const { score, band } = computeWarmth(0, 0);
      expect(score).toBe(30);
      expect(band).toBe('cool');
    });

    test('max amplitude (100) scores 100 at time 0 (base 30 + amp 100 = 130, clamped to 100)', () => {
      const { score } = computeWarmth(100, 0);
      expect(score).toBe(100);
    });

    test('amplitude 70 at time 0 scores 100 (30 + 70)', () => {
      const { score } = computeWarmth(70, 0);
      expect(score).toBe(100);
    });

    test('amplitude 50 at time 0 scores 80 (30 + 50)', () => {
      const { score, band } = computeWarmth(50, 0);
      expect(score).toBe(80);
      expect(band).toBe('hot');
    });

    test('amplitude 30 at time 0 scores 60 (30 + 30)', () => {
      const { score, band } = computeWarmth(30, 0);
      expect(score).toBe(60);
      expect(band).toBe('warm');
    });
  });

  describe('medium mode decay over time (amplitude=50)', () => {
    // medium λ = 0.085998, half-life ≈ 8.1 days
    test('day 0: score = 80 (hot)', () => {
      const { score, band } = computeWarmth(50, 0);
      expect(score).toBe(80);
      expect(band).toBe('hot');
    });

    test('day 8 (half-life): amplitude halved, score ≈ 55', () => {
      const { score, band } = computeWarmth(50, 8);
      // 50 * e^(-0.086 * 8) = 50 * 0.503 = 25.15 → 30 + 25 = 55
      expect(score).toBeGreaterThanOrEqual(53);
      expect(score).toBeLessThanOrEqual(57);
      expect(band).toBe('neutral');
    });

    test('day 14: score drops to ~40s', () => {
      const { score } = computeWarmth(50, 14);
      // 50 * e^(-0.086 * 14) = 50 * 0.299 = 14.96 → 30 + 15 = 45
      expect(score).toBeGreaterThanOrEqual(43);
      expect(score).toBeLessThanOrEqual(47);
    });

    test('day 30: score approaches base', () => {
      const { score } = computeWarmth(50, 30);
      // 50 * e^(-0.086 * 30) = 50 * 0.075 = 3.77 → 30 + 4 = 34
      expect(score).toBeGreaterThanOrEqual(32);
      expect(score).toBeLessThanOrEqual(36);
    });

    test('day 90: score = base (30)', () => {
      const { score } = computeWarmth(50, 90);
      // 50 * e^(-0.086 * 90) = 50 * 0.00044 ≈ 0 → 30 + 0 = 30
      expect(score).toBe(30);
    });
  });

  describe('decay is monotonically decreasing', () => {
    test('score never increases without interaction (medium mode)', () => {
      let prevScore = 100;
      for (let day = 0; day <= 120; day += 1) {
        const { score } = computeWarmth(70, day);
        expect(score).toBeLessThanOrEqual(prevScore);
        prevScore = score;
      }
    });

    test('score always stays within [0, 100]', () => {
      for (let amp = 0; amp <= 100; amp += 10) {
        for (let day = 0; day <= 365; day += 30) {
          const { score } = computeWarmth(amp, day);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });

    test('score never drops below base (30) for any amplitude/time', () => {
      for (let amp = 0; amp <= 100; amp += 5) {
        for (let day = 0; day <= 365; day += 10) {
          const { score } = computeWarmth(amp, day);
          expect(score).toBeGreaterThanOrEqual(30);
        }
      }
    });
  });

  describe('mode comparison (amplitude=50)', () => {
    test('fast mode decays faster than medium', () => {
      const fast = computeWarmth(50, 7, 'fast');
      const medium = computeWarmth(50, 7, 'medium');
      expect(fast.score).toBeLessThan(medium.score);
    });

    test('slow mode decays slower than medium', () => {
      const slow = computeWarmth(50, 7, 'slow');
      const medium = computeWarmth(50, 7, 'medium');
      expect(slow.score).toBeGreaterThan(medium.score);
    });

    test('all modes converge to base (30) after enough time', () => {
      for (const mode of ['slow', 'medium', 'fast']) {
        const { score } = computeWarmth(70, 365, mode);
        expect(score).toBe(30);
      }
    });

    test('fast mode: half-life ~4 days', () => {
      // At half-life, amplitude halves: 50 * 0.5 = 25 → 30 + 25 = 55
      const { score } = computeWarmth(50, 4, 'fast');
      expect(score).toBeGreaterThanOrEqual(53);
      expect(score).toBeLessThanOrEqual(57);
    });

    test('slow mode: half-life ~17 days', () => {
      const { score } = computeWarmth(50, 17, 'slow');
      expect(score).toBeGreaterThanOrEqual(53);
      expect(score).toBeLessThanOrEqual(57);
    });
  });

  describe('interaction impulses', () => {
    test('meeting adds 9 points to amplitude', () => {
      const newAmp = applyImpulse(0, 0, 'meeting');
      expect(newAmp).toBe(9);
    });

    test('call adds 7 points', () => {
      const newAmp = applyImpulse(0, 0, 'call');
      expect(newAmp).toBe(7);
    });

    test('sms adds 4 points', () => {
      const newAmp = applyImpulse(0, 0, 'sms');
      expect(newAmp).toBe(4);
    });

    test('repeated interactions accumulate (with decay)', () => {
      // Day 0: meeting (amp = 9)
      let amp = applyImpulse(0, 0, 'meeting');
      expect(amp).toBe(9);

      // Day 1: email (amp decays then adds 5)
      amp = applyImpulse(amp, 1, 'email');
      // 9 * e^(-0.086 * 1) + 5 = 9 * 0.917 + 5 = 8.26 + 5 = 13.26
      expect(amp).toBeGreaterThan(13);
      expect(amp).toBeLessThan(14);
    });

    test('amplitude is capped at 100', () => {
      const amp = applyImpulse(99, 0, 'meeting');
      expect(amp).toBe(100);
    });
  });

  describe('band thresholds (unified EWMA standard)', () => {
    test('hot: score >= 80', () => {
      expect(computeWarmth(50, 0).band).toBe('hot'); // 30 + 50 = 80
      expect(computeWarmth(70, 0).band).toBe('hot'); // 30 + 70 = 100
    });

    test('warm: 60 <= score < 80', () => {
      expect(computeWarmth(30, 0).band).toBe('warm'); // 30 + 30 = 60
      expect(computeWarmth(49, 0).band).toBe('warm'); // 30 + 49 = 79
    });

    test('neutral: 40 <= score < 60', () => {
      expect(computeWarmth(10, 0).band).toBe('neutral'); // 30 + 10 = 40
      expect(computeWarmth(29, 0).band).toBe('neutral'); // 30 + 29 = 59
    });

    test('cool: 20 <= score < 40', () => {
      expect(computeWarmth(0, 0).band).toBe('cool'); // 30 + 0 = 30
      // To get score 20, need negative amp contribution... but base is 30
      // So cool band only from contacts with 20-39 from previous scoring
    });

    test('cold: score < 20', () => {
      // With base=30, EWMA can never go below 30 for any amplitude >= 0
      // cold only applies to manually set scores or legacy data
      const { score } = computeWarmth(0, 1000);
      expect(score).toBe(30); // Never goes below base
    });
  });

  describe('real-world scenarios', () => {
    test('new contact: starts at base 30 (cool) with 0 amplitude', () => {
      const { score, band } = computeWarmth(0, 0);
      expect(score).toBe(30);
      expect(band).toBe('cool');
    });

    test('contact after first meeting: score jumps to 39 (cool)', () => {
      // Meeting impulse adds 9 to amplitude
      const amp = applyImpulse(0, 0, 'meeting');
      const { score } = computeWarmth(amp, 0);
      expect(score).toBe(39); // 30 + 9
    });

    test('active contact with daily emails for a week', () => {
      // Simulate 7 daily emails
      let amp = 0;
      for (let day = 0; day < 7; day++) {
        amp = applyImpulse(amp, day === 0 ? 0 : 1, 'email');
      }
      const { score } = computeWarmth(amp, 0);
      // Accumulated amplitude with decay: should be significant
      expect(score).toBeGreaterThan(50);
    });

    test('neglected contact: score stabilizes at base after months', () => {
      // Had a meeting (amp=9) 90 days ago
      const { score, band } = computeWarmth(9, 90);
      expect(score).toBe(30);
      expect(band).toBe('cool');
    });
  });
});
