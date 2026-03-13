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
  // Attribution signals from RC subscriber_attributes
  email?: string;
  fbc?: string;   // Facebook Click ID (from $fbClickId) — NOT hashed
  fbp?: string;   // Facebook Browser/Anon ID (from $fbAnonId) — NOT hashed
  madid?: string; // Mobile Advertiser ID / IDFA (from $idfa/$madid) — NOT hashed
  phone?: string; // E.164 phone number (from $phoneNumber) — hashed before sending
}

export interface AnalyticsEmitter {
  emit(event: NormalizedRcEvent): Promise<void>;
}
