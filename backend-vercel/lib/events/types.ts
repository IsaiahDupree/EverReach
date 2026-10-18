/**
 * Unified Events Tracking System - TypeScript Types
 * 
 * Types for the events tracking system that ingests events from all platforms.
 */

export type EventSource = 
  | 'app'
  | 'superwall'
  | 'revenuecat'
  | 'stripe'
  | 'apple'
  | 'google'
  | 'facebook_ads'
  | 'system';

export type EventCategory =
  | 'ui'
  | 'paywall'
  | 'billing'
  | 'lifecycle'
  | 'ads'
  | 'error'
  | 'internal';

export type Platform = 'ios' | 'android' | 'web' | 'server';

export type Store = 'app_store' | 'play_store' | 'stripe';

/**
 * Incoming event from any source
 */
export interface IngestEvent {
  // Idempotency
  idempotencyKey?: string;

  // Classification
  source: EventSource;
  category: EventCategory;
  name: string;

  // Timing
  occurredAt?: string;  // ISO 8601

  // User context
  userId?: string;      // auth.users.id
  appUserId?: string;   // RevenueCat app_user_id
  anonId?: string;      // Device UUID
  sessionId?: string;   // Session UUID

  // Device
  platform?: Platform;
  device?: string;      // Model or User-Agent

  // Attribution
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };

  // Billing
  billing?: {
    productId?: string;
    entitlementId?: string;
    store?: Store;
    currency?: string;
    amountCents?: number;
  };

  // Ads
  ads?: {
    campaignId?: string;
    adsetId?: string;
    adId?: string;
  };

  // Meta
  externalRef?: string;
  payload?: Record<string, any>;
}

/**
 * Batch request to ingest API
 */
export interface IngestRequest {
  events: IngestEvent[];
}

/**
 * Response from ingest API
 */
export interface IngestResponse {
  ok: boolean;
  ingested?: number;
  error?: string;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Event stored in database
 */
export interface StoredEvent {
  id: string;
  idempotency_key: string | null;
  source: EventSource;
  category: EventCategory;
  name: string;
  occurred_at: string;
  received_at: string;
  user_id: string | null;
  app_user_id: string | null;
  anon_id: string | null;
  session_id: string | null;
  platform: string | null;
  device: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  product_id: string | null;
  entitlement_id: string | null;
  store: string | null;
  revenue_amount_cents: number | null;
  currency: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  external_ref: string | null;
  payload: Record<string, any>;
  created_by: string;
}

/**
 * Event taxonomy - canonical event names
 */
export const EventNames = {
  // Lifecycle
  APP_OPENED: 'app_opened',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  FIRST_ONBOARDING_COMPLETED: 'first_onboarding_completed',
  SECOND_ONBOARDING_SHOWN: 'second_onboarding_shown',
  SECOND_ONBOARDING_COMPLETED: 'second_onboarding_completed',

  // Paywall
  PAYWALL_OPENED: 'paywall_opened',
  PAYWALL_CLOSED: 'paywall_closed',
  PURCHASE_STARTED: 'purchase_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',

  // Billing (webhooks)
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  RENEWAL: 'renewal',
  CANCELLATION: 'cancellation',
  BILLING_ISSUE: 'billing_issue',
  EXPIRED: 'expired',

  // Trial UX
  TRIAL_BANNER_VIEWED: 'trial_banner_viewed',
  TRIAL_CTA_CLICKED: 'trial_cta_clicked',

  // Ads
  AD_IMPRESSIONS: 'ad_impressions',
  AD_CLICKS: 'ad_clicks',
  AD_SPEND: 'ad_spend',
  AD_PURCHASE_ATTRIBUTED: 'ad_purchase_attributed',

  // AI Features
  MESSAGE_COPIED: 'message_copied',
  MESSAGE_LIKED: 'message_liked',
  MESSAGE_DISLIKED: 'message_disliked',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

/**
 * Event validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}
