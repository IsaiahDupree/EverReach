/**
 * Superwall Events Tracker
 * 
 * Comprehensive tracking of all Superwall events and mapping them to our analytics system.
 * This component should be placed at the root level (in _layout.tsx) to capture all events.
 */

import React, { useEffect } from 'react';
import { useSuperwallEvents } from 'expo-superwall';
import analytics from '@/lib/analytics';
import type { 
  PaywallInfo, 
  PaywallResult, 
  PaywallSkippedReason, 
  SubscriptionStatus,
  SuperwallEventInfo,
  RedemptionResult
} from 'expo-superwall';

/**
 * All Superwall Events that can be tracked:
 * 
 * PAYWALL LIFECYCLE EVENTS:
 * - willPresentPaywall: Just before paywall shows
 * - onPaywallPresent: Paywall has been presented
 * - didPresentPaywall: After paywall presentation is complete
 * - willDismissPaywall: Just before paywall dismisses
 * - onPaywallDismiss: Paywall has been dismissed (with result)
 * - didDismissPaywall: After paywall dismissal is complete
 * - onPaywallSkip: Paywall was skipped (with reason)
 * - onPaywallError: Error occurred during paywall operation
 * 
 * PAYWALL INTERACTION EVENTS:
 * - onPaywallWillOpenURL: Paywall will open a URL
 * - onPaywallWillOpenDeepLink: Paywall will open a deep link
 * - onCustomPaywallAction: Custom action triggered from paywall
 * 
 * PURCHASE EVENTS:
 * - onPurchase: Purchase initiated
 * - onPurchaseRestore: Purchase restoration initiated
 * 
 * PROMO/REDEMPTION EVENTS:
 * - willRedeemLink: Before redeeming promotional link
 * - didRedeemLink: After redeeming promotional link
 * 
 * SUBSCRIPTION EVENTS:
 * - onSubscriptionStatusChange: Subscription status changed
 * 
 * ANALYTICS EVENTS:
 * - onSuperwallEvent: All Superwall internal events (detailed analytics)
 * 
 * DEBUG EVENTS:
 * - onLog: SDK logging (debug, info, warn, error)
 */

export default function SuperwallEventsTracker() {
  useSuperwallEvents({
    // ============================================
    // PAYWALL LIFECYCLE EVENTS
    // ============================================
    
    willPresentPaywall: (paywallInfo: PaywallInfo) => {
      console.log('[SuperwallEvents] 🎬 Will Present Paywall:', paywallInfo.name);
      analytics.track('superwall_will_present_paywall', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
        placement: paywallInfo.presentedBy,
        experiment_id: paywallInfo.experiment?.id,
        variant_id: paywallInfo.experiment?.variant?.id,
        products: paywallInfo.productIds,
      });
    },

    onPaywallPresent: (paywallInfo: PaywallInfo) => {
      console.log('[SuperwallEvents] ✅ Paywall Presented:', paywallInfo.name);
      analytics.track('superwall_paywall_presented', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
        placement: paywallInfo.presentedBy,
        presented_by_event: paywallInfo.presentedByEventWithName,
        experiment_id: paywallInfo.experiment?.id,
        variant_id: paywallInfo.experiment?.variant?.id,
        products: paywallInfo.productIds,
        free_trial_available: paywallInfo.isFreeTrialAvailable,
        feature_gating: paywallInfo.featureGatingBehavior,
        load_duration: paywallInfo.webViewLoadDuration,
      });
    },

    didPresentPaywall: (paywallInfo: PaywallInfo) => {
      console.log('[SuperwallEvents] 🎯 Did Present Paywall:', paywallInfo.name);
      analytics.track('superwall_did_present_paywall', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
      });
    },

    willDismissPaywall: (paywallInfo: PaywallInfo) => {
      console.log('[SuperwallEvents] 🚪 Will Dismiss Paywall:', paywallInfo.name);
      analytics.track('superwall_will_dismiss_paywall', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
      });
    },

    onPaywallDismiss: (paywallInfo: PaywallInfo, result: PaywallResult) => {
      console.log('[SuperwallEvents] 🚪 Paywall Dismissed:', paywallInfo.name);
      console.log('[SuperwallEvents] Result:', result.type);
      
      analytics.track('superwall_paywall_dismissed', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
        result_type: result.type, // 'purchased', 'restored', 'declined', 'closed'
        close_reason: paywallInfo.closeReason,
        placement: paywallInfo.presentedBy,
        experiment_id: paywallInfo.experiment?.id,
        variant_id: paywallInfo.experiment?.variant?.id,
      });

      // Track specific outcomes
      if (result.type === 'purchased') {
        analytics.track('superwall_purchase_completed', {
          paywall_id: paywallInfo.identifier,
          paywall_name: paywallInfo.name,
          experiment_id: paywallInfo.experiment?.id,
          variant_id: paywallInfo.experiment?.variant?.id,
        });
      } else if (result.type === 'restored') {
        analytics.track('superwall_restore_completed', {
          paywall_id: paywallInfo.identifier,
          paywall_name: paywallInfo.name,
        });
      } else if (result.type === 'declined') {
        analytics.track('superwall_paywall_declined', {
          paywall_id: paywallInfo.identifier,
          paywall_name: paywallInfo.name,
          experiment_id: paywallInfo.experiment?.id,
          variant_id: paywallInfo.experiment?.variant?.id,
        });
      }
    },

    didDismissPaywall: (paywallInfo: PaywallInfo) => {
      console.log('[SuperwallEvents] ✅ Did Dismiss Paywall:', paywallInfo.name);
      analytics.track('superwall_did_dismiss_paywall', {
        paywall_id: paywallInfo.identifier,
        paywall_name: paywallInfo.name,
      });
    },

    onPaywallSkip: (reason: PaywallSkippedReason) => {
      console.log('[SuperwallEvents] ⏭️ Paywall Skipped:', reason.type);
      analytics.track('superwall_paywall_skipped', {
        reason_type: reason.type,
        experiment_id: 'experiment' in reason ? reason.experiment?.id : undefined,
      });
    },

    onPaywallError: (error: string) => {
      console.error('[SuperwallEvents] ❌ Paywall Error:', error);
      analytics.track('superwall_paywall_error', {
        error_message: error,
        severity: 'error',
      });
    },

    // ============================================
    // PAYWALL INTERACTION EVENTS
    // ============================================

    onPaywallWillOpenURL: (url: string) => {
      console.log('[SuperwallEvents] 🔗 Will Open URL:', url);
      analytics.track('superwall_will_open_url', {
        url,
      });
    },

    onPaywallWillOpenDeepLink: (url: string) => {
      console.log('[SuperwallEvents] 🔗 Will Open Deep Link:', url);
      analytics.track('superwall_will_open_deep_link', {
        url,
      });
    },

    onCustomPaywallAction: (name: string) => {
      console.log('[SuperwallEvents] 🎬 Custom Paywall Action:', name);
      analytics.track('superwall_custom_action', {
        action_name: name,
      });
    },

    // ============================================
    // PURCHASE EVENTS
    // ============================================

    onPurchase: (params: any) => {
      console.log('[SuperwallEvents] 💳 Purchase Initiated:', params);
      analytics.track('superwall_purchase_initiated', {
        product_id: params.productId,
        platform: params.platform,
        base_plan_id: params.basePlanId, // Android
        offer_id: params.offerId, // Android
      });
    },

    onPurchaseRestore: () => {
      console.log('[SuperwallEvents] 🔄 Purchase Restore Initiated');
      analytics.track('superwall_restore_initiated', {});
    },

    // ============================================
    // PROMO/REDEMPTION EVENTS
    // ============================================

    willRedeemLink: () => {
      console.log('[SuperwallEvents] 🎁 Will Redeem Promotional Link');
      analytics.track('superwall_will_redeem_link', {});
    },

    didRedeemLink: (result: RedemptionResult) => {
      console.log('[SuperwallEvents] 🎁 Did Redeem Link:', result);
      analytics.track('superwall_did_redeem_link', {
        status: result.status,
        code: result.code,
        redemption_info: 'redemptionInfo' in result ? result.redemptionInfo : undefined,
        error: 'error' in result ? (result as any).error : undefined,
      });
    },

    // ============================================
    // SUBSCRIPTION EVENTS
    // ============================================

    onSubscriptionStatusChange: (status: SubscriptionStatus) => {
      console.log('[SuperwallEvents] 📊 Subscription Status Changed:', status);
      analytics.track('superwall_subscription_status_changed', {
        new_status: status,
      });
    },

    // ============================================
    // ANALYTICS EVENTS (All Superwall Events)
    // ============================================

    onSuperwallEvent: (eventInfo: SuperwallEventInfo) => {
      // This captures ALL Superwall internal events for deep analytics
      console.log('[SuperwallEvents] 📊 Superwall Event:', eventInfo.event, eventInfo.params);
      
      // Track to backend for detailed analytics
      analytics.track('superwall_internal_event', {
        event_name: eventInfo.event,
        params: eventInfo.params,
      });
    },

    // ============================================
    // DEBUG EVENTS
    // ============================================

    onLog: (params) => {
      // Only log errors and warnings to avoid spam
      if (params.level === 'error' || params.level === 'warn') {
        console.log(`[SuperwallEvents] [${params.level}] [${params.scope}]`, params.message, params.info, params.error);
        
        if (params.level === 'error') {
          analytics.track('superwall_sdk_error', {
            scope: params.scope,
            message: params.message,
            info: params.info,
            error: params.error,
          });
        }
      }
    },
  });

  // This is a tracking component - doesn't render anything
  return null;
}

/**
 * Usage in _layout.tsx:
 * 
 * import SuperwallEventsTracker from '@/lib/SuperwallEventsTracker';
 * 
 * export default function RootLayout() {
 *   return (
 *     <SuperwallProvider apiKey="...">
 *       <SuperwallEventsTracker />
 *       {children}
 *     </SuperwallProvider>
 *   );
 * }
 */
