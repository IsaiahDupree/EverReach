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
  if (warmth >= 60) return '#10B981'; // green (hot)
  if (warmth >= 30) return '#F59E0B'; // yellow (warm)
  if (warmth >= 10) return '#6B7280'; // gray (cool)
  return '#EF4444'; // red (cold)
}

export function getWarmthLabel(warmth: number): string {
  if (warmth >= 60) return 'Hot';
  if (warmth >= 30) return 'Warm';
  if (warmth >= 10) return 'Cool';
  return 'Cold';
}
