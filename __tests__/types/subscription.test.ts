/**
 * Subscription Type Tests
 * Feature: IOS-DATA-003
 *
 * Tests for Subscription type definitions following TDD approach.
 * These tests verify that subscription types, tier enums, and related interfaces are properly defined.
 */

import {
  Subscription,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionProvider,
  SubscriptionTierInfo,
  SubscriptionInput,
  RevenueCatPackage,
  PurchaseResult,
} from '../../types/subscription';

describe('Subscription Types', () => {
  describe('SubscriptionTier enum', () => {
    it('should define FREE tier', () => {
      expect(SubscriptionTier.FREE).toBe('free');
    });

    it('should define BASIC tier', () => {
      expect(SubscriptionTier.BASIC).toBe('basic');
    });

    it('should define PRO tier', () => {
      expect(SubscriptionTier.PRO).toBe('pro');
    });

    it('should define PREMIUM tier', () => {
      expect(SubscriptionTier.PREMIUM).toBe('premium');
    });

    it('should have exactly 4 tier values', () => {
      const tierValues = Object.values(SubscriptionTier);
      expect(tierValues).toHaveLength(4);
    });
  });

  describe('SubscriptionStatus enum', () => {
    it('should define ACTIVE status', () => {
      expect(SubscriptionStatus.ACTIVE).toBe('active');
    });

    it('should define INACTIVE status', () => {
      expect(SubscriptionStatus.INACTIVE).toBe('inactive');
    });

    it('should define TRIALING status', () => {
      expect(SubscriptionStatus.TRIALING).toBe('trialing');
    });

    it('should define CANCELLED status', () => {
      expect(SubscriptionStatus.CANCELLED).toBe('cancelled');
    });

    it('should define EXPIRED status', () => {
      expect(SubscriptionStatus.EXPIRED).toBe('expired');
    });

    it('should have exactly 5 status values', () => {
      const statusValues = Object.values(SubscriptionStatus);
      expect(statusValues).toHaveLength(5);
    });
  });

  describe('SubscriptionProvider enum', () => {
    it('should define REVENUECAT provider', () => {
      expect(SubscriptionProvider.REVENUECAT).toBe('revenuecat');
    });

    it('should define STRIPE provider', () => {
      expect(SubscriptionProvider.STRIPE).toBe('stripe');
    });

    it('should have exactly 2 provider values', () => {
      const providerValues = Object.values(SubscriptionProvider);
      expect(providerValues).toHaveLength(2);
    });
  });

  describe('Subscription interface', () => {
    it('should accept a valid Subscription object with all required fields', () => {
      const subscription: Subscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(subscription.id).toBeDefined();
      expect(subscription.user_id).toBeDefined();
      expect(subscription.tier).toBe(SubscriptionTier.PRO);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(subscription.created_at).toBeDefined();
    });

    it('should accept a Subscription with all optional fields', () => {
      const subscription: Subscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        tier: SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        provider: SubscriptionProvider.REVENUECAT,
        provider_subscription_id: 'rc_sub_123456789',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      expect(subscription.provider).toBe(SubscriptionProvider.REVENUECAT);
      expect(subscription.provider_subscription_id).toBe('rc_sub_123456789');
      expect(subscription.current_period_start).toBeDefined();
      expect(subscription.current_period_end).toBeDefined();
      expect(subscription.updated_at).toBeDefined();
    });

    it('should accept a FREE tier subscription', () => {
      const subscription: Subscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(subscription.tier).toBe(SubscriptionTier.FREE);
    });

    it('should accept a TRIALING status subscription', () => {
      const subscription: Subscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        tier: SubscriptionTier.BASIC,
        status: SubscriptionStatus.TRIALING,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(subscription.status).toBe(SubscriptionStatus.TRIALING);
    });

    it('should accept a CANCELLED subscription', () => {
      const subscription: Subscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '987fcdeb-51a2-43d7-9876-543210987654',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELLED,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(subscription.status).toBe(SubscriptionStatus.CANCELLED);
    });
  });

  describe('SubscriptionTierInfo interface', () => {
    it('should accept a valid tier info for monthly billing', () => {
      const tierInfo: SubscriptionTierInfo = {
        tier: SubscriptionTier.PRO,
        name: 'Pro Plan',
        description: 'Perfect for professionals',
        price: '$9.99',
        period: 'monthly',
        features: [
          'Unlimited items',
          'Advanced analytics',
          'Priority support',
        ],
      };

      expect(tierInfo.tier).toBe(SubscriptionTier.PRO);
      expect(tierInfo.name).toBe('Pro Plan');
      expect(tierInfo.period).toBe('monthly');
      expect(tierInfo.features).toHaveLength(3);
    });

    it('should accept a tier info with yearly billing', () => {
      const tierInfo: SubscriptionTierInfo = {
        tier: SubscriptionTier.PREMIUM,
        name: 'Premium Plan',
        description: 'All features unlocked',
        price: '$99.99',
        period: 'yearly',
        features: ['Everything in Pro', 'Custom branding', 'API access'],
        isPopular: true,
      };

      expect(tierInfo.period).toBe('yearly');
      expect(tierInfo.isPopular).toBe(true);
    });

    it('should accept a tier info with lifetime billing', () => {
      const tierInfo: SubscriptionTierInfo = {
        tier: SubscriptionTier.PREMIUM,
        name: 'Lifetime Access',
        description: 'One-time payment',
        price: '$299.99',
        period: 'lifetime',
        features: ['Lifetime access', 'All future updates'],
      };

      expect(tierInfo.period).toBe('lifetime');
    });

    it('should accept a tier info with RevenueCat product ID', () => {
      const tierInfo: SubscriptionTierInfo = {
        tier: SubscriptionTier.PRO,
        name: 'Pro Plan',
        description: 'Professional features',
        price: '$9.99',
        period: 'monthly',
        features: ['Feature 1', 'Feature 2'],
        productId: 'rc_pro_monthly_999',
      };

      expect(tierInfo.productId).toBe('rc_pro_monthly_999');
    });

    it('should accept a FREE tier info', () => {
      const tierInfo: SubscriptionTierInfo = {
        tier: SubscriptionTier.FREE,
        name: 'Free Plan',
        description: 'Get started for free',
        price: '$0',
        period: 'monthly',
        features: ['5 items', 'Basic support'],
      };

      expect(tierInfo.tier).toBe(SubscriptionTier.FREE);
      expect(tierInfo.price).toBe('$0');
    });
  });

  describe('SubscriptionInput interface', () => {
    it('should accept minimal input with just tier', () => {
      const input: SubscriptionInput = {
        tier: SubscriptionTier.BASIC,
      };

      expect(input.tier).toBe(SubscriptionTier.BASIC);
    });

    it('should accept input with all optional fields', () => {
      const input: SubscriptionInput = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        provider: SubscriptionProvider.REVENUECAT,
        provider_subscription_id: 'rc_sub_abc123',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
      };

      expect(input.tier).toBe(SubscriptionTier.PRO);
      expect(input.status).toBe(SubscriptionStatus.ACTIVE);
      expect(input.provider).toBe(SubscriptionProvider.REVENUECAT);
      expect(input.provider_subscription_id).toBeDefined();
      expect(input.current_period_start).toBeDefined();
      expect(input.current_period_end).toBeDefined();
    });
  });

  describe('RevenueCatPackage interface', () => {
    it('should accept a valid RevenueCat package', () => {
      const rcPackage: RevenueCatPackage = {
        identifier: 'monthly_999',
        product: {
          identifier: 'pro_monthly',
          description: 'Pro subscription - monthly',
          title: 'Pro Plan Monthly',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
        },
        packageType: 'monthly',
      };

      expect(rcPackage.identifier).toBe('monthly_999');
      expect(rcPackage.product.price).toBe(9.99);
      expect(rcPackage.product.priceString).toBe('$9.99');
      expect(rcPackage.product.currencyCode).toBe('USD');
      expect(rcPackage.packageType).toBe('monthly');
    });

    it('should accept an annual package', () => {
      const rcPackage: RevenueCatPackage = {
        identifier: 'annual_9999',
        product: {
          identifier: 'premium_annual',
          description: 'Premium subscription - annual',
          title: 'Premium Plan Annual',
          price: 99.99,
          priceString: '$99.99',
          currencyCode: 'USD',
        },
        packageType: 'annual',
      };

      expect(rcPackage.packageType).toBe('annual');
      expect(rcPackage.product.price).toBe(99.99);
    });
  });

  describe('PurchaseResult interface', () => {
    it('should accept a successful purchase result', () => {
      const result: PurchaseResult = {
        success: true,
        entitlements: {
          pro: {
            identifier: 'pro',
            isActive: true,
          },
        },
      };

      expect(result.success).toBe(true);
      expect(result.entitlements).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should accept a failed purchase result with error', () => {
      const result: PurchaseResult = {
        success: false,
        error: 'Payment method declined',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment method declined');
      expect(result.entitlements).toBeUndefined();
    });

    it('should accept a failed result with entitlements still defined', () => {
      const result: PurchaseResult = {
        success: false,
        error: 'User cancelled',
        entitlements: {},
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
      expect(result.entitlements).toBeDefined();
    });
  });

  describe('Type compatibility and usage', () => {
    it('should allow creating a subscription with different tier types', () => {
      const tiers: SubscriptionTier[] = [
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PRO,
        SubscriptionTier.PREMIUM,
      ];

      tiers.forEach((tier) => {
        const subscription: Subscription = {
          id: `sub-${tier}`,
          user_id: 'user-123',
          tier,
          status: SubscriptionStatus.ACTIVE,
          created_at: new Date().toISOString(),
        };

        expect(subscription.tier).toBe(tier);
      });
    });

    it('should allow creating subscriptions with different statuses', () => {
      const statuses: SubscriptionStatus[] = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.INACTIVE,
        SubscriptionStatus.TRIALING,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
      ];

      statuses.forEach((status) => {
        const subscription: Subscription = {
          id: `sub-${status}`,
          user_id: 'user-123',
          tier: SubscriptionTier.PRO,
          status,
          created_at: new Date().toISOString(),
        };

        expect(subscription.status).toBe(status);
      });
    });

    it('should allow creating subscriptions with different providers', () => {
      const providers: SubscriptionProvider[] = [
        SubscriptionProvider.REVENUECAT,
        SubscriptionProvider.STRIPE,
      ];

      providers.forEach((provider) => {
        const subscription: Subscription = {
          id: `sub-${provider}`,
          user_id: 'user-123',
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          provider,
          created_at: new Date().toISOString(),
        };

        expect(subscription.provider).toBe(provider);
      });
    });
  });
});
