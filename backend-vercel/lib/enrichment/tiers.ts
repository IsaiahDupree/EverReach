// lib/enrichment/tiers.ts
// Tier configurations with the 80% rule

export interface TierConfig {
  rps: number;              // Requests per second
  rpm: number;              // Requests per minute
  maxTokens?: number;       // Perplexity token cap (optional for API-only tiers)
  maxSearches?: number;     // Perplexity search cap (optional for API-only tiers)
  weight: number;           // Queue priority weight
  includedMonthly: number;  // Included enrichments per month
  overagePrice: number;     // Price per enrichment over limit (USD)
}

export const TIERS: Record<string, TierConfig> = {
  // Bundled in EverReach CRM
  core: {
    rps: 0.5,
    rpm: 30,
    maxTokens: 1500,
    maxSearches: 2,
    weight: 1,
    includedMonthly: 250,
    overagePrice: 0.12
  },
  pro: {
    rps: 1.0,
    rpm: 90,
    maxTokens: 2500,
    maxSearches: 4,
    weight: 2,
    includedMonthly: 2500,
    overagePrice: 0.08
  },
  elite: {
    rps: 3.0,
    rpm: 200,
    maxTokens: 3500,
    maxSearches: 6,
    weight: 3,
    includedMonthly: 12000,
    overagePrice: 0.05
  },
  
  // Standalone API tiers
  starter: {
    rps: 1.0,
    rpm: 60,
    weight: 1,
    includedMonthly: 1000,
    overagePrice: 0.09
  },
  growth: {
    rps: 2.0,
    rpm: 120,
    weight: 2,
    includedMonthly: 5000,
    overagePrice: 0.06
  },
  scale: {
    rps: 5.0,
    rpm: 300,
    weight: 3,
    includedMonthly: 20000,
    overagePrice: 0.04
  }
};

/**
 * The 80% Rule: Always configure at 80% of API limit
 * to prevent hitting the ceiling and getting rate-limited.
 * 
 * Example:
 * - PRO tier (5 req/sec) → Configure for 4 req/sec (80%)
 * - ULTRA tier (10 req/sec) → Configure for 8 req/sec (80%)
 * - MEGA tier (20 req/sec) → Configure for 16 req/sec (80%)
 */
export function upstreamToConfigured(upstreamRps: number): number {
  return upstreamRps * 0.8;
}

/**
 * Get tier configuration with fallback to 'core'
 */
export function getTierConfig(tier: string): TierConfig {
  return TIERS[tier] || TIERS.core;
}

/**
 * Check if tier exists
 */
export function isValidTier(tier: string): boolean {
  return tier in TIERS;
}

/**
 * Get all available tiers
 */
export function getAllTiers(): string[] {
  return Object.keys(TIERS);
}

/**
 * Get bundled tiers (included in CRM)
 */
export function getBundledTiers(): string[] {
  return ['core', 'pro', 'elite'];
}

/**
 * Get standalone API tiers
 */
export function getStandaloneTiers(): string[] {
  return ['starter', 'growth', 'scale'];
}

/**
 * Calculate monthly cost estimate for a workspace
 */
export function calculateMonthlyCost(
  tier: string,
  unitsUsed: number
): {
  included: number;
  overage: number;
  overageCost: number;
  totalCost: number;
} {
  const config = getTierConfig(tier);
  const overage = Math.max(0, unitsUsed - config.includedMonthly);
  const overageCost = overage * config.overagePrice;

  return {
    included: Math.min(unitsUsed, config.includedMonthly),
    overage,
    overageCost,
    totalCost: overageCost
  };
}

/**
 * Get tier by monthly usage (for upsell recommendations)
 */
export function recommendTier(monthlyUsage: number): {
  recommended: string;
  reason: string;
} {
  if (monthlyUsage <= 250) {
    return { recommended: 'core', reason: 'Within Core tier limits' };
  } else if (monthlyUsage <= 2500) {
    return { recommended: 'pro', reason: 'Within Pro tier limits' };
  } else if (monthlyUsage <= 12000) {
    return { recommended: 'elite', reason: 'Within Elite tier limits' };
  } else if (monthlyUsage <= 20000) {
    return { recommended: 'scale', reason: 'High volume - consider Scale API' };
  } else {
    return { recommended: 'enterprise', reason: 'Enterprise volume - contact sales' };
  }
}
