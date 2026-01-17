/**
 * Comprehensive Paywall Analytics Hook
 * 
 * Mirrors Superwall's event lifecycle and integrates with PostHog.
 * Privacy-safe tracking that works even if ATT is denied.
 * 
 * Core Metrics Tracked:
 * - Impression → purchase funnel
 * - CTR to checkout (purchase_started / paywall_presented)
 * - Conversion rate (purchase_succeeded / paywall_presented)
 * - ARPI (Average Revenue Per Impression)
 * - Time to decision (median visible_duration_ms)
 * - Plan mix (selection share by product/price/trial)
 * - Placement lift (conversion by placement & variant)
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useTracking } from '@/providers/TrackingProvider';
import { usePaywallEvents, PaywallInfo, PaywallResult, PaywallSkippedReason, SubscriptionStatus } from './usePaywallEvents';

// Product/SKU types
export interface ProductInfo {
  id: string;
  price: number;
  currency: string;
  trialLength?: number; // days
  introOfferType?: 'free_trial' | 'pay_as_you_go' | 'pay_up_front';
  period?: 'month' | 'year' | 'lifetime';
}

// Paywall analytics configuration
export interface PaywallAnalyticsConfig {
  // Identity
  paywallId: string;
  variant?: string;
  experimentKey?: string;
  
  // Context
  placement: string; // e.g., 'onboarding_step_3', 'settings_upgrade_btn'
  sourceScreen: string;
  
  // Products
  products: ProductInfo[];
  
  // Optional metadata
  metadata?: Record<string, any>;
}

// Metrics
interface PaywallMetrics {
  timeToFirstPaintMs?: number;
  renderLatencyMs?: number;
  visibleDurationMs?: number;
  scrollDepth?: number;
}

/**
 * usePaywallAnalytics Hook
 * 
 * Comprehensive paywall event tracking integrated with PostHog.
 * Automatically tracks lifecycle, interactions, and commerce events.
 * 
 * @example
 * ```tsx
 * usePaywallAnalytics({
 *   paywallId: 'v3_primary',
 *   variant: 'B',
 *   experimentKey: 'paywall_copy_test',
 *   placement: 'onboarding_step_3',
 *   sourceScreen: 'welcome',
 *   products: [
 *     { id: 'pro_monthly', price: 15, currency: 'USD', trialLength: 7, introOfferType: 'free_trial' }
 *   ]
 * });
 * ```
 */
export function usePaywallAnalytics(config: PaywallAnalyticsConfig) {
  const { track, consent } = useTracking();
  
  // Generate unique instance ID per paywall show
  const instanceIdRef = useRef<string>();
  const presentTimestampRef = useRef<number>();
  const firstPaintTimestampRef = useRef<number>();
  
  // Initialize instance ID
  useEffect(() => {
    instanceIdRef.current = uuidv4();
  }, []);
  
  /**
   * Base properties included with every paywall event
   */
  const getBaseProperties = useCallback(() => {
    return {
      // Identity
      paywall_instance_id: instanceIdRef.current,
      paywall_id: config.paywallId,
      variant: config.variant || 'default',
      experiment_key: config.experimentKey || null,
      
      // Context
      placement: config.placement,
      source_screen: config.sourceScreen,
      
      // Products
      products: config.products.map(p => ({
        id: p.id,
        price: p.price,
        currency: p.currency,
        trial_len: p.trialLength,
        intro_offer_type: p.introOfferType,
        period: p.period,
      })),
      
      // Device/session
      platform: Platform.OS,
      app_version: config.metadata?.appVersion || null,
      locale: config.metadata?.locale || null,
      storefront: config.metadata?.storefront || null,
      att_status: config.metadata?.attStatus || 'n/a',
      analytics_consent: !!consent?.analytics,
      
      // Custom metadata
      ...config.metadata,
    };
  }, [config, consent]);
  
  /**
   * Track paywall lifecycle and interaction events
   */
  usePaywallEvents({
    // Lifecycle: Will Present
    willPresentPaywall: useCallback((info: PaywallInfo) => {
      if (!consent?.analytics) return;
      
      presentTimestampRef.current = Date.now();
      
      track('paywall_will_present', {
        ...getBaseProperties(),
        name: info.name,
      });
    }, [track, consent, getBaseProperties]),
    
    // Lifecycle: Did Present
    didPresentPaywall: useCallback((info: PaywallInfo) => {
      if (!consent?.analytics) return;
      
      firstPaintTimestampRef.current = Date.now();
      const timeToFirstPaint = presentTimestampRef.current 
        ? firstPaintTimestampRef.current - presentTimestampRef.current 
        : undefined;
      
      track('paywall_presented', {
        ...getBaseProperties(),
        name: info.name,
        time_to_first_paint_ms: timeToFirstPaint,
      });
    }, [track, consent, getBaseProperties]),
    
    // Lifecycle: Dismissed
    didDismissPaywall: useCallback((info: PaywallInfo, result?: PaywallResult) => {
      if (!consent?.analytics) return;
      
      const visibleDuration = firstPaintTimestampRef.current 
        ? Date.now() - firstPaintTimestampRef.current 
        : undefined;
      
      track('paywall_dismissed', {
        ...getBaseProperties(),
        name: info.name,
        result: result?.type || 'closed',
        visible_duration_ms: visibleDuration,
        error: result?.error || null,
      });
      
      // Reset timers
      presentTimestampRef.current = undefined;
      firstPaintTimestampRef.current = undefined;
    }, [track, consent, getBaseProperties]),
    
    // Lifecycle: Skipped
    onPaywallSkip: useCallback((reason: PaywallSkippedReason) => {
      if (!consent?.analytics) return;
      
      track('paywall_skipped', {
        ...getBaseProperties(),
        reason: reason.reason,
        message: reason.message,
      });
    }, [track, consent, getBaseProperties]),
    
    // Lifecycle: Error
    onPaywallError: useCallback((error: string) => {
      if (!consent?.analytics) return;
      
      track('paywall_error', {
        ...getBaseProperties(),
        error,
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: CTA Tapped
    onCustomPaywallAction: useCallback((name: string) => {
      if (!consent?.analytics) return;
      
      track('paywall_cta_tapped', {
        ...getBaseProperties(),
        cta: name,
        cta_id: name,
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: Link Opened
    onPaywallWillOpenURL: useCallback((url: string) => {
      if (!consent?.analytics) return;
      
      track('paywall_link_opened', {
        ...getBaseProperties(),
        url,
        link_type: 'url',
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: Deep Link
    onPaywallWillOpenDeepLink: useCallback((url: string) => {
      if (!consent?.analytics) return;
      
      track('paywall_link_opened', {
        ...getBaseProperties(),
        url,
        link_type: 'deep_link',
      });
    }, [track, consent, getBaseProperties]),
    
    // State: Subscription Status Change
    onSubscriptionStatusChange: useCallback((status: SubscriptionStatus) => {
      if (!consent?.analytics) return;
      
      track('subscription_status_change', {
        status: status.status,
        tier: status.tier,
        trial_ends_at: status.trialEndsAt,
        current_period_end: status.currentPeriodEnd,
      });
    }, [track, consent]),
  });
  
  /**
   * Manual event tracking methods
   */
  return {
    // Commerce: Purchase Started
    trackPurchaseStarted: useCallback((productId: string) => {
      if (!consent?.analytics) return;
      
      const product = config.products.find(p => p.id === productId);
      
      track('purchase_started', {
        ...getBaseProperties(),
        product_id: productId,
        price: product?.price,
        currency: product?.currency,
        trial_length: product?.trialLength,
      });
    }, [track, consent, config.products, getBaseProperties]),
    
    // Commerce: Purchase Succeeded (local - server confirmation required)
    trackPurchaseSucceeded: useCallback((productId: string, transactionId?: string) => {
      if (!consent?.analytics) return;
      
      const product = config.products.find(p => p.id === productId);
      
      track('purchase_succeeded', {
        ...getBaseProperties(),
        product_id: productId,
        price: product?.price,
        currency: product?.currency,
        trial_length: product?.trialLength,
        transaction_id: transactionId,
        source: 'client', // Mark as client-side (needs server confirmation)
      });
    }, [track, consent, config.products, getBaseProperties]),
    
    // Commerce: Trial Started
    trackTrialStarted: useCallback((productId: string, trialLength: number) => {
      if (!consent?.analytics) return;
      
      track('trial_started', {
        ...getBaseProperties(),
        product_id: productId,
        trial_length: trialLength,
      });
    }, [track, consent, getBaseProperties]),
    
    // Commerce: Purchase Failed
    trackPurchaseFailed: useCallback((productId: string, error: string) => {
      if (!consent?.analytics) return;
      
      track('purchase_failed', {
        ...getBaseProperties(),
        product_id: productId,
        error,
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: Price Tile Selected
    trackPriceTileSelected: useCallback((productId: string) => {
      if (!consent?.analytics) return;
      
      const product = config.products.find(p => p.id === productId);
      
      track('paywall_price_tile_selected', {
        ...getBaseProperties(),
        product_id: productId,
        price: product?.price,
        currency: product?.currency,
      });
    }, [track, consent, config.products, getBaseProperties]),
    
    // Interactions: Restore Tapped
    trackRestoreTapped: useCallback(() => {
      if (!consent?.analytics) return;
      
      track('paywall_restore_tapped', {
        ...getBaseProperties(),
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: Terms/Privacy Tapped
    trackLegalLinkTapped: useCallback((type: 'terms' | 'privacy') => {
      if (!consent?.analytics) return;
      
      track(`paywall_${type}_tapped`, {
        ...getBaseProperties(),
      });
    }, [track, consent, getBaseProperties]),
    
    // Interactions: FAQ Opened
    trackFAQOpened: useCallback((question: string) => {
      if (!consent?.analytics) return;
      
      track('paywall_faq_opened', {
        ...getBaseProperties(),
        question,
      });
    }, [track, consent, getBaseProperties]),
    
    // Performance: Scroll Depth
    trackScrollDepth: useCallback((depth: number) => {
      if (!consent?.analytics) return;
      
      track('paywall_scroll_depth', {
        ...getBaseProperties(),
        scroll_depth: depth,
      });
    }, [track, consent, getBaseProperties]),
  };
}

/**
 * Server-side revenue confirmation helper
 * 
 * This should be called from your backend when you receive
 * App Store Server Notifications v2 or RevenueCat webhooks.
 * 
 * Events to track:
 * - INITIAL_BUY → revenue_confirmed
 * - DID_RENEW → subscription_renewed
 * - DID_FAIL_TO_RENEW → subscription_renewal_failed
 * - REFUND → refund_issued
 * - CANCEL → subscription_canceled
 */
export interface ServerRevenueEvent {
  eventType: 'INITIAL_BUY' | 'DID_RENEW' | 'DID_FAIL_TO_RENEW' | 'REFUND' | 'CANCEL';
  userId: string;
  productId: string;
  price: number;
  currency: string;
  transactionId: string;
  originalTransactionId?: string;
  expirationDate?: string;
  metadata?: Record<string, any>;
}

/**
 * Track server-confirmed revenue events
 * (Call this from your backend webhook handler)
 */
export function trackServerRevenueEvent(event: ServerRevenueEvent) {
  const eventMap = {
    INITIAL_BUY: 'revenue_confirmed',
    DID_RENEW: 'subscription_renewed',
    DID_FAIL_TO_RENEW: 'subscription_renewal_failed',
    REFUND: 'refund_issued',
    CANCEL: 'subscription_canceled',
  };
  
  return {
    event: eventMap[event.eventType],
    properties: {
      user_id: event.userId,
      product_id: event.productId,
      price: event.price,
      currency: event.currency,
      transaction_id: event.transactionId,
      original_transaction_id: event.originalTransactionId,
      expiration_date: event.expirationDate,
      source: 'server', // Server-confirmed truth
      ...event.metadata,
    },
  };
}
