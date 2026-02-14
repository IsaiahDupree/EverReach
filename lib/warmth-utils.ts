// Pure warmth display functions - no dependencies
// Warmth SCORES are computed server-side via EWMA (backend computeWarmthFromAmplitude)
// These functions only handle display: colors and labels for a given score.

export function getWarmthColor(warmth: number): string {
  if (warmth >= 80) return '#EF4444'; // red (hot)
  if (warmth >= 60) return '#F59E0B'; // orange (warm)
  if (warmth >= 40) return '#10B981'; // green (neutral)
  if (warmth >= 20) return '#3B82F6'; // blue (cool)
  return '#6B7280'; // gray (cold)
}

export function getWarmthLabel(warmth: number): string {
  if (warmth >= 80) return 'Hot';
  if (warmth >= 60) return 'Warm';
  if (warmth >= 40) return 'Neutral';
  if (warmth >= 20) return 'Cool';
  return 'Cold';
}
