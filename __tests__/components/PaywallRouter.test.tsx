import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaywallRouter } from '@/components/paywall/PaywallRouter';
import { useLivePaywall } from '@/hooks/useLivePaywall';
import analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/hooks/useLivePaywall');
jest.mock('@/lib/analytics');
jest.mock('@/components/paywall/Paywall', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('@/components/paywall/RevenueCatPaywallUI', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('@/components/paywall/SuperwallPaywallUI', () => ({
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
    it('should render custom paywall when provider is custom', async () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'custom', paywall_id: 'default', platform: 'ios' },
        loading: false,
        error: null,
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(Paywall).toHaveBeenCalledWith(
          expect.objectContaining(defaultProps),
          expect.anything()
        );
      });
    });

    it('should render RevenueCat paywall when provider is revenuecat', async () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'ios' },
        loading: false,
        error: null,
      });

      const RevenueCatPaywallUI = require('@/components/paywall/RevenueCatPaywallUI').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(RevenueCatPaywallUI).toHaveBeenCalledWith(
          expect.objectContaining({
            remoteConfig: { provider: 'revenuecat', paywall_id: 'premium', platform: 'ios' },
          }),
          expect.anything()
        );
      });
    });

    it('should render Superwall paywall when provider is superwall', async () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'superwall', paywall_id: 'campaign_1', platform: 'android' },
        loading: false,
        error: null,
      });

      const SuperwallPaywallUI = require('@/components/paywall/SuperwallPaywallUI').default;
      render(<PaywallRouter {...defaultProps} />);

      await waitFor(() => {
        expect(SuperwallPaywallUI).toHaveBeenCalledWith(
          expect.objectContaining({
            remoteConfig: { provider: 'superwall', paywall_id: 'campaign_1', platform: 'android' },
          }),
          expect.anything()
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when config is loading', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: true,
        error: null,
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
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
    });

    it('should fallback to custom paywall for unknown provider', () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'unknown' as any, paywall_id: 'test', platform: 'ios' },
        loading: false,
        error: null,
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      render(<PaywallRouter {...defaultProps} />);

      expect(Paywall).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('paywall_provider_fallback', {
        reason: 'unknown_provider',
        provider: 'unknown',
        platform: expect.any(String),
      });
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should fallback to custom on web for RevenueCat', () => {
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'web';

      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'web' },
        loading: false,
        error: null,
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
        config: { provider: 'superwall', paywall_id: 'campaign', platform: 'web' },
        loading: false,
        error: null,
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
    it('should forward all props to custom paywall', () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'custom', paywall_id: 'default', platform: 'ios' },
        loading: false,
        error: null,
      });

      const Paywall = require('@/components/paywall/Paywall').default;
      const props = {
        ...defaultProps,
        entitlements: { premium: true },
        isRestoring: true,
        currentPlanId: 'monthly',
      };

      render(<PaywallRouter {...props} />);

      expect(Paywall).toHaveBeenCalledWith(
        expect.objectContaining({
          plans: props.plans,
          entitlements: props.entitlements,
          isRestoring: props.isRestoring,
          currentPlanId: props.currentPlanId,
        }),
        expect.anything()
      );
    });

    it('should forward props to RevenueCat paywall', () => {
      mockUseLivePaywall.mockReturnValue({
        config: { provider: 'revenuecat', paywall_id: 'premium', platform: 'ios' },
        loading: false,
        error: null,
      });

      const RevenueCatPaywallUI = require('@/components/paywall/RevenueCatPaywallUI').default;
      const props = {
        ...defaultProps,
        entitlements: { premium: true },
        isRestoring: false,
        currentPlanId: 'annual',
      };

      render(<PaywallRouter {...props} />);

      expect(RevenueCatPaywallUI).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: props.entitlements,
          isRestoring: props.isRestoring,
          currentPlanId: props.currentPlanId,
        }),
        expect.anything()
      );
    });
  });

  describe('Analytics Tracking', () => {
    it('should track fallback events', () => {
      mockUseLivePaywall.mockReturnValue({
        config: null,
        loading: false,
        error: 'API Error',
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
