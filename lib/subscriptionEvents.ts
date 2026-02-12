/**
 * Subscription Events Logger
 * 
 * Centralized event tracking for subscription lifecycle.
 * Logs all events to console and analytics.
 */

import analytics from './analytics';

export type SubscriptionEventType =
    // Purchase events
    | 'purchase_button_clicked'
    | 'purchase_started'
    | 'purchase_completed'
    | 'purchase_failed'
    | 'purchase_cancelled'

    // Restore events
    | 'restore_button_clicked'
    | 'restore_started'
    | 'restore_completed'
    | 'restore_failed'
    | 'restore_no_purchases'

    // Entitlement events
    | 'entitlements_fetched'
    | 'entitlements_updated'
    | 'entitlements_error'

    // Sync events
    | 'backend_sync_started'
    | 'backend_sync_completed'
    | 'backend_sync_failed'

    // Paywall events
    | 'paywall_viewed'
    | 'paywall_dismissed'
    | 'paywall_error'

    // Feature gate events
    | 'feature_locked'
    | 'upgrade_prompt_shown';

interface EventData {
    [key: string]: any;
}

class SubscriptionEvents {
    /**
     * Track a subscription event
     */
    track(event: SubscriptionEventType, data?: EventData) {
        const timestamp = new Date().toISOString();

        console.log(`[Subscription] ${event}`, {
            timestamp,
            ...data,
        });

        // Send to analytics (track() → Backend + PostHog + Meta)
        analytics.track(event, {
            timestamp,
            ...data,
        });
    }

    /**
     * Track purchase flow
     */
    trackPurchaseFlow(
        stage: 'start' | 'complete' | 'fail' | 'cancel',
        data?: EventData
    ) {
        const events: Record<typeof stage, SubscriptionEventType> = {
            start: 'purchase_started',
            complete: 'purchase_completed',
            fail: 'purchase_failed',
            cancel: 'purchase_cancelled',
        };

        this.track(events[stage], data);
    }

    /**
     * Track restore flow
     */
    trackRestoreFlow(
        stage: 'start' | 'complete' | 'fail' | 'no_purchases',
        data?: EventData
    ) {
        const events: Record<typeof stage, SubscriptionEventType> = {
            start: 'restore_started',
            complete: 'restore_completed',
            fail: 'restore_failed',
            no_purchases: 'restore_no_purchases',
        };

        this.track(events[stage], data);
    }

    /**
     * Track backend sync
     */
    trackSync(
        stage: 'start' | 'complete' | 'fail',
        data?: EventData
    ) {
        const events: Record<typeof stage, SubscriptionEventType> = {
            start: 'backend_sync_started',
            complete: 'backend_sync_completed',
            fail: 'backend_sync_failed',
        };

        this.track(events[stage], data);
    }

    /**
     * Track paywall interaction
     */
    trackPaywall(
        action: 'viewed' | 'dismissed' | 'error',
        data?: EventData
    ) {
        const events: Record<typeof action, SubscriptionEventType> = {
            viewed: 'paywall_viewed',
            dismissed: 'paywall_dismissed',
            error: 'paywall_error',
        };

        this.track(events[action], data);
    }

    /**
     * Track feature gate
     */
    trackFeatureGate(feature: string, data?: EventData) {
        this.track('feature_locked', {
            feature,
            ...data,
        });
    }
}

// Export singleton
export const subscriptionEvents = new SubscriptionEvents();
export default subscriptionEvents;
