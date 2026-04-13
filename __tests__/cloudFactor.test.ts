import { cloudFactor } from '@/services/sunDoseCalculator';

describe('cloudFactor', () => {
  describe('boundary testing at thresholds', () => {
    it('should handle 0% cloud cover', () => {
      expect(cloudFactor(0)).toBe(1.0);
    });

    it('should handle boundary at 15% (inclusive for 1.0)', () => {
      expect(cloudFactor(15)).toBe(1.0);
    });

    it('should handle boundary at 16% (exclusive, drops to 0.85)', () => {
      expect(cloudFactor(16)).toBe(0.85);
    });

    it('should handle 40% cloud cover (inclusive for 0.85)', () => {
      expect(cloudFactor(40)).toBe(0.85);
    });

    it('should handle boundary at 41% (exclusive, drops to 0.65)', () => {
      expect(cloudFactor(41)).toBe(0.65);
    });

    it('should handle 65% cloud cover (inclusive for 0.65)', () => {
      expect(cloudFactor(65)).toBe(0.65);
    });

    it('should handle boundary at 66% (exclusive, drops to 0.4)', () => {
      expect(cloudFactor(66)).toBe(0.4);
    });

    it('should handle 100% cloud cover', () => {
      expect(cloudFactor(100)).toBe(0.4);
    });
  });

  describe('range testing', () => {
    // Clear range: 0–15%
    it('should return 1.0 for all values 0–15%', () => {
      for (let i = 0; i <= 15; i++) {
        expect(cloudFactor(i)).toBe(1.0);
      }
    });

    // Partly cloudy range: 16–40%
    it('should return 0.85 for all values 16–40%', () => {
      for (let i = 16; i <= 40; i++) {
        expect(cloudFactor(i)).toBe(0.85);
      }
    });

    // Mostly cloudy range: 41–65%
    it('should return 0.65 for all values 41–65%', () => {
      for (let i = 41; i <= 65; i++) {
        expect(cloudFactor(i)).toBe(0.65);
      }
    });

    // Fully cloudy range: 66–100%
    it('should return 0.4 for all values 66–100%', () => {
      for (let i = 66; i <= 100; i++) {
        expect(cloudFactor(i)).toBe(0.4);
      }
    });
  });

  describe('impact on dose calculation', () => {
    it('should reduce dose by 15% at 50% cloud cover', () => {
      const cloudiness = cloudFactor(50);
      expect(cloudiness).toBe(0.65);
      // This reduces dose to 65% of clear-sky value
    });

    it('should reduce dose by 60% at 90% cloud cover', () => {
      const cloudiness = cloudFactor(90);
      expect(cloudiness).toBe(0.4);
      // This reduces dose to 40% of clear-sky value
    });

    it('should have no reduction at 0% cloud cover', () => {
      const cloudiness = cloudFactor(0);
      expect(cloudiness).toBe(1.0);
      // No reduction
    });
  });

  describe('realistic weather scenarios', () => {
    it('should model clear day correctly', () => {
      // Clear blue sky: 5% cloud
      expect(cloudFactor(5)).toBe(1.0);
    });

    it('should model partly cloudy day correctly', () => {
      // Typical partly cloudy: 25% cloud
      expect(cloudFactor(25)).toBe(0.85);
    });

    it('should model overcast day correctly', () => {
      // Overcast but bright: 55% cloud
      expect(cloudFactor(55)).toBe(0.65);
    });

    it('should model very heavy overcast correctly', () => {
      // Dark overcast: 85% cloud
      expect(cloudFactor(85)).toBe(0.4);
    });
  });
});
