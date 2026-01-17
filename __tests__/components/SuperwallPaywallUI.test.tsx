import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import SuperwallPaywallUI from '@/components/paywall/SuperwallPaywallUI';
import analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/lib/analytics');

// Mock Superwall SDK
const mockSuperwall = {
  shared: {
    register: jest.fn(),
    delegate: {
      didPurchase: null as any,
      paywallWillDismiss: null as any,
    },
  },
};

jest.mock('@superwall/react-native-superwall', () => ({
  default: mockSuperwall,
}), { virtual: true });

describe('SuperwallPaywallUI', () => {
  const mockConfig = {
    provider: 'superwall' as const,
    paywall_id: 'campaign_1',
    platform: 'ios' as const,
    updated_at: '2025-11-15T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockSuperwall.shared.register.mockResolvedValue(undefined);
  });

  describe('SDK Loading', () => {
    it('should load Superwall SDK on native platforms', async () => {
      Platform.OS = 'ios';

      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.register).toHaveBeenCalledWith('campaign_1');
      });

      expect(analytics.track).toHaveBeenCalledWith('superwall_paywall_displayed', {
        placement: 'campaign_1',
        platform: 'ios',
      });
    });

    it('should handle SDK load failure', async () => {
      // Mock SDK import failure
      jest.doMock('@superwall/react-native-superwall', () => {
        throw new Error('SDK not found');
      });

      const { getByText } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      // Wait for error state
      await waitFor(() => {
        const errorElements = [
          getByText(/failed to load superwall/i, { exact: false }),
        ];
        expect(errorElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Platform Handling', () => {
    it('should show not supported message on web', () => {
      Platform.OS = 'web';

      const { getByText } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      expect(getByText(/not supported on web/i)).toBeTruthy();
      expect(mockSuperwall.shared.register).not.toHaveBeenCalled();
    });

    it('should work on iOS', async () => {
      Platform.OS = 'ios';

      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.register).toHaveBeenCalled();
      });
    });

    it('should work on Android', async () => {
      Platform.OS = 'android';

      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.register).toHaveBeenCalled();
      });
    });
  });

  describe('Paywall Presentation', () => {
    it('should register placement with correct ID', async () => {
      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.register).toHaveBeenCalledWith('campaign_1');
      });
    });

    it('should handle presentation failure', async () => {
      mockSuperwall.shared.register.mockRejectedValue(new Error('Presentation failed'));

      const { getByText } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText(/failed to load superwall/i)).toBeTruthy();
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle purchase completion', async () => {
      const onPurchaseComplete = jest.fn();

      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={onPurchaseComplete}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.delegate.didPurchase).toBeDefined();
      });

      // Simulate purchase
      if (mockSuperwall.shared.delegate.didPurchase) {
        mockSuperwall.shared.delegate.didPurchase();
      }

      expect(onPurchaseComplete).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('superwall_purchase_success', {
        placement: 'campaign_1',
      });
    });

    it('should handle dismissal', async () => {
      const onDismiss = jest.fn();

      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onDismiss={onDismiss}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.delegate.paywallWillDismiss).toBeDefined();
      });

      // Simulate dismissal
      if (mockSuperwall.shared.delegate.paywallWillDismiss) {
        mockSuperwall.shared.delegate.paywallWillDismiss();
      }

      expect(onDismiss).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith('superwall_paywall_dismissed', {
        placement: 'campaign_1',
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while SDK loads', () => {
      mockSuperwall.shared.register.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByText } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      expect(getByText(/loading superwall paywall/i)).toBeTruthy();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track paywall display', async () => {
      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('superwall_paywall_displayed', {
          placement: 'campaign_1',
          platform: expect.any(String),
        });
      });
    });

    it('should track purchase success', async () => {
      const { } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.delegate.didPurchase).toBeDefined();
      });

      // Trigger purchase
      if (mockSuperwall.shared.delegate.didPurchase) {
        mockSuperwall.shared.delegate.didPurchase();
      }

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('superwall_purchase_success', {
          placement: 'campaign_1',
        });
      });
    });

    it('should track dismissal', async () => {
      render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onDismiss={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSuperwall.shared.delegate.paywallWillDismiss).toBeDefined();
      });

      // Trigger dismissal
      if (mockSuperwall.shared.delegate.paywallWillDismiss) {
        mockSuperwall.shared.delegate.paywallWillDismiss();
      }

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('superwall_paywall_dismissed', {
          placement: 'campaign_1',
        });
      });
    });
  });

  describe('Dev Build Requirements', () => {
    it('should show note about requiring custom dev build on error', async () => {
      mockSuperwall.shared.register.mockRejectedValue(new Error('Not available'));

      const { getByText } = render(
        <SuperwallPaywallUI
          remoteConfig={mockConfig}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText(/requires a custom dev build/i)).toBeTruthy();
      });
    });
  });
});
