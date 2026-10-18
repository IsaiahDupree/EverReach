/**
 * Subscription Test Helper
 * 
 * Utilities for testing subscription flows in development.
 * Provides mock data and test scenarios.
 */

import type { Entitlements, SubscriptionTier, FeatureLimits } from '@/providers/EntitlementsProviderV3';

export const TEST_PRODUCTS = {
    monthly: 'com.everreach.core.monthly',
    annual: 'com.everreach.core.yearly',
};

export const TEST_TIERS: SubscriptionTier[] = ['free', 'core', 'pro', 'team'];

/**
 * Create mock entitlements for testing
 */
export function createMockEntitlements(
    tier: SubscriptionTier = 'free',
    status: 'trial' | 'active' | 'canceled' | 'expired' = 'trial'
): Entitlements {
    const features: Record<SubscriptionTier, FeatureLimits> = {
        free: {
            compose_runs: 50,
            voice_minutes: 30,
            messages: 200,
            contacts: 100,
        },
        core: {
            compose_runs: 200,
            voice_minutes: 120,
            messages: 1000,
            contacts: 500,
        },
        pro: {
            compose_runs: 1000,
            voice_minutes: 300,
            messages: 2000,
            contacts: -1, // unlimited
        },
        team: {
            compose_runs: -1, // unlimited
            voice_minutes: -1,
            messages: -1,
            contacts: -1,
        },
    };

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
        tier,
        subscription_status: status,
        trial_ends_at: status === 'trial' ? trialEnd.toISOString() : null,
        current_period_end: status === 'active' ? periodEnd.toISOString() : null,
        payment_platform: 'revenuecat',
        environment: 'SANDBOX',
        features: features[tier],
        canceled_at: status === 'canceled' ? now.toISOString() : null,
    };
}

/**
 * Test scenarios for subscription flows
 */
export const TEST_SCENARIOS = {
    // Free user trying to purchase
    freeToPro: {
        name: 'Free → Pro Purchase',
        initial: createMockEntitlements('free', 'expired'),
        action: 'purchase',
        productId: TEST_PRODUCTS.monthly,
        expected: createMockEntitlements('pro', 'active'),
    },

    // Trial user converting to paid
    trialToPaid: {
        name: 'Trial → Paid Conversion',
        initial: createMockEntitlements('pro', 'trial'),
        action: 'purchase',
        productId: TEST_PRODUCTS.monthly,
        expected: createMockEntitlements('pro', 'active'),
    },

    // Paid user with canceled subscription
    activeToCanceled: {
        name: 'Active → Canceled',
        initial: createMockEntitlements('pro', 'active'),
        action: 'cancel',
        expected: createMockEntitlements('pro', 'canceled'),
    },

    // Restore purchases
    restore: {
        name: 'Restore Purchases',
        initial: createMockEntitlements('free', 'expired'),
        action: 'restore',
        expected: createMockEntitlements('pro', 'active'),
    },

    // Trial expiration
    trialExpired: {
        name: 'Trial Expired',
        initial: createMockEntitlements('pro', 'trial'),
        action: 'wait', // Simulate time passing
        expected: createMockEntitlements('free', 'expired'),
    },
};

/**
 * Validate subscription state
 */
export function validateSubscriptionState(
    actual: Entitlements | null,
    expected: Entitlements
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!actual) {
        return { valid: false, errors: ['Entitlements is null'] };
    }

    if (actual.tier !== expected.tier) {
        errors.push(`Tier mismatch: expected ${expected.tier}, got ${actual.tier}`);
    }

    if (actual.subscription_status !== expected.subscription_status) {
        errors.push(
            `Status mismatch: expected ${expected.subscription_status}, got ${actual.subscription_status}`
        );
    }

    if (actual.payment_platform !== expected.payment_platform) {
        errors.push(
            `Platform mismatch: expected ${expected.payment_platform}, got ${actual.payment_platform}`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Format entitlements for display
 */
export function formatEntitlementsForDisplay(entitlements: Entitlements | null): string {
    if (!entitlements) return 'No entitlements';

    const lines = [
        `Tier: ${entitlements.tier}`,
        `Status: ${entitlements.subscription_status || 'none'}`,
        `Platform: ${entitlements.payment_platform || 'none'}`,
        `Environment: ${entitlements.environment || 'unknown'}`,
    ];

    if (entitlements.trial_ends_at) {
        const date = new Date(entitlements.trial_ends_at);
        lines.push(`Trial Ends: ${date.toLocaleDateString()}`);
    }

    if (entitlements.current_period_end) {
        const date = new Date(entitlements.current_period_end);
        lines.push(`Period Ends: ${date.toLocaleDateString()}`);
    }

    lines.push('\nFeatures:');
    Object.entries(entitlements.features).forEach(([key, value]) => {
        const displayValue = value === -1 ? 'unlimited' : value;
        lines.push(`  ${key}: ${displayValue}`);
    });

    return lines.join('\n');
}

/**
 * Generate test report
 */
export interface TestResult {
    scenario: string;
    passed: boolean;
    duration: number;
    errors: string[];
}

export function generateTestReport(results: TestResult[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    const lines = [
        '='.repeat(50),
        'SUBSCRIPTION TEST REPORT',
        '='.repeat(50),
        '',
        `Total Tests: ${total}`,
        `Passed: ${passed}`,
        `Failed: ${failed}`,
        `Success Rate: ${((passed / total) * 100).toFixed(1)}%`,
        '',
        'Results:',
        '',
    ];

    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        lines.push(`${status} - ${result.scenario} (${result.duration}ms)`);

        if (result.errors.length > 0) {
            result.errors.forEach(error => {
                lines.push(`    Error: ${error}`);
            });
        }
    });

    lines.push('');
    lines.push('='.repeat(50));

    return lines.join('\n');
}
