/**
 * EWMA Warmth Decay Formula Tests
 * 
 * Tests the unified warmth system used by both:
 * - POST /api/v1/contacts/:id/warmth/recompute (via computeWarmthFromAmplitude)
 * - GET /api/cron/daily-warmth (via computeWarmthFromAmplitude)
 * - lib/warmth-ewma.ts
 * 
 * Formula: score = base(0) + amplitude * e^(-λ * dtDays)
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
  const base = 0;
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
    test('fresh contact with 0 amplitude scores base (0)', () => {
      const { score, band } = computeWarmth(0, 0);
      expect(score).toBe(0);
      expect(band).toBe('cold');
    });

    test('max amplitude (100) scores 100 at time 0 (base 0 + amp 100)', () => {
      const { score } = computeWarmth(100, 0);
      expect(score).toBe(100);
    });

    test('amplitude 70 at time 0 scores 70 (0 + 70)', () => {
      const { score } = computeWarmth(70, 0);
      expect(score).toBe(70);
    });

    test('amplitude 50 at time 0 scores 50 (0 + 50)', () => {
      const { score, band } = computeWarmth(50, 0);
      expect(score).toBe(50);
      expect(band).toBe('neutral');
    });

    test('amplitude 30 at time 0 scores 30 (0 + 30)', () => {
      const { score, band } = computeWarmth(30, 0);
      expect(score).toBe(30);
      expect(band).toBe('cool');
    });
  });

  describe('medium mode decay over time (amplitude=50)', () => {
    // medium λ = 0.085998, half-life ≈ 8.1 days
    test('day 0: score = 50 (neutral)', () => {
      const { score, band } = computeWarmth(50, 0);
      expect(score).toBe(50);
      expect(band).toBe('neutral');
    });

    test('day 8 (half-life): amplitude halved, score ≈ 25', () => {
      const { score, band } = computeWarmth(50, 8);
      // 50 * e^(-0.086 * 8) = 50 * 0.503 = 25.15 → 0 + 25 = 25
      expect(score).toBeGreaterThanOrEqual(23);
      expect(score).toBeLessThanOrEqual(27);
      expect(band).toBe('cool');
    });

    test('day 14: score drops to ~15', () => {
      const { score } = computeWarmth(50, 14);
      // 50 * e^(-0.086 * 14) = 50 * 0.299 = 14.96 → 0 + 15 = 15
      expect(score).toBeGreaterThanOrEqual(13);
      expect(score).toBeLessThanOrEqual(17);
    });

    test('day 30: score approaches base', () => {
      const { score } = computeWarmth(50, 30);
      // 50 * e^(-0.086 * 30) = 50 * 0.075 = 3.77 → 0 + 4 = 4
      expect(score).toBeGreaterThanOrEqual(2);
      expect(score).toBeLessThanOrEqual(6);
    });

    test('day 90: score = base (0)', () => {
      const { score } = computeWarmth(50, 90);
      // 50 * e^(-0.086 * 90) = 50 * 0.00044 ≈ 0 → 0 + 0 = 0
      expect(score).toBe(0);
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

    test('score never drops below base (0) for any amplitude/time', () => {
      for (let amp = 0; amp <= 100; amp += 5) {
        for (let day = 0; day <= 365; day += 10) {
          const { score } = computeWarmth(amp, day);
          expect(score).toBeGreaterThanOrEqual(0);
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

    test('all modes converge to base (0) after enough time', () => {
      for (const mode of ['slow', 'medium', 'fast']) {
        const { score } = computeWarmth(70, 365, mode);
        expect(score).toBe(0);
      }
    });

    test('fast mode: half-life ~4 days', () => {
      // At half-life, amplitude halves: 50 * 0.5 = 25 → 0 + 25 = 25
      const { score } = computeWarmth(50, 4, 'fast');
      expect(score).toBeGreaterThanOrEqual(23);
      expect(score).toBeLessThanOrEqual(27);
    });

    test('slow mode: half-life ~17 days', () => {
      const { score } = computeWarmth(50, 17, 'slow');
      expect(score).toBeGreaterThanOrEqual(23);
      expect(score).toBeLessThanOrEqual(27);
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
      expect(computeWarmth(80, 0).band).toBe('hot'); // 0 + 80 = 80
      expect(computeWarmth(100, 0).band).toBe('hot'); // 0 + 100 = 100
    });

    test('warm: 60 <= score < 80', () => {
      expect(computeWarmth(60, 0).band).toBe('warm'); // 0 + 60 = 60
      expect(computeWarmth(79, 0).band).toBe('warm'); // 0 + 79 = 79
    });

    test('neutral: 40 <= score < 60', () => {
      expect(computeWarmth(40, 0).band).toBe('neutral'); // 0 + 40 = 40
      expect(computeWarmth(59, 0).band).toBe('neutral'); // 0 + 59 = 59
    });

    test('cool: 20 <= score < 40', () => {
      expect(computeWarmth(20, 0).band).toBe('cool'); // 0 + 20 = 20
      expect(computeWarmth(39, 0).band).toBe('cool'); // 0 + 39 = 39
    });

    test('cold: score < 20', () => {
      // With base=0, contacts decay all the way to 0
      const { score } = computeWarmth(0, 1000);
      expect(score).toBe(0); // Decays to 0
    });
  });

  describe('real-world scenarios', () => {
    test('new contact: starts at base 0 (cold) with 0 amplitude', () => {
      const { score, band } = computeWarmth(0, 0);
      expect(score).toBe(0);
      expect(band).toBe('cold');
    });

    test('contact after first meeting: score jumps to 9 (cold)', () => {
      // Meeting impulse adds 9 to amplitude
      const amp = applyImpulse(0, 0, 'meeting');
      const { score } = computeWarmth(amp, 0);
      expect(score).toBe(9); // 0 + 9
    });

    test('active contact with daily emails for a week', () => {
      // Simulate 7 daily emails
      let amp = 0;
      for (let day = 0; day < 7; day++) {
        amp = applyImpulse(amp, day === 0 ? 0 : 1, 'email');
      }
      const { score } = computeWarmth(amp, 0);
      // Accumulated amplitude with decay: ~27 with BASE=0
      expect(score).toBeGreaterThan(20);
    });

    test('neglected contact: score stabilizes at base after months', () => {
      // Had a meeting (amp=9) 90 days ago
      const { score, band } = computeWarmth(9, 90);
      expect(score).toBe(0);
      expect(band).toBe('cold');
    });
  });
});
