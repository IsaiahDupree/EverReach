/**
 * Subscription Types & State Discernment
 * 
 * Single source of truth for all subscription states, entitlements,
 * and developer override capabilities.
 */

export type EntitlementKey = 'pro' | 'teams' | 'lifetime';

export type SubscriptionStatus =
  | 'NOT_LOGGED_IN'
  | 'NO_SUBSCRIPTION'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'ACTIVE'
  | 'ACTIVE_CANCELED'   // scheduled to end at current_period_end
  | 'GRACE'             // billing issue grace window
  | 'PAUSED'            // Google Play only
  | 'EXPIRED'
  | 'LIFETIME';

export interface NormalizedSubscription {
  user_id: string;
  entitlements: EntitlementKey[];
  active: boolean;
  status: SubscriptionStatus;         // derived & stored for convenience
  access_reason: 'trial' | 'active' | 'grace' | 'lifetime' | 'expired' | 'none';
  product_id: string | null;
  plan_interval: 'month' | 'year' | 'lifetime' | null;

  trial_eligible: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;

  current_period_end: string | null;
  grace_ends_at: string | null;
  canceled_at: string | null;
  paused_at: string | null;           // Google Play pause
  environment: 'prod' | 'sandbox';
  source: 'revenuecat' | 'apple' | 'google' | 'stripe';
  last_synced_at: string;
}

/** Developer override payload (server-applied, never trusted client-only) */
export type DevSubOverrideMode = 'none' | 'force';

export interface DevSubOverride {
  mode: DevSubOverrideMode;
  status?: SubscriptionStatus;
  entitlements?: EntitlementKey[];
  product_id?: string | null;
  plan_interval?: 'month' | 'year' | 'lifetime' | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  grace_ends_at?: string | null;
  notes?: string; // free text
}

/**
 * Pure function to derive status from raw fields (also used in tests)
 */
export function deriveStatus(n: Omit<NormalizedSubscription, 'status'>): SubscriptionStatus {
  if (!n.user_id) return 'NOT_LOGGED_IN';
  if (n.plan_interval === 'lifetime' || n.entitlements.includes('lifetime')) return 'LIFETIME';
  
  const now = Date.now();
  const inTrial = n.trial_ends_at && Date.parse(n.trial_ends_at) > now;
  const inGrace = n.grace_ends_at && Date.parse(n.grace_ends_at) > now;
  const canceled = !!n.canceled_at && (!n.current_period_end || Date.parse(n.current_period_end) > now);
  
  if (inTrial) return 'TRIAL_ACTIVE';
  if (n.trial_ends_at && Date.parse(n.trial_ends_at) <= now && !n.active) return 'TRIAL_EXPIRED';
  if (inGrace) return 'GRACE';
  if (n.active && canceled) return 'ACTIVE_CANCELED';
  if (n.active) return 'ACTIVE';
  if (n.current_period_end && Date.parse(n.current_period_end) <= now) return 'EXPIRED';
  
  return 'NO_SUBSCRIPTION';
}

/**
 * Merge developer override with base subscription
 * Only applies in non-production environments with dev role
 */
export function mergeOverride(
  base: NormalizedSubscription, 
  dev?: DevSubOverride | null
): NormalizedSubscription {
  if (!dev || dev.mode === 'none') return base;
  
  const merged: NormalizedSubscription = {
    ...base,
    entitlements: dev.entitlements ?? base.entitlements,
    product_id: dev.product_id ?? base.product_id,
    plan_interval: dev.plan_interval ?? base.plan_interval,
    trial_ends_at: dev.trial_ends_at ?? base.trial_ends_at,
    current_period_end: dev.current_period_end ?? base.current_period_end,
    grace_ends_at: dev.grace_ends_at ?? base.grace_ends_at,
    source: base.source,
    environment: base.environment,
    last_synced_at: new Date().toISOString(),
    active: true, // if forcing, treat as active unless status below says otherwise
    status: base.status,
    access_reason: base.access_reason,
    trial_started_at: base.trial_started_at,
    trial_eligible: base.trial_eligible,
    canceled_at: base.canceled_at,
    paused_at: base.paused_at,
    user_id: base.user_id,
  };
  
  // If explicit status provided, recompute active/access_reason accordingly
  if (dev.status) {
    merged.status = dev.status;
    merged.active = ['ACTIVE', 'ACTIVE_CANCELED', 'GRACE', 'LIFETIME', 'TRIAL_ACTIVE'].includes(merged.status);
    merged.access_reason =
      merged.status === 'TRIAL_ACTIVE' ? 'trial' :
      merged.status === 'GRACE' ? 'grace' :
      merged.status === 'LIFETIME' ? 'lifetime' :
      merged.active ? 'active' : 'expired';
  } else {
    merged.status = deriveStatus(merged);
  }
  
  return merged;
}

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  'NOT_LOGGED_IN': 'Not Logged In',
  'NO_SUBSCRIPTION': 'No Subscription',
  'TRIAL_ACTIVE': 'Free Trial Active',
  'TRIAL_EXPIRED': 'Trial Expired',
  'ACTIVE': 'Active Subscription',
  'ACTIVE_CANCELED': 'Active (Scheduled to Cancel)',
  'GRACE': 'Grace Period (Payment Issue)',
  'PAUSED': 'Paused',
  'EXPIRED': 'Expired',
  'LIFETIME': 'Lifetime Access',
};

/**
 * Get days remaining for a given date
 */
export function daysRemaining(dateStr: string | null): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
