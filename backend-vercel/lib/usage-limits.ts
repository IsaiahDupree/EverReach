/**
 * Usage Limits & Tier Management
 * 
 * Manages subscription tiers and enforces usage limits for AI features:
 * - Screenshot analysis
 * - Voice note processing
 * - Chat messages
 * - Compose generations
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'core' | 'pro' | 'enterprise';

export type UsageLimits = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  screenshot_count: number; // actual column name
  screenshots_limit: number;
  screenshots_used?: number; // alias for screenshot_count
  compose_runs_used: number;
  compose_runs_limit: number;
  compose_generations_used?: number; // alias for compose_runs_used
  compose_generations_limit?: number; // alias for compose_runs_limit
  voice_minutes_used: number;
  voice_minutes_limit: number;
  voice_notes_used?: number; // alias for voice_minutes_used
  voice_notes_limit?: number; // alias for voice_minutes_limit
  chat_messages_used?: number; // future
  chat_messages_limit?: number; // future
  created_at: string;
  updated_at: string;
};

export type TierLimits = {
  tier: SubscriptionTier;
  screenshots_per_month: number;
  voice_notes_per_month: number;
  chat_messages_per_month: number;
  compose_generations_per_month: number;
  price_monthly_usd: number;
  description: string;
};

export type UsageCheckResult = {
  allowed: boolean;
  reason?: string;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  resets_at?: string;
  tier?: SubscriptionTier;
};

// ============================================================================
// TIER LIMITS (match database tier_limits_reference)
// ============================================================================

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  core: {
    tier: 'core',
    screenshots_per_month: 100,
    voice_notes_per_month: 30, // 30 minutes/month
    chat_messages_per_month: -1, // unlimited
    compose_generations_per_month: 50, // 50 compose runs/month
    price_monthly_usd: 0,
    description: 'Free tier with 100 screenshots/month, 50 compose runs/month, 30 voice minutes/month',
  },
  pro: {
    tier: 'pro',
    screenshots_per_month: 300,
    voice_notes_per_month: 120, // 120 minutes/month
    chat_messages_per_month: -1, // unlimited
    compose_generations_per_month: 200, // 200 compose runs/month
    price_monthly_usd: 29.99,
    description: 'Pro tier with 300 screenshots/month, 200 compose runs/month, 120 voice minutes/month',
  },
  enterprise: {
    tier: 'enterprise',
    screenshots_per_month: -1, // unlimited
    voice_notes_per_month: -1, // unlimited
    chat_messages_per_month: -1, // unlimited
    compose_generations_per_month: -1, // unlimited
    price_monthly_usd: 99.99,
    description: 'Enterprise tier with unlimited usage',
  },
};

// ============================================================================
// USAGE CHECKING
// ============================================================================

/**
 * Check if user can use screenshot analysis
 */
export async function canUseScreenshots(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  try {
    // Call database function to check
    const { data, error } = await supabase.rpc('can_use_screenshot_analysis', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (!data) {
      // Get current usage for details
      const usage = await getCurrentUsage(supabase, userId);
      const tier = await getUserTier(supabase, userId);

      return {
        allowed: false,
        reason: 'Monthly screenshot limit reached',
        current_usage: usage?.screenshot_count || usage?.screenshots_used || 0,
        limit: usage?.screenshots_limit || TIER_LIMITS.core.screenshots_per_month,
        remaining: 0,
        resets_at: usage?.period_end,
        tier,
      };
    }

    // Get usage details for response
    const usage = await getCurrentUsage(supabase, userId);
    const tier = await getUserTier(supabase, userId);

    const limit = usage?.screenshots_limit || TIER_LIMITS.core.screenshots_per_month;
    const used = usage?.screenshot_count || usage?.screenshots_used || 0;

    return {
      allowed: true,
      current_usage: used,
      limit: limit === -1 ? Infinity : limit,
      remaining: limit === -1 ? Infinity : Math.max(0, limit - used),
      resets_at: usage?.period_end,
      tier,
    };
  } catch (error: any) {
    console.error('Error checking screenshot usage:', error);
    // Fail open - allow usage if check fails
    return {
      allowed: true,
      reason: 'Unable to verify usage limits',
    };
  }
}

/**
 * Increment screenshot usage counter
 */
export async function incrementScreenshotUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageLimits | null> {
  try {
    const { data, error } = await supabase.rpc('increment_screenshot_usage', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data as UsageLimits;
  } catch (error: any) {
    console.error('Error incrementing screenshot usage:', error);
    return null;
  }
}

/**
 * Get current usage period for user
 */
export async function getCurrentUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageLimits | null> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_usage_period', {
      p_user_id: userId,
    });

    if (error) throw error;
    
    // Map database columns to UsageLimits type
    const usage = data as any;
    if (!usage) return null;
    
    return {
      ...usage,
      screenshots_used: usage.screenshot_count || 0,
      compose_generations_used: usage.compose_runs_used || 0,
      compose_generations_limit: usage.compose_runs_limit || -1,
      voice_notes_used: usage.voice_minutes_used || 0,
      voice_notes_limit: usage.voice_minutes_limit || -1,
    } as UsageLimits;
  } catch (error: any) {
    console.error('Error getting current usage:', error);
    return null;
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTier> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return (data?.subscription_tier as SubscriptionTier) || 'core';
  } catch (error: any) {
    console.error('Error getting user tier:', error);
    return 'core'; // Default to core tier
  }
}

/**
 * Get tier limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a limit is unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Format usage for display
 */
export function formatUsage(used: number, limit: number): string {
  if (isUnlimited(limit)) {
    return `${used} / unlimited`;
  }
  return `${used} / ${limit}`;
}

/**
 * Calculate percentage used
 */
export function getUsagePercentage(used: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(100, (used / limit) * 100);
}

// ============================================================================
// FUTURE: Additional usage types
// ============================================================================

/**
 * Check voice transcription limits
 * @param minutes - Estimated minutes of transcription (for checking if limit would be exceeded)
 */
export async function canUseVoiceTranscription(
  supabase: SupabaseClient,
  userId: string,
  minutes: number = 0
): Promise<UsageCheckResult> {
  try {
    // Call database function to check
    const { data, error } = await supabase.rpc('can_use_voice_transcription', {
      p_user_id: userId,
      p_minutes: minutes,
    });

    if (error) throw error;

    // Get current usage for details
    const usage = await getCurrentUsage(supabase, userId);
    const tier = await getUserTier(supabase, userId);
    const voiceUsed = usage?.voice_minutes_used || 0;
    const voiceLimit = usage?.voice_minutes_limit || TIER_LIMITS.core.voice_notes_per_month;

    if (!data) {
      return {
        allowed: false,
        reason: 'Monthly voice transcription limit reached',
        current_usage: voiceUsed,
        limit: voiceLimit === -1 ? Infinity : voiceLimit,
        remaining: 0,
        resets_at: usage?.period_end,
        tier,
      };
    }

    return {
      allowed: true,
      current_usage: voiceUsed,
      limit: voiceLimit === -1 ? Infinity : voiceLimit,
      remaining: voiceLimit === -1 ? Infinity : Math.max(0, voiceLimit - voiceUsed),
      resets_at: usage?.period_end,
      tier,
    };
  } catch (error: any) {
    console.error('Error checking voice transcription usage:', error);
    // Fail open - allow usage if check fails
    return {
      allowed: true,
      reason: 'Unable to verify usage limits',
    };
  }
}

/**
 * Increment voice transcription usage
 * @param minutes - Minutes of transcription to add
 */
export async function incrementVoiceTranscriptionUsage(
  supabase: SupabaseClient,
  userId: string,
  minutes: number
): Promise<UsageLimits | null> {
  try {
    const { data, error } = await supabase.rpc('increment_voice_transcription_usage', {
      p_user_id: userId,
      p_minutes: minutes,
    });

    if (error) throw error;
    return data as UsageLimits;
  } catch (error: any) {
    console.error('Error incrementing voice transcription usage:', error);
    return null;
  }
}

/**
 * Check voice note processing limits (legacy function name - redirects to canUseVoiceTranscription)
 */
export async function canUseVoiceNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  return canUseVoiceTranscription(supabase, userId, 0);
}

/**
 * Check chat message limits (currently unlimited for all tiers)
 */
export async function canUseChatMessages(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  // Currently unlimited for all tiers
  return {
    allowed: true,
    current_usage: 0,
    limit: -1,
    remaining: Infinity,
  };
}

/**
 * Check compose generation limits
 */
export async function canUseCompose(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  try {
    // Call database function to check
    const { data, error } = await supabase.rpc('can_use_compose', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (!data) {
      // Get current usage for details
      const usage = await getCurrentUsage(supabase, userId);
      const tier = await getUserTier(supabase, userId);

      return {
        allowed: false,
        reason: 'Monthly compose limit reached',
        current_usage: usage?.compose_runs_used || usage?.compose_generations_used || 0,
        limit: usage?.compose_runs_limit || usage?.compose_generations_limit || TIER_LIMITS.core.compose_generations_per_month,
        remaining: 0,
        resets_at: usage?.period_end,
        tier,
      };
    }

    // Get usage details for response
    const usage = await getCurrentUsage(supabase, userId);
    const tier = await getUserTier(supabase, userId);

    const limit = usage?.compose_runs_limit || usage?.compose_generations_limit || TIER_LIMITS.core.compose_generations_per_month;
    const used = usage?.compose_runs_used || usage?.compose_generations_used || 0;

    return {
      allowed: true,
      current_usage: used,
      limit: limit === -1 ? Infinity : limit,
      remaining: limit === -1 ? Infinity : Math.max(0, limit - used),
      resets_at: usage?.period_end,
      tier,
    };
  } catch (error: any) {
    console.error('Error checking compose usage:', error);
    // Fail open - allow usage if check fails
    return {
      allowed: true,
      reason: 'Unable to verify usage limits',
    };
  }
}

/**
 * Increment compose usage counter
 */
export async function incrementComposeUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageLimits | null> {
  try {
    const { data, error } = await supabase.rpc('increment_compose_usage', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data as UsageLimits;
  } catch (error: any) {
    console.error('Error incrementing compose usage:', error);
    return null;
  }
}
