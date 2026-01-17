/**
 * Subscription Types
 * Based on backend /api/v1/billing/subscription response
 */

export type SubscriptionPlan = 'free' | 'pro' | 'team';

export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'paused' | 'canceled';

export type BillingPeriod = 'monthly' | 'yearly' | null;

export interface SubscriptionLimits {
  contacts: number;
  ai_messages: number;
  screenshots: number;
  team_members: number;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  name: string;
  price: number;
  billing_period: BillingPeriod;
  features: string[];
  limits: SubscriptionLimits;
}

export interface SubscriptionResponse {
  subscription: Subscription;
  next_billing_date: string | null;
  can_upgrade: boolean;
  can_manage: boolean;
}

export interface CheckoutParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  url: string;
}

export interface BillingPortalResponse {
  url: string;
}

export type CancelScope = 'primary' | 'provider:stripe' | 'provider:app_store' | 'provider:play';
export type CancelWhen = 'period_end' | 'now';

export interface CancelSubscriptionParams {
  scope?: CancelScope;
  when?: CancelWhen;
  reason?: string;
}

export type CancelMethod = 'server' | 'store';

export interface CancelSubscriptionResponse {
  cancel_method: CancelMethod;
  status?: 'scheduled' | 'canceled' | 'pending_user_action';
  manage_url?: string;
  access_until?: string;
  instructions?: string;
}

export interface LinkAppleReceiptParams {
  receipt: string; // base64
}

export interface LinkGooglePurchaseParams {
  purchase_token: string;
  package_name: string;
  product_id: string;
}

export interface LinkStoreResponse {
  entitlements: any;
  subscription?: Subscription;
}
