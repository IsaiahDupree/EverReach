/**
 * Superwall Delegate - Event Tracking & Analytics
 * 
 * Based on the official Superwall example app delegate pattern.
 * Tracks all Superwall events for debugging, analytics, and monitoring.
 * 
 * Source: https://github.com/superwall/expo-superwall/tree/main/example
 */

import {
  EventType,
  type PaywallInfo,
  type RedemptionResult,
  type SubscriptionStatus,
  SuperwallDelegate,
  type SuperwallEventInfo,
} from "expo-superwall/compat";
import analytics from '@/lib/analytics';

export class AppSuperwallDelegate extends SuperwallDelegate {
  /**
   * Called when subscription status changes
   * Use this to update UI or trigger actions based on subscription state
   */
  subscriptionStatusDidChange(from: SubscriptionStatus, to: SubscriptionStatus): void {
    console.log("📊 [Superwall] Subscription status changed:", { from, to });
    
    // Track in analytics
    analytics.track('superwall_subscription_status_changed', {
      from_status: from,
      to_status: to,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Main event handler - receives all Superwall events
   * Perfect for comprehensive analytics tracking
   */
  handleSuperwallEvent(eventInfo: SuperwallEventInfo) {
    const { event } = eventInfo;
    console.log("🎯 [Superwall Event]", event.type, eventInfo);

    switch (event.type) {
      case EventType.appOpen:
        console.log("📱 [Superwall] App opened");
        analytics.track('superwall_app_open');
        break;

      case EventType.deviceAttributes:
        console.log("📲 [Superwall] Device attributes:", event.deviceAttributes);
        analytics.track('superwall_device_attributes', {
          attributes: event.deviceAttributes,
        });
        break;

      case EventType.paywallOpen: {
        const paywallInfo = event.paywallInfo;
        console.log("💰 [Superwall] Paywall opened:", paywallInfo);

        if (paywallInfo && paywallInfo !== null) {
          console.log(`   → Paywall ID: ${paywallInfo.identifier}`);
          console.log(`   → Products: ${paywallInfo.productIds?.join(', ')}`);
          
          analytics.track('superwall_paywall_opened', {
            paywall_id: paywallInfo.identifier,
            product_ids: paywallInfo.productIds,
          });
        }
        break;
      }

      case EventType.paywallClose:
        console.log("❌ [Superwall] Paywall closed");
        analytics.track('superwall_paywall_closed');
        break;

      case EventType.transactionStart:
        console.log("🛒 [Superwall] Transaction started");
        analytics.track('superwall_transaction_start');
        break;

      case EventType.transactionComplete:
        console.log("✅ [Superwall] Transaction completed");
        analytics.track('superwall_transaction_complete');
        break;

      case EventType.transactionFail:
        console.log("⚠️ [Superwall] Transaction failed");
        analytics.track('superwall_transaction_fail');
        break;

      case EventType.subscriptionStart:
        console.log("🎉 [Superwall] Subscription started!");
        analytics.track('superwall_subscription_start');
        break;

      default:
        console.log(`[Superwall] Event: ${event.type}`);
        break;
    }
  }

  /**
   * Called for custom paywall actions (e.g., buttons, links)
   */
  handleCustomPaywallAction(name: string): void {
    console.log("🔘 [Superwall] Custom action:", name);
    analytics.track('superwall_custom_action', { action_name: name });
  }

  /**
   * Paywall lifecycle: Will dismiss
   */
  willDismissPaywall(paywallInfo: PaywallInfo): void {
    console.log("👋 [Superwall] Paywall will dismiss:", paywallInfo.identifier);
    analytics.track('superwall_will_dismiss', {
      paywall_id: paywallInfo.identifier,
    });
  }

  /**
   * Paywall lifecycle: Will present
   */
  willPresentPaywall(paywallInfo: PaywallInfo): void {
    console.log("👀 [Superwall] Paywall will present:", paywallInfo.identifier);
    analytics.track('superwall_will_present', {
      paywall_id: paywallInfo.identifier,
    });
  }

  /**
   * Paywall lifecycle: Did dismiss
   */
  didDismissPaywall(paywallInfo: PaywallInfo): void {
    console.log("✔️ [Superwall] Paywall did dismiss:", paywallInfo.identifier);
    analytics.track('superwall_did_dismiss', {
      paywall_id: paywallInfo.identifier,
    });
  }

  /**
   * Paywall lifecycle: Did present
   */
  didPresentPaywall(paywallInfo: PaywallInfo): void {
    console.log("✨ [Superwall] Paywall did present:", paywallInfo.identifier);
    analytics.track('superwall_did_present', {
      paywall_id: paywallInfo.identifier,
      products: paywallInfo.productIds,
    });
  }

  /**
   * URL handling: External URL will open
   */
  paywallWillOpenURL(url: URL): void {
    console.log("🔗 [Superwall] Will open URL:", url.toString());
    analytics.track('superwall_will_open_url', {
      url: url.toString(),
    });
  }

  /**
   * Deep link handling: Deep link will open
   */
  paywallWillOpenDeepLink(url: URL): void {
    console.log("🔗 [Superwall] Will open deep link:", url.toString());
    analytics.track('superwall_will_open_deep_link', {
      url: url.toString(),
    });
  }

  /**
   * Logging handler - receives Superwall SDK logs
   * Comment out the console.log to reduce noise in production
   */
  handleLog(
    level: string,
    scope: string,
    message?: string,
    info?: Map<string, any>,
    error?: string,
  ): void {
    // Uncomment for detailed SDK debugging:
    // console.log(`[Superwall ${level}] ${scope}: ${message}`, info, error);
    
    // Only log errors and warnings
    if (level === 'error' || level === 'warn') {
      console.warn(`[Superwall ${level}] ${scope}: ${message}`, error);
    }
  }

  /**
   * Link redemption: Will redeem
   */
  willRedeemLink(): void {
    console.log("🎁 [Superwall] Will redeem link");
    analytics.track('superwall_will_redeem_link');
  }

  /**
   * Link redemption: Did redeem
   */
  didRedeemLink(result: RedemptionResult): void {
    console.log("🎁 [Superwall] Did redeem link:", result);
    analytics.track('superwall_did_redeem_link', {
      result_status: result.status,
    });
  }
}

/**
 * Create and export a singleton instance
 * Use this in your app's _layout.tsx
 */
export const superwallDelegate = new AppSuperwallDelegate();
