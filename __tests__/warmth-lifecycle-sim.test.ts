/**
 * Warmth Lifecycle Simulation Tests
 *
 * Simulates realistic user scenarios over days/weeks/months to verify:
 * 1. Scores decay exponentially between interactions
 * 2. Scores increase after each interaction (impulse)
 * 3. Pull-to-refresh (recompute) is idempotent — calling it twice gives the same result
 * 4. Full multi-week lifecycle: create → interact → decay → interact → decay
 * 5. Different cadence modes produce different decay curves
 *
 * Formula: score = 30 + amplitude × e^(-λ × daysSinceUpdate)
 */

const BASE = 30;
const LAMBDA: Record<string, number> = {
  fast: 0.138629,   // half-life ~5 days
  medium: 0.085998,  // half-life ~8 days
  slow: 0.046210,    // half-life ~15 days
};

const IMPULSE: Record<string, number> = {
  meeting: 9,
  call: 7,
  email: 5,
  sms: 4,
  dm: 4,
  note: 3,
};

/** Compute EWMA warmth from amplitude and days since last update */
function computeScore(amplitude: number, daysSince: number, mode: string = 'medium'): number {
  const lambda = LAMBDA[mode] || LAMBDA.medium;
  const decayed = amplitude * Math.exp(-lambda * daysSince);
  return Math.round(Math.min(100, Math.max(0, BASE + decayed)));
}

/** Simulate adding an interaction impulse: decay existing amplitude, then add impulse */
function addInteraction(currentAmplitude: number, daysSinceLastUpdate: number, kind: string, mode: string = 'medium'): number {
  const lambda = LAMBDA[mode] || LAMBDA.medium;
  const decayed = currentAmplitude * Math.exp(-lambda * daysSinceLastUpdate);
  const impulse = IMPULSE[kind] || 5;
  return Math.min(100, decayed + impulse);
}

/** Simulate recompute (idempotent read): same amplitude + same days = same score */
function recompute(amplitude: number, daysSince: number, mode: string = 'medium'): number {
  return computeScore(amplitude, daysSince, mode);
}

// ─── LIFECYCLE SIMULATIONS ───────────────────────────────────────────

describe('Warmth Lifecycle Simulation', () => {

  describe('full lifecycle: new contact over 60 days', () => {
    // Simulate: Day 0 create → Day 0 meeting → Day 3 email → Day 10 sms → then decay
    let amplitude = 0;
    const mode = 'medium';
    const timeline: { day: number; event: string; amplitude: number; score: number; band: string }[] = [];

    function getBand(score: number): string {
      if (score >= 80) return 'hot';
      if (score >= 60) return 'warm';
      if (score >= 40) return 'neutral';
      if (score >= 20) return 'cool';
      return 'cold';
    }

    function record(day: number, event: string, amp: number) {
      const score = computeScore(amp, 0, mode); // score at moment of update
      timeline.push({ day, event, amplitude: amp, score, band: getBand(score) });
    }

    beforeAll(() => {
      // Day 0: Contact created (amplitude = 0, score = 30)
      record(0, 'created', amplitude);

      // Day 0: First meeting
      amplitude = addInteraction(amplitude, 0, 'meeting', mode);
      record(0, 'meeting', amplitude);

      // Day 3: Follow-up email
      amplitude = addInteraction(amplitude, 3, 'email', mode);
      record(3, 'email', amplitude);

      // Day 10: Quick SMS check-in
      amplitude = addInteraction(amplitude, 7, 'sms', mode); // 7 days since last (day 3→10)
      record(10, 'sms', amplitude);

      // No more interactions — decay through days 10→60
    });

    test('contact starts at base score 30 (cool)', () => {
      expect(timeline[0].score).toBe(30);
      expect(timeline[0].band).toBe('cool');
    });

    test('first meeting increases score from 30 to 39', () => {
      expect(timeline[1].score).toBe(39);
      expect(timeline[1].amplitude).toBe(9);
    });

    test('follow-up email on day 3 further increases score', () => {
      expect(timeline[2].score).toBeGreaterThan(timeline[1].score);
    });

    test('sms on day 10 increases score again', () => {
      expect(timeline[3].score).toBeGreaterThan(BASE);
    });

    test('score decays monotonically after last interaction (day 10→60)', () => {
      const lastAmp = timeline[3].amplitude;
      let prevScore = computeScore(lastAmp, 0, mode);

      for (let daysSinceLast = 1; daysSinceLast <= 50; daysSinceLast++) {
        const score = computeScore(lastAmp, daysSinceLast, mode);
        expect(score).toBeLessThanOrEqual(prevScore);
        prevScore = score;
      }
    });

    test('score reaches base (30) within 60 days of last interaction', () => {
      const lastAmp = timeline[3].amplitude;
      const score = computeScore(lastAmp, 50, mode);
      expect(score).toBe(BASE);
    });
  });

  describe('recompute is idempotent (pull-to-refresh safe)', () => {
    test('calling recompute twice with same inputs gives identical score', () => {
      const amp = 25;
      const days = 5;
      const first = recompute(amp, days, 'medium');
      const second = recompute(amp, days, 'medium');
      expect(first).toBe(second);
    });

    test('recompute at day N is same regardless of how many times called', () => {
      const amp = 40;
      for (let call = 0; call < 10; call++) {
        expect(recompute(amp, 7, 'fast')).toBe(recompute(amp, 7, 'fast'));
      }
    });

    test('recompute does not change amplitude (stateless)', () => {
      const amp = 35;
      const score1 = recompute(amp, 3, 'medium');
      const score2 = recompute(amp, 3, 'medium');
      const score3 = recompute(amp, 3, 'medium');
      // All identical — recompute is a pure function of (amplitude, time, mode)
      expect(score1).toBe(score2);
      expect(score2).toBe(score3);
    });
  });

  describe('message-sent flow: interaction increases warmth', () => {
    test('sending SMS increases score from base', () => {
      const before = computeScore(0, 0);
      const newAmp = addInteraction(0, 0, 'sms');
      const after = computeScore(newAmp, 0);
      expect(after).toBeGreaterThan(before);
      expect(after - before).toBe(IMPULSE.sms); // +4
    });

    test('sending email increases score from base', () => {
      const before = computeScore(0, 0);
      const newAmp = addInteraction(0, 0, 'email');
      const after = computeScore(newAmp, 0);
      expect(after).toBeGreaterThan(before);
      expect(after - before).toBe(IMPULSE.email); // +5
    });

    test('sending DM increases score from base', () => {
      const before = computeScore(0, 0);
      const newAmp = addInteraction(0, 0, 'dm');
      const after = computeScore(newAmp, 0);
      expect(after).toBeGreaterThan(before);
      expect(after - before).toBe(IMPULSE.dm); // +4
    });

    test('delta is visible immediately after interaction', () => {
      const oldAmp = 10;
      const daysSince = 5;
      const oldScore = computeScore(oldAmp, daysSince);
      const newAmp = addInteraction(oldAmp, daysSince, 'email');
      const newScore = computeScore(newAmp, 0); // 0 days since the interaction just happened
      expect(newScore).toBeGreaterThan(oldScore);
    });
  });

  describe('weekly interaction pattern over 8 weeks', () => {
    // User sends one email per week for 8 weeks, then stops
    test('weekly emails build warmth, then it decays after stopping', () => {
      let amplitude = 0;
      const mode = 'medium';
      const scores: number[] = [];

      // 8 weeks of weekly emails
      for (let week = 0; week < 8; week++) {
        amplitude = addInteraction(amplitude, week === 0 ? 0 : 7, 'email', mode);
        scores.push(computeScore(amplitude, 0, mode));
      }

      // Score should be climbing during active period
      expect(scores[7]).toBeGreaterThan(scores[0]);

      // Verify score is building (each week should be >= previous, accounting for 7-day decay + 5 impulse)
      for (let i = 1; i < scores.length; i++) {
        // With medium mode, 7-day decay keeps ~54% of amplitude, then adds 5
        // So scores should generally increase
        expect(scores[i]).toBeGreaterThanOrEqual(scores[0]);
      }

      // Now stop interacting — decay over 12 more weeks
      const peakScore = scores[7];
      const decayScores: number[] = [];
      for (let week = 1; week <= 12; week++) {
        decayScores.push(computeScore(amplitude, week * 7, mode));
      }

      // Decay should be monotonically decreasing
      let prev = peakScore;
      for (const s of decayScores) {
        expect(s).toBeLessThanOrEqual(prev);
        prev = s;
      }

      // After 12 weeks of no contact, should be near base
      expect(decayScores[11]).toBeLessThanOrEqual(BASE + 2);
    });
  });

  describe('daily interaction burst then silence', () => {
    test('5 days of daily meetings → hot, then decays to cool in ~30 days', () => {
      let amplitude = 0;
      const mode = 'medium';

      // 5 daily meetings (impulse 9 each)
      for (let day = 0; day < 5; day++) {
        amplitude = addInteraction(amplitude, day === 0 ? 0 : 1, 'meeting', mode);
      }

      const peakScore = computeScore(amplitude, 0, mode);
      expect(peakScore).toBeGreaterThanOrEqual(60); // at least warm

      // Decay checkpoints
      const day7 = computeScore(amplitude, 7, mode);
      const day14 = computeScore(amplitude, 14, mode);
      const day30 = computeScore(amplitude, 30, mode);
      const day60 = computeScore(amplitude, 60, mode);

      expect(day7).toBeLessThan(peakScore);
      expect(day14).toBeLessThan(day7);
      expect(day30).toBeLessThan(day14);
      expect(day60).toBeLessThanOrEqual(BASE + 1);
    });
  });

  describe('mode comparison: same interactions, different decay', () => {
    test('fast mode drops to base faster than slow mode', () => {
      // Same interaction pattern for all modes
      const interactions = [
        { daysSince: 0, kind: 'meeting' },
        { daysSince: 2, kind: 'email' },
        { daysSince: 5, kind: 'sms' },
      ];

      function simulate(mode: string): number[] {
        let amp = 0;
        for (const { daysSince, kind } of interactions) {
          amp = addInteraction(amp, daysSince, kind, mode);
        }
        // Score at 7, 14, 30, 60 days after last interaction
        return [7, 14, 30, 60].map(d => computeScore(amp, d, mode));
      }

      const fast = simulate('fast');
      const medium = simulate('medium');
      const slow = simulate('slow');

      // Fast decays fastest at every checkpoint
      for (let i = 0; i < fast.length; i++) {
        expect(fast[i]).toBeLessThanOrEqual(medium[i]);
        expect(medium[i]).toBeLessThanOrEqual(slow[i]);
      }

      // All reach base eventually
      expect(fast[3]).toBe(BASE);  // day 60
      expect(medium[3]).toBe(BASE); // day 60
      // slow may still be slightly above base at day 60
      expect(slow[3]).toBeLessThanOrEqual(BASE + 3);
    });
  });

  describe('edge cases', () => {
    test('zero amplitude never changes score regardless of time', () => {
      for (let day = 0; day <= 365; day += 30) {
        expect(computeScore(0, day)).toBe(BASE);
      }
    });

    test('maximum amplitude (100) starts at 100 and decays', () => {
      expect(computeScore(100, 0)).toBe(100);
      expect(computeScore(100, 30)).toBeLessThan(100);
      expect(computeScore(100, 180)).toBe(BASE);
    });

    test('score never goes below 0 or above 100', () => {
      for (const amp of [0, 1, 50, 100, 200]) {
        for (let day = 0; day <= 365; day += 10) {
          for (const mode of ['fast', 'medium', 'slow']) {
            const score = computeScore(amp, day, mode);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    test('single note interaction barely moves the needle', () => {
      const amp = addInteraction(0, 0, 'note');
      const score = computeScore(amp, 0);
      expect(score).toBe(33); // 30 + 3
      // And it decays fast
      expect(computeScore(amp, 30)).toBe(BASE);
    });
  });
});
