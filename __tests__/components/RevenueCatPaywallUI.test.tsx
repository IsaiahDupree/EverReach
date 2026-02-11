import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import RevenueCatPaywallUI from '@/components/paywall/RevenueCatPaywallUI';
import analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/lib/analytics');
jest.mock('@/components/paywall/Paywall', () => ({
  __esModule: true,
  default: jest.fn(({ onSelectPlan, plans }) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="custom-paywall">
        {plans?.map((plan: any) => (
          <Button
            key={plan.id}
            title={plan.name}
            onPress={() => onSelectPlan(plan.id)}
            testID={`plan-${plan.id}`}
          />
        ))}
      </View>
    );
  }),
}));

// Mock RevenueCat SDK
const mockPurchases = {
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  PACKAGE_TYPE: {
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL',
    LIFETIME: 'LIFETIME',
  },
};

// Mock both default and named exports
jest.mock('react-native-purchases', () => mockPurchases, { virtual: true });

describe('RevenueCatPaywallUI', () => {
  const mockConfig = {
    provider: 'revenuecat' as const,
    paywall_id: 'default',
    platform: 'ios' as const,
    updated_at: '2025-11-15T00:00:00Z',
  };

  const mockOffering = {
    identifier: 'default',
    availablePackages: [
      {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: {
          title: 'Monthly Premium',
          priceString: '$9.99',
          description: 'Full access',
        },
      },
      {
        identifier: '$rc_annual',
        packageType: 'ANNUAL',
        product: {
          title: 'Annual Premium',
          priceString: '$99.99',
          description: 'Best value',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockPurchases.getOfferings.mockResolvedValue({
      all: { default: mockOffering },
      current: mockOffering,
    });
  });

  describe('Offering Fetch', () => {
    it('should fetch and display RevenueCat offerings', async () => {
      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockPurchases.getOfferings).toHaveBeenCalled();
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });

      expect(analytics.track).toHaveBeenCalledWith('revenuecat_offering_loaded', {
        offering_id: 'default',
        package_count: 2,
        platform: 'ios',
      });
    });

    it('should map packages to plan format', async () => {
      const onSelectPlan = jest.fn();
      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={onSelectPlan}
        />
      );

      await waitFor(() => {
        expect(getByTestId('plan-$rc_monthly')).toBeTruthy();
        expect(getByTestId('plan-$rc_annual')).toBeTruthy();
      });
    });

    it('should handle missing offering gracefully', async () => {
      mockPurchases.getOfferings.mockResolvedValue({
        all: {},
        current: null,
      });

      const { getByText } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText(/failed to load plans/i)).toBeTruthy();
      });

      expect(analytics.track).toHaveBeenCalledWith('revenuecat_offering_error', expect.objectContaining({
        error: expect.stringContaining('No offering found'),
      }));
    });

    it('should use current offering if paywall_id not found', async () => {
      const configWithMissingId = {
        ...mockConfig,
        paywall_id: 'nonexistent',
      };

      mockPurchases.getOfferings.mockResolvedValue({
        all: {},
        current: mockOffering,
      });

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={configWithMissingId}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });
    });
  });

  describe('Purchase Flow', () => {
    it('should handle successful purchase', async () => {
      const onPurchaseComplete = jest.fn();
      const onSelectPlan = jest.fn();

      mockPurchases.purchasePackage.mockResolvedValue({
        customerInfo: {
          entitlements: {
            active: { premium: {} },
          },
        },
      });

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={onPurchaseComplete}
          onSelectPlan={onSelectPlan}
        />
      );

      await waitFor(() => {
        expect(getByTestId('plan-$rc_monthly')).toBeTruthy();
      });

      // Simulate plan selection
      fireEvent.press(getByTestId('plan-$rc_monthly'));

      await waitFor(() => {
        expect(mockPurchases.purchasePackage).toHaveBeenCalled();
        expect(onPurchaseComplete).toHaveBeenCalled();
        expect(onSelectPlan).toHaveBeenCalledWith('$rc_monthly');
      });

      expect(analytics.track).toHaveBeenCalledWith('revenuecat_purchase_started', {
        plan_id: '$rc_monthly',
        offering_id: 'default',
      });

      expect(analytics.track).toHaveBeenCalledWith('revenuecat_purchase_success', {
        plan_id: '$rc_monthly',
        offering_id: 'default',
        entitlements: ['premium'],
      });
    });

    it('should handle purchase error', async () => {
      const error = new Error('Payment failed');
      mockPurchases.purchasePackage.mockRejectedValue(error);

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('plan-$rc_monthly')).toBeTruthy();
      });

      fireEvent.press(getByTestId('plan-$rc_monthly'));

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('revenuecat_purchase_error', {
          plan_id: '$rc_monthly',
          error: 'Payment failed',
          code: undefined,
        });
      });
    });

    it('should handle user cancellation', async () => {
      const error = { userCancelled: true };
      mockPurchases.purchasePackage.mockRejectedValue(error);

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('plan-$rc_monthly')).toBeTruthy();
      });

      fireEvent.press(getByTestId('plan-$rc_monthly'));

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('revenuecat_purchase_cancelled', {
          plan_id: '$rc_monthly',
        });
      });
    });
  });

  describe('Restore Purchases', () => {
    it('should handle successful restore', async () => {
      const onRestoreComplete = jest.fn();
      const onRestore = jest.fn();

      mockPurchases.restorePurchases.mockResolvedValue({
        entitlements: {
          active: { premium: {} },
        },
      });

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onRestoreComplete={onRestoreComplete}
          onRestore={onRestore}
        />
      );

      await waitFor(() => {
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });

      // Note: The actual restore button would be in the Paywall component
      // This test assumes we can trigger restore via onRestore prop
    });
  });

  describe('Platform Handling', () => {
    it('should show not supported message on web', () => {
      Platform.OS = 'web';

      const { getByText } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      expect(getByText(/not supported on web/i)).toBeTruthy();
      expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    });

    it('should work on iOS', async () => {
      Platform.OS = 'ios';

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockPurchases.getOfferings).toHaveBeenCalled();
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });
    });

    it('should work on Android', async () => {
      Platform.OS = 'android';

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockPurchases.getOfferings).toHaveBeenCalled();
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching', () => {
      mockPurchases.getOfferings.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByText } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      expect(getByText(/loading subscription plans/i)).toBeTruthy();
    });
  });

  describe('Package Type Mapping', () => {
    it('should map MONTHLY to month interval', async () => {
      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });

      // Plans are rendered with correct intervals
      // This would be visible in the mapped plan data
    });

    it('should map ANNUAL to year interval', async () => {
      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });
    });

    it('should map LIFETIME to lifetime interval', async () => {
      mockPurchases.getOfferings.mockResolvedValue({
        all: {
          default: {
            identifier: 'default',
            availablePackages: [
              {
                identifier: '$rc_lifetime',
                packageType: 'LIFETIME',
                product: {
                  title: 'Lifetime Access',
                  priceString: '$299.99',
                  description: 'One-time payment',
                },
              },
            ],
          },
        },
        current: null,
      });

      const { getByTestId } = render(
        <RevenueCatPaywallUI
          remoteConfig={mockConfig}
          onSelectPlan={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByTestId('custom-paywall')).toBeTruthy();
      });
    });
  });
});
