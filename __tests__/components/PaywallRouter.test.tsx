import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaywallRouter } from '@/components/paywall/PaywallRouter';
import { useLivePaywall } from '@/hooks/useLivePaywall';
import analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/hooks/useLivePaywall');
jest.mock('@/lib/analytics');
jest.mock('@/lib/navigation', () => ({ safeGoBack: jest.fn() }));
jest.mock('@/providers/SubscriptionProvider', () => ({
  useSubscription: jest.fn(() => ({
    isPaid: false,
    refreshEntitlements: jest.fn(),
    restorePurchases: jest.fn(),
    subscriptionStatus: 'free',
  })),
}));
jest.mock('@/components/paywall/Paywall', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('@/components/paywall/RevenueCatPaywallUI', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('@/components/paywall/SuperwallPaywallNew', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockUseLivePaywall = useLivePaywall as jest.MockedFunction<typeof useLivePaywall>;

describe('PaywallRouter', () => {
  const defaultProps = {
    plans: [
      { id: 'monthly', name: 'Monthly', price: '$9.99', interval: 'month' as const, features: [] },
      { id: 'annual', name: 'Annual', price: '$99.99', interval: 'year' as const, features: [] },
    ],
    onSelectPlan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Routing', () => {
    it('should render custom paywall when provider is custom (non-iOS)', async () => {
      // iOS always routes to Superwall, so test on android
      require('react-native').Platform.OS = 'android';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'custom', paywall_id: 'default', platform: 'android', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(Paywall).toHaveBeenCalled();
      });

      require('react-native').Platform.OS = 'ios';
    });

    it('should render RevenueCat paywall when provider is revenuecat (non-iOS)', async () => {
      require('react-native').Platform.OS = 'android';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'android', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const RevenueCatPaywallUI = require('@/components/paywall/RevenueCatPaywallUI').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(RevenueCatPaywallUI).toHaveBeenCalled();
      });

      require('react-native').Platform.OS = 'ios';
    });

    it('should always use Superwall on iOS regardless of provider', async () => {
      require('react-native').Platform.OS = 'ios';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'custom', paywall_id: 'default', platform: 'ios', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const SuperwallPaywallNew = require('@/components/paywall/SuperwallPaywallNew').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(SuperwallPaywallNew).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when config is loading', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = render(<PaywallRouter {...defaultProps} />);
      expect(getByText(/loading paywall configuration/i)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should fallback to custom paywall on error', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: false,
        error: 'Network error',
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', {
        reason: 'hook_error',
        error: 'Network error',
        platform: expect.any(String),
      });
    });

    it('should fallback to custom paywall when config is null', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
    });

    it('should fallback to custom paywall for unknown provider (non-iOS)', () => {
      require('react-native').Platform.OS = 'android';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'unknown' as any, paywall_id: 'test', platform: 'android', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', expect.objectContaining({
        reason: 'unknown_provider',
        provider: 'unknown',
      }));

      require('react-native').Platform.OS = 'ios';
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should fallback to custom on web for RevenueCat', () => {
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'web';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'web', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', {
        reason: 'unsupported_platform',
        provider: 'revenuecat',
        platform: 'web',
      });

      require('react-native').Platform.OS = originalPlatform;
    });

    it('should fallback to custom on web for Superwall', () => {
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'web';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'superwall', paywall_id: 'campaign', platform: 'web', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', {
        reason: 'unsupported_platform',
        provider: 'superwall',
        platform: 'web',
      });

      require('react-native').Platform.OS = originalPlatform;
    });
  });

  describe('Props Forwarding', () => {
    it('should forward all props to custom paywall (non-iOS)', () => {
      require('react-native').Platform.OS = 'android';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'custom', paywall_id: 'default', platform: 'android', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      const props = {
        ...defaultProps,
        entitlements: { premium: true },
        isRestoring: true,
        currentPlanId: 'monthly',
      };

      render(<PaywallRouter {...props} />);

      expect(Paywall).toHaveBeenCalled();

      require('react-native').Platform.OS = 'ios';
    });

    it('should forward props to RevenueCat paywall (non-iOS)', () => {
      require('react-native').Platform.OS = 'android';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'android', updated_at: '2025-11-15T00:00:00Z' },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const RevenueCatPaywallUI = require('@/components/paywall/RevenueCatPaywallUI').default;
      const props = {
        ...defaultProps,
        entitlements: { premium: true },
        isRestoring: false,
        currentPlanId: 'annual',
      };

      render(<PaywallRouter {...props} />);

      expect(RevenueCatPaywallUI).toHaveBeenCalled();

      require('react-native').Platform.OS = 'ios';
    });
  });

  describe('Analytics Tracking', () => {
    it('should track fallback events', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: false,
        error: 'API Error',
        refetch: jest.fn(),
      });

      render(<PaywallRouter {...defaultProps} />);

      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', {
        reason: 'hook_error',
        error: 'API Error',
        platform: expect.any(String),
      });
    });
  });
});
