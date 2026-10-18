/**
 * Subscription Types
 *
 * Type definitions for subscription-related functionality
 */

/**
 * Subscription tier options
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Subscription status options
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
}

/**
 * Subscription database entity
 */
export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription status response
 */
export interface SubscriptionStatusResponse {
  subscription: {
    id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Subscription tier configuration
 */
export interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: {
    [key: string]: number | boolean;
  };
}

/**
 * Subscription tiers response
 */
export interface SubscriptionTiersResponse {
  tiers: SubscriptionTierConfig[];
}

/**
 * Billing period options
 */
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Checkout session request body
 */
export interface CheckoutSessionRequest {
  tier: SubscriptionTier;
  billing_period?: BillingPeriod;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  url: string;
  session_id: string;
}

/**
 * Billing portal session response
 */
export interface BillingPortalResponse {
  url: string;
}
