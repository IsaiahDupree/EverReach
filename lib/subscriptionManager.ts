/**
 * Subscription Manager
 * 
 * Single source of truth for subscription state across the app.
 * Handles RevenueCat, Superwall, and backend sync.
 * Ensures entitlements work consistently across web and mobile.
 */

import { Platform } from 'react-native';
import analytics from './analytics';
import { apiFetch } from './api';
import type { SubscriptionTier, Entitlements, FeatureLimits } from '@/providers/EntitlementsProviderV3';

// Subscription event types
export type SubscriptionEvent =
    | 'PURCHASE_STARTED'
    | 'PURCHASE_COMPLETED'
    | 'PURCHASE_FAILED'
    | 'PURCHASE_CANCELLED'
    | 'RESTORE_STARTED'
    | 'RESTORE_COMPLETED'
    | 'RESTORE_FAILED'
    | 'ENTITLEMENTS_REFRESHED'
    | 'ENTITLEMENTS_SYNCED'
    | 'BACKEND_SYNC_STARTED'
    | 'BACKEND_SYNC_COMPLETED'
    | 'BACKEND_SYNC_FAILED';

interface SubscriptionEventData {
    event: SubscriptionEvent;
    timestamp: string;
    platform: 'ios' | 'android' | 'web';
    data?: any;
    error?: string;
}

class SubscriptionManager {
    private static instance: SubscriptionManager;
    private eventListeners: Array<(event: SubscriptionEventData) => void> = [];
    private syncInProgress = false;

    private constructor() { }

    static getInstance(): SubscriptionManager {
        if (!SubscriptionManager.instance) {
            SubscriptionManager.instance = new SubscriptionManager();
        }
        return SubscriptionManager.instance;
    }

    /**
     * Subscribe to subscription events
     */
    addEventListener(listener: (event: SubscriptionEventData) => void) {
        this.eventListeners.push(listener);
        return () => {
            this.eventListeners = this.eventListeners.filter(l => l !== listener);
        };
    }

    /**
     * Emit a subscription event
     */
    private emitEvent(event: SubscriptionEvent, data?: any, error?: string) {
        const eventData: SubscriptionEventData = {
            event,
            timestamp: new Date().toISOString(),
            platform: Platform.OS as 'ios' | 'android' | 'web',
            data,
            error,
        };

        console.log(`[SubscriptionManager] ${event}`, eventData);

        // Notify listeners
        this.eventListeners.forEach(listener => {
            try {
                listener(eventData);
            } catch (err) {
                console.error('[SubscriptionManager] Listener error:', err);
            }
        });

        // Track in analytics
        analytics.capture(`subscription_${event.toLowerCase()}`, {
            ...data,
            error,
            platform: Platform.OS,
        });
    }

    /**
     * Fetch entitlements from backend
     * This is the single source of truth for subscription state
     */
    async fetchEntitlements(): Promise<Entitlements | null> {
        try {
            this.emitEvent('ENTITLEMENTS_REFRESHED', { source: 'manual' });

            const response = await apiFetch('/api/v1/me/entitlements', {
                method: 'GET',
                requireAuth: true,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch entitlements: ${response.status}`);
            }

            const entitlements = await response.json();

            this.emitEvent('ENTITLEMENTS_SYNCED', {
                tier: entitlements.tier,
                status: entitlements.subscription_status,
            });

            return entitlements;
        } catch (error: any) {
            this.emitEvent('BACKEND_SYNC_FAILED', undefined, error.message);
            console.error('[SubscriptionManager] Failed to fetch entitlements:', error);
            return null;
        }
    }

    /**
     * Purchase a subscription (native only)
     * Handles RevenueCat purchase flow
     */
    async purchaseSubscription(productId: string): Promise<{ success: boolean; error?: string }> {
        if (Platform.OS === 'web') {
            return {
                success: false,
                error: 'Subscriptions not available on web. Please use mobile app.',
            };
        }

        try {
            this.emitEvent('PURCHASE_STARTED', { product_id: productId });

            // Dynamically import RevenueCat (native only)
            const Purchases = await import('react-native-purchases').then(m => m.default || m);

            // Get current offerings
            const offerings = await Purchases.getOfferings();

            // Find the package for this product
            let packageToPurchase = null;
            for (const offering of Object.values(offerings.all)) {
                const pkg = (offering as any).availablePackages.find(
                    (p: any) => p.product.identifier === productId
                );
                if (pkg) {
                    packageToPurchase = pkg;
                    break;
                }
            }

            if (!packageToPurchase) {
                throw new Error(`Product ${productId} not found in offerings`);
            }

            // Make the purchase
            const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

            this.emitEvent('PURCHASE_COMPLETED', {
                product_id: productId,
                entitlements: Object.keys(customerInfo.entitlements.active),
            });

            // Sync with backend
            await this.syncWithBackend();

            return { success: true };
        } catch (error: any) {
            if (error.userCancelled) {
                this.emitEvent('PURCHASE_CANCELLED', { product_id: productId });
            } else {
                this.emitEvent('PURCHASE_FAILED', { product_id: productId }, error.message);
            }

            return {
                success: false,
                error: error.userCancelled ? 'Purchase cancelled' : error.message,
            };
        }
    }

    /**
     * Restore purchases (native only)
     */
    async restorePurchases(): Promise<{
        success: boolean;
        restored: boolean;
        tier?: SubscriptionTier;
        error?: string;
    }> {
        if (Platform.OS === 'web') {
            return {
                success: false,
                restored: false,
                error: 'Restore not available on web',
            };
        }

        try {
            this.emitEvent('RESTORE_STARTED');

            // Option 1: Use RevenueCat native restore
            const Purchases = await import('react-native-purchases').then(m => m.default || m);
            const customerInfo = await Purchases.restorePurchases();

            const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;

            this.emitEvent('RESTORE_COMPLETED', {
                restored: hasActiveEntitlements,
                entitlements: Object.keys(customerInfo.entitlements.active),
            });

            // Sync with backend
            await this.syncWithBackend();

            // Fetch updated entitlements to get tier
            const entitlements = await this.fetchEntitlements();

            return {
                success: true,
                restored: hasActiveEntitlements,
                tier: entitlements?.tier,
            };
        } catch (error: any) {
            this.emitEvent('RESTORE_FAILED', undefined, error.message);

            return {
                success: false,
                restored: false,
                error: error.message,
            };
        }
    }

    /**
     * Sync purchase state with backend
     * This ensures entitlements work across web and mobile
     */
    async syncWithBackend(): Promise<boolean> {
        if (this.syncInProgress) {
            console.log('[SubscriptionManager] Sync already in progress, skipping');
            return false;
        }

        if (Platform.OS === 'web') {
            console.log('[SubscriptionManager] Web platform, skipping native sync');
            return false;
        }

        try {
            this.syncInProgress = true;
            this.emitEvent('BACKEND_SYNC_STARTED');

            // Get current RevenueCat customer info
            const Purchases = await import('react-native-purchases').then(m => m.default || m);
            const customerInfo = await Purchases.getCustomerInfo();

            // Send to backend
            const response = await apiFetch('/api/v1/subscriptions/sync', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                    platform: Platform.OS,
                    customer_info: {
                        entitlements: Object.keys(customerInfo.entitlements.active),
                        active_subscriptions: customerInfo.activeSubscriptions,
                        original_app_user_id: customerInfo.originalAppUserId,
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Backend sync failed: ${response.status}`);
            }

            this.emitEvent('BACKEND_SYNC_COMPLETED');

            return true;
        } catch (error: any) {
            this.emitEvent('BACKEND_SYNC_FAILED', undefined, error.message);
            console.error('[SubscriptionManager] Backend sync failed:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Check if user has a specific feature
     */
    hasFeature(entitlements: Entitlements | null, feature: keyof FeatureLimits, amount = 1): boolean {
        if (!entitlements) return false;

        const limit = entitlements.features[feature];

        if (typeof limit === 'boolean') {
            return limit;
        }

        // -1 means unlimited
        if (limit === -1) return true;

        return limit >= amount;
    }

    /**
     * Get tier display name
     */
    getTierDisplayName(tier: SubscriptionTier): string {
        const names: Record<SubscriptionTier, string> = {
            free: 'Free',
            core: 'Core',
            pro: 'Pro',
            team: 'Team',
        };
        return names[tier] || tier;
    }

    /**
     * Check if subscription is active
     */
    isActive(entitlements: Entitlements | null): boolean {
        if (!entitlements) return false;

        const status = entitlements.subscription_status?.toUpperCase();
        return status === 'ACTIVE' || status === 'TRIAL';
    }

    /**
     * Get days remaining in trial
     */
    getTrialDaysRemaining(entitlements: Entitlements | null): number | null {
        if (!entitlements?.trial_ends_at) return null;

        const now = new Date();
        const trialEnd = new Date(entitlements.trial_ends_at);
        const diffMs = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManager.getInstance();
export default subscriptionManager;
