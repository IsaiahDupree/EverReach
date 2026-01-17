export type RcEventKind =
  | 'trial_started'
  | 'trial_converted'
  | 'initial_purchase'
  | 'renewal'
  | 'cancellation'
  | 'uncancellation'
  | 'expiration'
  | 'refund'
  | 'billing_issue'
  | 'product_change'
  | 'non_subscription_purchase';

export interface NormalizedRcEvent {
  kind: RcEventKind;
  event_id: string; // idempotency key
  user_id: string;
  product_id?: string;
  entitlements?: string[];
  environment: 'SANDBOX' | 'PRODUCTION';
  platform: 'app_store' | 'play' | 'other';
  period_type?: 'TRIAL' | 'NORMAL' | 'INTRO';
  status?: 'trial' | 'active' | 'canceled' | 'expired' | 'refunded';
  value?: number; // optional monetary value
  currency?: string; // ISO currency, if available
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  country_code?: string | null;
}

export interface AnalyticsEmitter {
  emit(event: NormalizedRcEvent): Promise<void>;
}
