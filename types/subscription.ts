/**
 * Subscription Type Definitions
 * Feature: IOS-DATA-003
 *
 * Defines TypeScript types for subscription management and payment features.
 * This includes subscription tiers, status, and RevenueCat-related types.
 *
 * @module types/subscription
 */

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  PREMIUM = 'premium',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIALING = 'trialing',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Subscription provider (payment platform)
 */
export enum SubscriptionProvider {
  REVENUECAT = 'revenuecat',
  STRIPE = 'stripe',
}

/**
 * Subscription entity representing a user's subscription
 */
export interface Subscription {
  /**
   * Unique subscription identifier
   */
  id: string;

  /**
   * Associated user ID
   */
  user_id: string;

  /**
   * Current subscription tier
   */
  tier: SubscriptionTier;

  /**
   * Current subscription status
   */
  status: SubscriptionStatus;

  /**
   * Payment provider (RevenueCat, Stripe, etc.)
   */
  provider?: SubscriptionProvider;

  /**
   * Provider's subscription ID (for reference)
   */
  provider_subscription_id?: string;

  /**
   * Current billing period start date
   */
  current_period_start?: string;

  /**
   * Current billing period end date
   */
  current_period_end?: string;

  /**
   * Timestamp when subscription was created
   */
  created_at: string;

  /**
   * Timestamp when subscription was last updated
   */
  updated_at?: string;
}

/**
 * Subscription tier information for paywall display
 */
export interface SubscriptionTierInfo {
  /**
   * Tier identifier
   */
  tier: SubscriptionTier;

  /**
   * Display name for the tier
   */
  name: string;

  /**
   * Marketing description
   */
  description: string;

  /**
   * Price in local currency (display only)
   */
  price: string;

  /**
   * Billing period (monthly, yearly, etc.)
   */
  period: 'monthly' | 'yearly' | 'lifetime';

  /**
   * List of features included in this tier
   */
  features: string[];

  /**
   * Whether this is the recommended/popular tier
   */
  isPopular?: boolean;

  /**
   * RevenueCat product identifier
   */
  productId?: string;
}

/**
 * Input for creating or updating a subscription
 */
export interface SubscriptionInput {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  provider?: SubscriptionProvider;
  provider_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
}

/**
 * RevenueCat package information
 */
export interface RevenueCatPackage {
  /**
   * Package identifier from RevenueCat
   */
  identifier: string;

  /**
   * Product identifier
   */
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };

  /**
   * Package type (e.g., monthly, annual)
   */
  packageType: string;
}

/**
 * Purchase result from RevenueCat
 */
export interface PurchaseResult {
  /**
   * Whether the purchase was successful
   */
  success: boolean;

  /**
   * Error message if purchase failed
   */
  error?: string;

  /**
   * User's entitlements after purchase
   */
  entitlements?: Record<string, any>;
}
