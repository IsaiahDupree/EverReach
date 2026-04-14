/**
 * Warmth Score Calculation Engine
 *
 * Implements exponential decay algorithm with sentiment modifier and history bonus.
 * Warmth score represents relationship health on a scale of 0-100.
 *
 * Score Bands:
 * - 75-100: Warm (actively maintained)
 * - 40-74:  Cooling (needs attention)
 * - 15-39:  Cold (at risk)
 * - 0-14:   Drifting (critical)
 */

export interface WarmthFactors {
  score?: number;
  lastInteractionDate?: string; // ISO8601
  interactionFrequencyDays?: number; // How often they typically interact
  recentSentiment?: number; // Average sentiment -1 to 1 from last 5 interactions
  relationshipLength?: number; // Days since first interaction
  interactionCount?: number; // Total interactions ever
}

export interface WarmthResult {
  score: number;
  band: 'warm' | 'cooling' | 'cold' | 'drifting';
  daysSinceLastInteraction: number | null;
  decayPercentage: number;
  sentimentModifier: number;
  historyBonus: number;
}

/**
 * Calculate warmth score with exponential decay
 *
 * Algorithm:
 * 1. Start with previous score (or default 50)
 * 2. Apply exponential decay: score * exp(-days_elapsed / half_life)
 * 3. Add sentiment modifier (±10% based on average sentiment)
 * 4. Add history bonus (up to +10 for long relationships)
 * 5. Clamp to 0-100
 *
 * Parameters:
 * - previousScore: Score from last calculation (0-100). Default: 50
 * - lastInteractionDate: When they last interacted. If null, assume today
 * - interactionFrequencyDays: How often they typically interact (default: 30)
 * - recentSentiment: Average sentiment from last 5 interactions (-1 to 1)
 * - relationshipLength: Days since first interaction. For history bonus.
 * - interactionCount: Total interactions ever. Rewards consistency.
 */
export function calculateWarmthScore(factors: WarmthFactors): WarmthResult {
  const today = new Date();
  const previousScore = factors.score ?? 50;
  const interactionFrequencyDays = factors.interactionFrequencyDays ?? 30;
  const recentSentiment = factors.recentSentiment ?? 0;

  // ── 1. Days since last interaction ──
  let daysSinceLastInteraction: number | null = null;
  if (factors.lastInteractionDate) {
    const lastDate = new Date(factors.lastInteractionDate);
    daysSinceLastInteraction = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // ── 2. Exponential decay ──
  // Half-life = interactionFrequencyDays
  // After one half-life, score drops to 50% of current
  // Formula: score * exp(-t / half_life) where t is days elapsed
  let decayedScore = previousScore;
  let decayPercentage = 0;

  if (daysSinceLastInteraction !== null && daysSinceLastInteraction > 0) {
    const lambda = Math.log(2) / interactionFrequencyDays; // decay constant
    const decayFactor = Math.exp(-daysSinceLastInteraction * lambda);
    decayedScore = previousScore * decayFactor;
    decayPercentage = (1 - decayFactor) * 100;
  }

  // ── 3. Sentiment modifier (±10%) ──
  // Positive interactions boost score, negative ones reduce it
  // recentSentiment ranges from -1 (negative) to 1 (positive)
  const sentimentModifier = recentSentiment * 10; // ±10 points

  // ── 4. History bonus (up to +10) ──
  // Long relationships get stability bonus
  // After 365 days, you get full +10 bonus
  let historyBonus = 0;
  if (factors.relationshipLength && factors.relationshipLength > 0) {
    // Asymptotic approach to +10: bonus = 10 * (1 - exp(-days/365))
    historyBonus = Math.min(10, 10 * (1 - Math.exp(-factors.relationshipLength / 365)));
  }

  // ── 5. Clamp to 0-100 ──
  const finalScore = Math.max(0, Math.min(100, decayedScore + sentimentModifier + historyBonus));

  // ── 6. Determine band ──
  let band: 'warm' | 'cooling' | 'cold' | 'drifting';
  if (finalScore >= 75) {
    band = 'warm';
  } else if (finalScore >= 40) {
    band = 'cooling';
  } else if (finalScore >= 15) {
    band = 'cold';
  } else {
    band = 'drifting';
  }

  return {
    score: Math.round(finalScore * 10) / 10, // Round to 1 decimal
    band,
    daysSinceLastInteraction,
    decayPercentage: Math.round(decayPercentage * 10) / 10,
    sentimentModifier: Math.round(sentimentModifier * 10) / 10,
    historyBonus: Math.round(historyBonus * 10) / 10,
  };
}

/**
 * Interpret warmth score into user-friendly message
 */
export function getWarmthMessage(score: number): string {
  if (score >= 75) {
    return '✨ Strong connection';
  } else if (score >= 40) {
    return '⚠️ Relationship cooling';
  } else if (score >= 15) {
    return '❄️ Friendship cold';
  } else {
    return '💔 Friendship drifting';
  }
}

/**
 * Calculate recommended days until next interaction
 * Based on interaction frequency and current decay
 */
export function getRecommendedInteractionDays(
  currentScore: number,
  interactionFrequencyDays: number = 30
): number {
  // Recommend reaching out when score would drop below 40 (cooling band)
  // Solve: 40 = currentScore * exp(-t / halfLife)
  // t = -halfLife * ln(40 / currentScore)
  const targetScore = 40;
  if (currentScore <= targetScore) {
    return 0; // Reach out now!
  }

  const lambda = Math.log(2) / interactionFrequencyDays;
  const daysUntilCooling = -Math.log(targetScore / currentScore) / lambda;
  return Math.max(0, Math.round(daysUntilCooling));
}

/**
 * Get actionable advice based on warmth score
 */
export function getWarmthAdvice(result: WarmthResult): string {
  if (result.band === 'warm') {
    return `Keep the momentum! You're doing great with this relationship.`;
  } else if (result.band === 'cooling') {
    return `It's been a while. Consider reaching out in the next few days to keep the connection strong.`;
  } else if (result.band === 'cold') {
    return `This relationship needs attention. Send a thoughtful message or make a call.`;
  } else {
    return `Time to reconnect! Reach out today with something specific about them.`;
  }
}
