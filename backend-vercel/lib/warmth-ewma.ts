export type WarmthMode = 'slow' | 'medium' | 'fast';
export type WarmthBand = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LAMBDA_PER_DAY: Record<WarmthMode, number> = {
  slow: 0.01,
  medium: 0.03,
  fast: 0.06,
};

export const WMIN = 0; // minimum warmth floor

export function warmthScoreFromAnchor(
  anchorScore: number,
  anchorAt: string | Date,
  mode: WarmthMode
): number {
  const now = Date.now();
  const anchorTime = new Date(anchorAt).getTime();
  if (!Number.isFinite(anchorTime)) return Math.max(WMIN, Math.min(100, anchorScore ?? 50));
  const daysSince = (now - anchorTime) / DAY_MS;
  const lambda = LAMBDA_PER_DAY[mode] ?? LAMBDA_PER_DAY.medium;
  const score = WMIN + (anchorScore - WMIN) * Math.exp(-lambda * daysSince);
  return Math.max(0, Math.min(100, score));
}

export function getWarmthBand(score: number): WarmthBand {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'cool';
  return 'cold';
}
