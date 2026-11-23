import { FitzpatrickType, VitaminDCalcParams, SkinTypeInfo } from '@/types/suntrace';

/**
 * Skin type data: burn times at UV index 3, D production rates
 * Based on Fitzpatrick scale + Holick vitamin D research
 */
export const SKIN_TYPE_DATA: Record<FitzpatrickType, SkinTypeInfo> = {
  1: {
    type: 1,
    name: 'Type I — Very Fair',
    description: 'Always burns, never tans. Very pale skin, often with freckles.',
    colorHex: '#FFE4C4',
    burnTime: 10, // minutes at UV 3
    dProductionRate: 2.8, // IU per minute at UV index 1
  },
  2: {
    type: 2,
    name: 'Type II — Fair',
    description: 'Usually burns, sometimes tans. Light skin.',
    colorHex: '#FFDAB9',
    burnTime: 15,
    dProductionRate: 2.4,
  },
  3: {
    type: 3,
    name: 'Type III — Medium',
    description: 'Sometimes burns, always tans. Olive or light brown skin.',
    colorHex: '#D2A679',
    burnTime: 20,
    dProductionRate: 2.0,
  },
  4: {
    type: 4,
    name: 'Type IV — Olive',
    description: 'Rarely burns, always tans. Brown skin.',
    colorHex: '#A0785A',
    burnTime: 30,
    dProductionRate: 1.6,
  },
  5: {
    type: 5,
    name: 'Type V — Brown',
    description: 'Very rarely burns, tans easily. Dark brown skin.',
    colorHex: '#7B5B3A',
    burnTime: 45,
    dProductionRate: 1.2,
  },
  6: {
    type: 6,
    name: 'Type VI — Dark',
    description: 'Never burns, tans very easily. Very dark brown or black skin.',
    colorHex: '#4A3728',
    burnTime: 60,
    dProductionRate: 0.8,
  },
};

/**
 * Calculate vitamin D earned during a sun session
 * Formula: D = uvIndex * minutes * skinRate * seasonFactor
 * Based on Holick (2004): Production of vitamin D in skin
 */
export function calculateDEarned({ uv_index, minutes, skin_type }: VitaminDCalcParams): number {
  if (uv_index < 1) return 0;
  const skinData = SKIN_TYPE_DATA[skin_type];
  const rawIU = uv_index * minutes * skinData.dProductionRate;
  // Cap at reasonable maximum (10,000 IU per session)
  return Math.min(Math.round(rawIU), 10000);
}

/**
 * Calculate daily vitamin D target based on skin type and age
 * RDA: 600-800 IU/day; optimal sun exposure target for sun-derived D
 */
export function calculateDailyTarget(skin_type: FitzpatrickType, age: number): number {
  // Base target from skin type (darker skin needs more sun time)
  const baseTargets: Record<FitzpatrickType, number> = {
    1: 1000,
    2: 1200,
    3: 1500,
    4: 2000,
    5: 2500,
    6: 3000,
  };

  let target = baseTargets[skin_type];

  // Age adjustment: over 50, D production decreases ~50%
  if (age > 70) target = Math.round(target * 1.5);
  else if (age > 50) target = Math.round(target * 1.25);
  else if (age < 18) target = Math.round(target * 0.8);

  return target;
}

/**
 * Calculate burn risk in seconds remaining at current UV
 * Returns seconds until safe exposure limit is reached
 */
export function calculateBurnRiskSeconds(
  skin_type: FitzpatrickType,
  uv_index: number,
  already_exposed_minutes: number
): number {
  if (uv_index < 1) return 99999; // no meaningful UV

  const skinData = SKIN_TYPE_DATA[skin_type];
  // Burn time scales inversely with UV index (relative to UV 3 baseline)
  const burnTimeAtCurrentUV = (skinData.burnTime * 3) / uv_index;
  const remainingMinutes = Math.max(0, burnTimeAtCurrentUV - already_exposed_minutes);
  return Math.round(remainingMinutes * 60);
}

/**
 * Get burn risk level based on remaining burn time
 */
export function getBurnRiskLevel(
  skin_type: FitzpatrickType,
  uv_index: number,
  elapsed_minutes: number
): 'low' | 'moderate' | 'high' | 'very_high' {
  const secondsRemaining = calculateBurnRiskSeconds(skin_type, uv_index, elapsed_minutes);
  const minutesRemaining = secondsRemaining / 60;

  if (minutesRemaining > 20) return 'low';
  if (minutesRemaining > 10) return 'moderate';
  if (minutesRemaining > 5) return 'high';
  return 'very_high';
}

/**
 * Get UV index category and color
 */
export function getUVCategory(uvIndex: number): {
  label: string;
  color: string;
  bgColor: string;
  level: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
} {
  if (uvIndex < 3) return { label: 'Low', color: '#22c55e', bgColor: '#dcfce7', level: 'low' };
  if (uvIndex < 6) return { label: 'Moderate', color: '#eab308', bgColor: '#fef9c3', level: 'moderate' };
  if (uvIndex < 8) return { label: 'High', color: '#f97316', bgColor: '#ffedd5', level: 'high' };
  if (uvIndex < 11) return { label: 'Very High', color: '#ef4444', bgColor: '#fee2e2', level: 'very_high' };
  return { label: 'Extreme', color: '#7c3aed', bgColor: '#ede9fe', level: 'extreme' };
}

/**
 * Find best UV window in a day's hourly forecast
 * "Best" = highest UV but not extreme, between 9am-4pm
 */
export function findBestUVWindow(hours: Array<{ time: string; uv_index: number }>): {
  start: string;
  end: string;
  peak_uv: number;
} | null {
  const dayHours = hours.filter(h => {
    const hour = new Date(h.time).getHours();
    return hour >= 9 && hour <= 16 && h.uv_index >= 2;
  });

  if (!dayHours.length) return null;

  // Find peak hour
  const peakHour = dayHours.reduce((max, h) => h.uv_index > max.uv_index ? h : max);
  const peakUV = Math.max(...dayHours.map(h => h.uv_index));

  // Window is ±1 hour around peak
  const peakTime = new Date(peakHour.time);
  const windowStart = new Date(peakTime.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(peakTime.getTime() + 60 * 60 * 1000);

  return {
    start: windowStart.toISOString(),
    end: windowEnd.toISOString(),
    peak_uv: peakUV,
  };
}
