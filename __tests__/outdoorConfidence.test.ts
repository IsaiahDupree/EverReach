import { calcOutdoorConfidence, SessionSignals } from '@/services/outdoorConfidence';

describe('outdoorConfidence', () => {
  const baseSignals: SessionSignals = {
    motionType: 'unknown',
    isDaylight: false,
    locationFreshSeconds: 600,
    distanceMovedMeters: 0,
    speed: 0,
    durationMinutes: 10,
  };

  describe('motion type scoring', () => {
    it('should give walking +0.25 bonus', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'walking',
      });
      // baseline 0.5 + walking 0.25 = 0.75
      expect(confidence).toBeGreaterThanOrEqual(0.7);
      expect(confidence).toBeLessThanOrEqual(0.8);
    });

    it('should give running +0.30 bonus', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'running',
      });
      // baseline 0.5 + running 0.30 = 0.80
      expect(confidence).toBeGreaterThanOrEqual(0.75);
      expect(confidence).toBeLessThanOrEqual(0.85);
    });

    it('should give cycling +0.20 bonus', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'cycling',
      });
      // baseline 0.5 + cycling 0.20 = 0.70
      expect(confidence).toBeGreaterThanOrEqual(0.65);
      expect(confidence).toBeLessThanOrEqual(0.75);
    });

    it('should override to 0.05 for automotive', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'automotive',
      });
      // automotive overrides to 0.05
      expect(confidence).toBeLessThan(0.1);
    });

    it('should give stationary -0.10 penalty', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'stationary',
      });
      // baseline 0.5 - stationary 0.10 = 0.40
      expect(confidence).toBeGreaterThanOrEqual(0.35);
      expect(confidence).toBeLessThanOrEqual(0.45);
    });
  });

  describe('daylight bonus', () => {
    it('should add +0.15 for daylight', () => {
      const withoutDaylight = calcOutdoorConfidence({
        ...baseSignals,
        isDaylight: false,
        motionType: 'walking',
      });

      const withDaylight = calcOutdoorConfidence({
        ...baseSignals,
        isDaylight: true,
        motionType: 'walking',
      });

      expect(withDaylight - withoutDaylight).toBeCloseTo(0.15, 2);
    });
  });

  describe('location freshness bonus', () => {
    it('should add +0.10 for recent GPS (< 300s)', () => {
      const staleLocation = calcOutdoorConfidence({
        ...baseSignals,
        locationFreshSeconds: 600,
        motionType: 'walking',
      });

      const freshLocation = calcOutdoorConfidence({
        ...baseSignals,
        locationFreshSeconds: 100,
        motionType: 'walking',
      });

      expect(freshLocation - staleLocation).toBeCloseTo(0.1, 2);
    });

    it('should not add bonus for stale GPS (>= 300s)', () => {
      const stale = calcOutdoorConfidence({
        ...baseSignals,
        locationFreshSeconds: 300,
        motionType: 'walking',
      });

      const staler = calcOutdoorConfidence({
        ...baseSignals,
        locationFreshSeconds: 600,
        motionType: 'walking',
      });

      expect(stale).toEqual(staler);
    });
  });

  describe('movement distance bonus', () => {
    it('should add +0.10 for > 50m movement', () => {
      const noMovement = calcOutdoorConfidence({
        ...baseSignals,
        distanceMovedMeters: 0,
        motionType: 'walking',
      });

      const withMovement = calcOutdoorConfidence({
        ...baseSignals,
        distanceMovedMeters: 100,
        motionType: 'walking',
      });

      expect(withMovement - noMovement).toBeCloseTo(0.1, 2);
    });

    it('should not add bonus for <= 50m movement', () => {
      const at50m = calcOutdoorConfidence({
        ...baseSignals,
        distanceMovedMeters: 50,
        motionType: 'walking',
      });

      const at49m = calcOutdoorConfidence({
        ...baseSignals,
        distanceMovedMeters: 49,
        motionType: 'walking',
      });

      expect(at50m).toEqual(at49m);
    });
  });

  describe('walking pace bonus', () => {
    it('should add +0.05 for 0–2.5 m/s speed', () => {
      const noSpeed = calcOutdoorConfidence({
        ...baseSignals,
        speed: 0,
        motionType: 'walking',
      });

      const walkingSpeed = calcOutdoorConfidence({
        ...baseSignals,
        speed: 1.5,
        motionType: 'walking',
      });

      expect(walkingSpeed - noSpeed).toBeCloseTo(0.05, 2);
    });

    it('should not add bonus for speed > 2.5 m/s', () => {
      const slowWalk = calcOutdoorConfidence({
        ...baseSignals,
        speed: 2.5,
        motionType: 'walking',
      });

      const fastWalk = calcOutdoorConfidence({
        ...baseSignals,
        speed: 3.0,
        motionType: 'walking',
      });

      expect(slowWalk).toBeGreaterThan(fastWalk);
    });
  });

  describe('clamping to [0, 1]', () => {
    it('should clamp to minimum 0', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'stationary',
        locationFreshSeconds: 1000,
        isDaylight: false,
      });

      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('should clamp to maximum 1.0', () => {
      const confidence = calcOutdoorConfidence({
        ...baseSignals,
        motionType: 'running',
        isDaylight: true,
        locationFreshSeconds: 100,
        distanceMovedMeters: 500,
        speed: 2.0,
      });

      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('realistic scenarios', () => {
    it('should score walking in daylight highly (>= 0.85)', () => {
      const confidence = calcOutdoorConfidence({
        motionType: 'walking',
        isDaylight: true,
        locationFreshSeconds: 100,
        distanceMovedMeters: 150,
        speed: 1.2,
        durationMinutes: 30,
      });

      expect(confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should score automotive very low (<= 0.10)', () => {
      const confidence = calcOutdoorConfidence({
        motionType: 'automotive',
        isDaylight: true,
        locationFreshSeconds: 50,
        distanceMovedMeters: 1000,
        speed: 15,
        durationMinutes: 30,
      });

      expect(confidence).toBeLessThanOrEqual(0.1);
    });

    it('should score stationary with daylight around 0.55', () => {
      const confidence = calcOutdoorConfidence({
        motionType: 'stationary',
        isDaylight: true,
        locationFreshSeconds: 100,
        distanceMovedMeters: 0,
        speed: 0,
        durationMinutes: 10,
      });

      expect(confidence).toBeGreaterThanOrEqual(0.5);
      expect(confidence).toBeLessThanOrEqual(0.65);
    });

    it('should score walking without daylight around 0.60', () => {
      const confidence = calcOutdoorConfidence({
        motionType: 'walking',
        isDaylight: false,
        locationFreshSeconds: 100,
        distanceMovedMeters: 100,
        speed: 1.0,
        durationMinutes: 10,
      });

      expect(confidence).toBeGreaterThanOrEqual(0.55);
      expect(confidence).toBeLessThanOrEqual(0.70);
    });
  });
});
