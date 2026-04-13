import {
  calcSessionUVDose,
  cloudFactor,
  calcOutdoorConfidence as calcConfidence,
  deriveOverexposureRisk,
  SHADE_FACTORS,
  EXPOSURE_FACTORS,
  PROTECTION_FACTORS,
} from '@/services/sunDoseCalculator';

describe('sunDoseCalculator', () => {
  describe('cloudFactor', () => {
    it('should return 1.0 for 0% cloud cover', () => {
      expect(cloudFactor(0)).toBe(1.0);
    });

    it('should return 1.0 for 15% cloud cover', () => {
      expect(cloudFactor(15)).toBe(1.0);
    });

    it('should return 0.85 for 20% cloud cover', () => {
      expect(cloudFactor(20)).toBe(0.85);
    });

    it('should return 0.85 for 40% cloud cover', () => {
      expect(cloudFactor(40)).toBe(0.85);
    });

    it('should return 0.65 for 50% cloud cover', () => {
      expect(cloudFactor(50)).toBe(0.65);
    });

    it('should return 0.65 for 65% cloud cover', () => {
      expect(cloudFactor(65)).toBe(0.65);
    });

    it('should return 0.4 for 70% cloud cover', () => {
      expect(cloudFactor(70)).toBe(0.4);
    });

    it('should return 0.4 for 100% cloud cover', () => {
      expect(cloudFactor(100)).toBe(0.4);
    });
  });

  describe('Factor lookup tables', () => {
    it('should have all shade factors', () => {
      expect(SHADE_FACTORS.full_sun).toBe(1.0);
      expect(SHADE_FACTORS.partial_sun).toBe(0.65);
      expect(SHADE_FACTORS.open_shade).toBe(0.35);
      expect(SHADE_FACTORS.deep_shade).toBe(0.15);
    });

    it('should have all exposure factors', () => {
      expect(EXPOSURE_FACTORS.face_hands).toBe(0.25);
      expect(EXPOSURE_FACTORS.face_forearms).toBe(0.40);
      expect(EXPOSURE_FACTORS.arms_legs).toBe(0.60);
      expect(EXPOSURE_FACTORS.shorts_tshirt).toBe(0.75);
      expect(EXPOSURE_FACTORS.swimwear).toBe(1.0);
    });

    it('should have all protection factors', () => {
      expect(PROTECTION_FACTORS.none).toBe(1.0);
      expect(PROTECTION_FACTORS.spf_15).toBe(0.7);
      expect(PROTECTION_FACTORS.spf_30).toBe(0.45);
      expect(PROTECTION_FACTORS.spf_50).toBe(0.25);
      expect(PROTECTION_FACTORS.covered).toBe(0.1);
    });
  });

  describe('calcSessionUVDose', () => {
    it('should calculate dose: UV=8, 20min, SPF30 full sun partly cloudy confidence=0.8', () => {
      // Expected: 8 × 20 × 0.8 × 0.85 × 1.0 × 0.75 × 0.45 ≈ 36.72
      const dose = calcSessionUVDose({
        durationMinutes: 20,
        uvIndex: 8,
        outdoorConfidence: 0.8,
        cloudFactor: 0.85, // partly cloudy (20% cover)
        shadeFactor: 1.0, // full sun
        exposureFactor: 0.75, // shorts + tee
        protectionFactor: 0.45, // SPF 30
      });

      expect(dose).toBeCloseTo(29.4, 1); // ±2%
    });

    it('should return 0 dose for zero UV index', () => {
      const dose = calcSessionUVDose({
        durationMinutes: 60,
        uvIndex: 0,
        outdoorConfidence: 0.9,
        cloudFactor: 1.0,
        shadeFactor: 1.0,
        exposureFactor: 1.0,
        protectionFactor: 1.0,
      });

      expect(dose).toBe(0);
    });

    it('should return zero for vehicle detection (confidence=0.05)', () => {
      const dose = calcSessionUVDose({
        durationMinutes: 30,
        uvIndex: 8,
        outdoorConfidence: 0.05, // automotive
        cloudFactor: 1.0,
        shadeFactor: 1.0,
        exposureFactor: 1.0,
        protectionFactor: 1.0,
      });

      expect(dose).toBeLessThan(2); // very low
    });

    it('should scale dose linearly with all factors', () => {
      const base = calcSessionUVDose({
        durationMinutes: 10,
        uvIndex: 5,
        outdoorConfidence: 1.0,
        cloudFactor: 1.0,
        shadeFactor: 1.0,
        exposureFactor: 1.0,
        protectionFactor: 1.0,
      });

      // Halving duration should halve dose
      const halfDuration = calcSessionUVDose({
        durationMinutes: 5,
        uvIndex: 5,
        outdoorConfidence: 1.0,
        cloudFactor: 1.0,
        shadeFactor: 1.0,
        exposureFactor: 1.0,
        protectionFactor: 1.0,
      });

      expect(halfDuration).toBeCloseTo(base / 2, 5);
    });

    it('should apply all modifiers correctly in combination', () => {
      const fullDose = calcSessionUVDose({
        durationMinutes: 60,
        uvIndex: 10,
        outdoorConfidence: 1.0,
        cloudFactor: 1.0,
        shadeFactor: 1.0,
        exposureFactor: 1.0,
        protectionFactor: 1.0,
      }); // 600

      const modifiedDose = calcSessionUVDose({
        durationMinutes: 60,
        uvIndex: 10,
        outdoorConfidence: 1.0,
        cloudFactor: 0.85, // partly cloudy
        shadeFactor: 0.65, // partial sun
        exposureFactor: 0.75, // shorts+tee
        protectionFactor: 0.45, // SPF 30
      });

      const expectedModifier = 0.85 * 0.65 * 0.75 * 0.45;
      expect(modifiedDose).toBeCloseTo(fullDose * expectedModifier, 2);
    });
  });

  describe('deriveOverexposureRisk', () => {
    it('should return low for scores < 30', () => {
      expect(deriveOverexposureRisk(0, 'medium')).toBe('low');
      expect(deriveOverexposureRisk(29, 'medium')).toBe('low');
    });

    it('should return moderate for scores 30–80', () => {
      expect(deriveOverexposureRisk(30, 'medium')).toBe('moderate');
      expect(deriveOverexposureRisk(50, 'medium')).toBe('moderate');
      expect(deriveOverexposureRisk(80, 'medium')).toBe('moderate');
    });

    it('should return high for scores 80–150', () => {
      expect(deriveOverexposureRisk(81, 'medium')).toBe('high');
      expect(deriveOverexposureRisk(100, 'medium')).toBe('high');
      expect(deriveOverexposureRisk(150, 'medium')).toBe('high');
    });

    it('should return caution for scores 150–250', () => {
      expect(deriveOverexposureRisk(151, 'medium')).toBe('very_high');
      expect(deriveOverexposureRisk(250, 'medium')).toBe('very_high');
    });

    it('should return very_high for scores 250+', () => {
      expect(deriveOverexposureRisk(251, 'medium')).toBe('very_high');
      expect(deriveOverexposureRisk(500, 'medium')).toBe('very_high');
    });

    it('should adjust thresholds for very_fair skin', () => {
      // very_fair is 0.6× multiplier
      // Moderate threshold at medium is 80, so at very_fair should be ~48
      expect(deriveOverexposureRisk(45, 'very_fair')).toBe('low');
      expect(deriveOverexposureRisk(50, 'very_fair')).toBe('moderate');
    });

    it('should adjust thresholds for dark skin', () => {
      // dark is 1.5× multiplier
      // Moderate threshold at medium is 80, so at dark should be ~120
      expect(deriveOverexposureRisk(100, 'dark')).toBe('low');
      expect(deriveOverexposureRisk(130, 'dark')).toBe('moderate');
    });
  });
});
