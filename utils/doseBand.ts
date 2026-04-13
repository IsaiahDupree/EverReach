/**
 * doseBand.ts
 *
 * Color bands for UV dose score display.
 * 0–30 (gray), 30–80 (orange), 80–150 (amber), 150–250 (red), 250+ (purple)
 */

export interface DoseBand {
  label: string;
  color: string;
  bgColor: string;
  riskLevel: 'low' | 'building' | 'good' | 'caution' | 'overexposure';
}

/**
 * Gets dose band info for a given score.
 */
export function getDoseBand(score: number): DoseBand {
  if (score < 30) {
    return {
      label: 'Low',
      color: '#64748B', // gray
      bgColor: '#F1F5F9',
      riskLevel: 'low',
    };
  }
  if (score < 80) {
    return {
      label: 'Building',
      color: '#F97316', // orange
      bgColor: '#FEF3C7',
      riskLevel: 'building',
    };
  }
  if (score < 150) {
    return {
      label: 'Good',
      color: '#FCD34D', // amber
      bgColor: '#FFFBEB',
      riskLevel: 'good',
    };
  }
  if (score < 250) {
    return {
      label: 'Caution',
      color: '#EF4444', // red
      bgColor: '#FEE2E2',
      riskLevel: 'caution',
    };
  }
  return {
    label: 'Overexposure',
    color: '#7C3AED', // purple
    bgColor: '#F3E8FF',
    riskLevel: 'overexposure',
  };
}

/**
 * Gets threshold values for all bands.
 */
export function getDoseBandThresholds(): Record<string, { min: number; max: number }> {
  return {
    low: { min: 0, max: 30 },
    building: { min: 30, max: 80 },
    good: { min: 80, max: 150 },
    caution: { min: 150, max: 250 },
    overexposure: { min: 250, max: Infinity },
  };
}
