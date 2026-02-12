/**
 * Base types for RevenueCat analytics emitters.
 *
 * Each emitter receives a NormalizedRcEvent and forwards it to a destination
 * (PostHog, Meta CAPI, Slack, etc.). Emitters MUST NOT throw — errors are
 * logged and swallowed so one failure doesn't block others.
 */

export type NormalizedRcEventKind =
  | 'trial_started'
  | 'initial_purchase'
  | 'renewal'
  | 'expiration'
  | 'cancellation'
  | 'uncancellation'
  | 'product_change'
  | 'refund'
  | 'billing_issue';

export interface NormalizedRcEvent {
  kind: NormalizedRcEventKind | string;
  event_id: string;
  user_id: string;
  product_id: string;
  entitlements: string[];
  environment: 'SANDBOX' | 'PRODUCTION' | string;
  platform: 'app_store' | 'play';
  period_type: 'TRIAL' | 'NORMAL' | 'INTRO' | string;
  status: string; // legacy status: trial | active | canceled | expired
  purchased_at_ms: number;
  expiration_at_ms: number;
  country_code: string | null;
}

export interface Emitter {
  name: string;
  emit(event: NormalizedRcEvent): Promise<void>;
}
