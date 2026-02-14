// Pure warmth calculation functions - no dependencies
// Extracted for easier testing without React Native/Expo deps

export function calculateWarmth(lastInteraction?: string): number {
  if (!lastInteraction) return 0;
  
  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const halfLife = 14; // days
  return Math.round(100 * Math.exp(-daysSince / halfLife));
}

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
