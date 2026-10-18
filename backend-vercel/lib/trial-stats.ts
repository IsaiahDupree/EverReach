/**
 * Trial Statistics & Entitlement Logic
 * 
 * Single source of truth for:
 * - Trial window calculations
 * - Usage tracking during trial
 * - Entitlement determination
 * - Subscription status
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type EntitlementReason = 'active' | 'trial' | 'grace' | 'none';
export type SubscriptionOrigin = 'stripe' | 'app_store' | 'play' | 'manual';

export interface TrialStats {
  entitled: boolean;
  entitlement_reason: EntitlementReason;
  subscription_date: string | null;
  trial: {
    origin: SubscriptionOrigin | null;
    started_at: string | null;
    ends_at: string | null;
    days_total: number | null;
    days_used: number | null;
    days_left: number | null;
    usage_seconds_total: number;
    usage_seconds_during_trial: number;
  };
  period: {
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    grace_ends_at: string | null;
  };
  activity: {
    first_seen_at: string | null;
    last_active_at: string | null;
    sessions_count: number;
  };
  cancel: {
    allowed: boolean;
    method: 'server' | 'store' | null;
    manage_url: string | null;
    provider: SubscriptionOrigin | null;
  };
}

/**
 * Compute comprehensive trial statistics for a user
 */
export async function computeTrialStats(
  userId: string,
  supabase: SupabaseClient
): Promise<TrialStats> {
  const now = new Date();

  // Fetch subscription and profile data in parallel
  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select(`
        origin,
        trial_started_at,
        trial_ends_at,
        subscribed_at,
        current_period_end,
        cancel_at_period_end,
        status
      `)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('first_seen_at, last_active_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  // Get total usage seconds (all time)
  const { data: totalUsage } = await supabase.rpc('usage_seconds_between', {
    p_user: userId,
    p_from: '1970-01-01T00:00:00Z',
    p_to: now.toISOString(),
  });

  // Get sessions count
  const { data: sessionsCount } = await supabase.rpc('get_total_sessions_count', {
    p_user_id: userId,
  });

  // Calculate usage during trial window
  let trialUsage = 0;
  if (sub?.trial_started_at && sub?.trial_ends_at) {
    const { data: duringTrialUsage } = await supabase.rpc('usage_seconds_between', {
      p_user: userId,
      p_from: sub.trial_started_at,
      p_to: sub.trial_ends_at,
    });
    trialUsage = duringTrialUsage ?? 0;
  }

  // Parse trial dates
  const started = sub?.trial_started_at ? new Date(sub.trial_started_at) : null;
  const ends = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;

  // Calculate trial day metrics
  const daysTotal = started && ends 
    ? Math.ceil((+ends - +started) / 86400000) 
    : null;
  
  const daysUsed = started 
    ? Math.min(daysTotal ?? 0, Math.max(0, Math.ceil((+now - +started) / 86400000))) 
    : null;
  
  const daysLeft = daysTotal !== null && daysUsed !== null 
    ? Math.max(0, daysTotal - daysUsed) 
    : null;

  // Determine entitlement status
  const activePaid = sub?.status === 'active';
  const inTrial = !activePaid && started && ends && now < ends;
  const inGrace = !activePaid && ends && now >= ends && 
    (sub?.current_period_end && now < new Date(sub.current_period_end));

  const reason: EntitlementReason = activePaid 
    ? 'active' 
    : inTrial 
    ? 'trial' 
    : inGrace 
    ? 'grace' 
    : 'none';

  // Determine cancellation info
  const origin = (sub?.origin as SubscriptionOrigin) ?? null;
  const hasActiveSub = sub && (activePaid || inTrial || inGrace);
  const alreadyCanceled = sub?.cancel_at_period_end ?? false;
  
  let cancelMethod: 'server' | 'store' | null = null;
  let manageUrl: string | null = null;
  
  if (origin === 'stripe') {
    cancelMethod = 'server';
    manageUrl = null; // Stripe cancellation happens via API
  } else if (origin === 'app_store') {
    cancelMethod = 'store';
    manageUrl = 'https://apps.apple.com/account/subscriptions';
  } else if (origin === 'play') {
    cancelMethod = 'store';
    manageUrl = 'https://play.google.com/store/account/subscriptions';
  }

  return {
    entitled: activePaid || Boolean(inTrial) || Boolean(inGrace),
    entitlement_reason: reason,
    subscription_date: sub?.subscribed_at ?? null,
    trial: {
      origin,
      started_at: sub?.trial_started_at ?? null,
      ends_at: sub?.trial_ends_at ?? null,
      days_total: daysTotal,
      days_used: daysUsed,
      days_left: daysLeft,
      usage_seconds_total: (totalUsage as number) ?? 0,
      usage_seconds_during_trial: trialUsage,
    },
    period: {
      current_period_end: sub?.current_period_end ?? null,
      cancel_at_period_end: alreadyCanceled,
      grace_ends_at: null, // Can be computed if grace periods are implemented
    },
    activity: {
      first_seen_at: profile?.first_seen_at ?? null,
      last_active_at: profile?.last_active_at ?? null,
      sessions_count: (sessionsCount as number) ?? 0,
    },
    cancel: {
      allowed: Boolean(hasActiveSub && !alreadyCanceled),
      method: cancelMethod,
      manage_url: manageUrl,
      provider: origin,
    },
  };
}

/**
 * Frontend entitlement resolver
 * 
 * Example usage in React:
 * ```ts
 * const gate = resolveEntitlement(stats);
 * return gate.allow ? <App /> : <Paywall stats={stats} />;
 * ```
 */
export interface EntitlementGate {
  allow: boolean;
  showPaywall: boolean;
  banner?: string;
  hardStopAt?: string | null;
}

export function resolveEntitlement(stats: TrialStats): EntitlementGate {
  if (stats.entitled && stats.entitlement_reason === 'active') {
    return { allow: true, showPaywall: false };
  }

  if (stats.entitled && stats.entitlement_reason === 'trial') {
    return {
      allow: true,
      showPaywall: false,
      banner: `Trial: ${stats.trial.days_left} day(s) left`,
      hardStopAt: stats.trial.ends_at,
    };
  }

  if (stats.entitled && stats.entitlement_reason === 'grace') {
    return {
      allow: true,
      showPaywall: true,
      banner: 'Grace period active',
    };
  }

  return { allow: false, showPaywall: true };
}

/**
 * Format usage seconds into human-readable string
 */
export function formatUsageTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate days remaining percentage
 */
export function getTrialProgress(stats: TrialStats): number {
  if (!stats.trial.days_total || !stats.trial.days_used) {
    return 0;
  }
  return Math.min(100, (stats.trial.days_used / stats.trial.days_total) * 100);
}
