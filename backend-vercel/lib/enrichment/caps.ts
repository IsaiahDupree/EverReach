// lib/enrichment/caps.ts
// Hard caps to honor API budgets and tier limits

import { getTierConfig } from './tiers';

/**
 * Cap Perplexity request parameters based on tier
 */
export function capPerplexityRequest(
  tier: string,
  request: {
    maxTokens?: number;
    searchQueries?: number;
    [key: string]: any;
  }
): any {
  const config = getTierConfig(tier);

  // If tier doesn't have maxTokens (standalone API tiers), use default
  const maxTokensLimit = config.maxTokens || 3000;
  const maxSearchesLimit = config.maxSearches || 4;

  return {
    ...request,
    maxTokens: Math.min(
      request.maxTokens || maxTokensLimit,
      maxTokensLimit
    ),
    searchQueries: Math.min(
      request.searchQueries || maxSearchesLimit,
      maxSearchesLimit
    )
  };
}

/**
 * Cap social requests (always 1 per enrichment for now)
 */
export function capSocialRequests(tier: string, count: number = 1): number {
  // Always cap at 1 social lookup per enrichment
  // Can be adjusted based on tier in the future
  return Math.min(count, 1);
}

/**
 * Validate enrichment request against monthly limits
 */
export function validateEnrichmentRequest(
  workspaceId: string,
  tier: string,
  monthlyUsage: number
): { allowed: boolean; reason?: string } {
  const config = getTierConfig(tier);

  // Check if over monthly limit (hard cap at 150% of included)
  const hardLimit = config.includedMonthly * 1.5;
  
  if (monthlyUsage >= hardLimit) {
    return {
      allowed: false,
      reason: `Monthly limit exceeded (${monthlyUsage}/${hardLimit} units). Upgrade tier or wait for next billing cycle.`
    };
  }

  // Warn at 100% (over included amount)
  if (monthlyUsage >= config.includedMonthly) {
    console.warn(
      `[Caps] Workspace ${workspaceId} over included amount: ` +
      `${monthlyUsage}/${config.includedMonthly} (tier: ${tier})`
    );
  }

  return { allowed: true };
}

/**
 * Get remaining enrichments before hitting cap
 */
export function getRemainingEnrichments(
  tier: string,
  monthlyUsage: number
): {
  included: number;
  total: number;
  overageUsed: number;
  percentUsed: number;
} {
  const config = getTierConfig(tier);
  const hardLimit = config.includedMonthly * 1.5;
  const remaining = Math.max(0, hardLimit - monthlyUsage);
  const overageUsed = Math.max(0, monthlyUsage - config.includedMonthly);
  const percentUsed = (monthlyUsage / hardLimit) * 100;

  return {
    included: Math.max(0, config.includedMonthly - monthlyUsage),
    total: remaining,
    overageUsed,
    percentUsed
  };
}

/**
 * Calculate token budget for a request
 */
export function calculateTokenBudget(
  tier: string,
  requestType: 'standard' | 'detailed' | 'minimal' = 'standard'
): {
  maxTokens: number;
  searchQueries: number;
  estimatedCost: number;
} {
  const config = getTierConfig(tier);
  
  let maxTokens: number;
  let searchQueries: number;

  switch (requestType) {
    case 'minimal':
      maxTokens = Math.min(config.maxTokens || 1500, 1500);
      searchQueries = 1;
      break;
    case 'detailed':
      maxTokens = config.maxTokens || 3000;
      searchQueries = config.maxSearches || 4;
      break;
    default: // standard
      maxTokens = Math.min(config.maxTokens || 2500, 2500);
      searchQueries = Math.min(config.maxSearches || 2, 2);
  }

  // Estimate cost: $0.20 per 1K tokens + $0.001 per social request
  const tokenCost = (maxTokens / 1000) * 0.2;
  const socialCost = 0.001;
  const estimatedCost = tokenCost + socialCost;

  return {
    maxTokens,
    searchQueries,
    estimatedCost
  };
}

/**
 * Check if workspace can afford enrichment based on budget
 */
export function canAffordEnrichment(
  tier: string,
  monthlyUsage: number,
  costBudget?: number
): { allowed: boolean; reason?: string; estimatedCost: number } {
  const config = getTierConfig(tier);
  const overageUnits = Math.max(0, monthlyUsage - config.includedMonthly);
  const currentOverageCost = overageUnits * config.overagePrice;
  
  // Estimate cost of one more enrichment
  const estimatedCost = monthlyUsage >= config.includedMonthly 
    ? config.overagePrice 
    : 0;

  // If budget specified, check against it
  if (costBudget !== undefined) {
    const projectedCost = currentOverageCost + estimatedCost;
    
    if (projectedCost > costBudget) {
      return {
        allowed: false,
        reason: `Budget exceeded: $${projectedCost.toFixed(2)} > $${costBudget.toFixed(2)}`,
        estimatedCost
      };
    }
  }

  return { allowed: true, estimatedCost };
}

/**
 * Get usage warning level
 */
export function getUsageWarningLevel(
  tier: string,
  monthlyUsage: number
): {
  level: 'safe' | 'warning' | 'critical' | 'exceeded';
  message: string;
  percentUsed: number;
} {
  const config = getTierConfig(tier);
  const hardLimit = config.includedMonthly * 1.5;
  const percentUsed = (monthlyUsage / hardLimit) * 100;

  if (monthlyUsage >= hardLimit) {
    return {
      level: 'exceeded',
      message: `Monthly limit exceeded! Upgrade your tier or wait for next billing cycle.`,
      percentUsed
    };
  } else if (monthlyUsage >= config.includedMonthly * 1.3) {
    return {
      level: 'critical',
      message: `Critical: ${percentUsed.toFixed(0)}% of monthly limit used. Consider upgrading.`,
      percentUsed
    };
  } else if (monthlyUsage >= config.includedMonthly) {
    return {
      level: 'warning',
      message: `Warning: Over included amount. Overage charges apply ($${config.overagePrice}/enrichment).`,
      percentUsed
    };
  } else if (monthlyUsage >= config.includedMonthly * 0.8) {
    return {
      level: 'warning',
      message: `Warning: ${percentUsed.toFixed(0)}% of included amount used.`,
      percentUsed
    };
  } else {
    return {
      level: 'safe',
      message: `${(config.includedMonthly - monthlyUsage).toLocaleString()} enrichments remaining this month.`,
      percentUsed
    };
  }
}

/**
 * Recommend tier upgrade if needed
 */
export function recommendUpgrade(
  currentTier: string,
  monthlyUsage: number
): {
  shouldUpgrade: boolean;
  recommendedTier?: string;
  reason?: string;
  savings?: number;
} {
  const config = getTierConfig(currentTier);
  const overageUnits = Math.max(0, monthlyUsage - config.includedMonthly);
  const currentOverageCost = overageUnits * config.overagePrice;

  // Only recommend upgrade if overage is significant
  if (currentOverageCost < 20) {
    return { shouldUpgrade: false };
  }

  // Check next tier up
  const tierOrder = ['core', 'pro', 'elite', 'starter', 'growth', 'scale'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return { shouldUpgrade: false };
  }

  const nextTier = tierOrder[currentIndex + 1];
  const nextConfig = getTierConfig(nextTier);

  // Check if usage fits in next tier's included amount
  if (monthlyUsage <= nextConfig.includedMonthly) {
    // Calculate savings (current overage cost vs next tier price difference)
    // This is simplified - actual pricing would need to factor in base tier costs
    return {
      shouldUpgrade: true,
      recommendedTier: nextTier,
      reason: `Your usage (${monthlyUsage} units) fits in ${nextTier} tier (${nextConfig.includedMonthly} included). Eliminate overage charges.`,
      savings: currentOverageCost
    };
  }

  return { shouldUpgrade: false };
}
