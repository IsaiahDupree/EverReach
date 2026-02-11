import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/lib/analytics');
jest.mock('@/providers/SubscriptionProvider', () => ({
  useSubscription: jest.fn(() => ({
    isPaid: false,
    subscriptionStatus: 'free',
    refreshEntitlements: jest.fn(),
    restorePurchases: jest.fn(),
  })),
}));

// Mock expo-superwall hooks used by SuperwallPaywallNew
const mockRegisterPlacement = jest.fn();
const mockSetSubscriptionStatus = jest.fn().mockResolvedValue(undefined);
const mockIdentify = jest.fn();

jest.mock('expo-superwall', () => ({
  usePlacement: jest.fn(() => ({
    registerPlacement: mockRegisterPlacement,
    state: { status: 'idle' },
  })),
  useUser: jest.fn(() => ({
    user: { appUserId: 'test-user' },
    subscriptionStatus: null,
    identify: mockIdentify,
    setSubscriptionStatus: mockSetSubscriptionStatus,
  })),
  useSuperwallEvents: jest.fn(),
}));

import SuperwallPaywallNew from '@/components/paywall/SuperwallPaywallNew';

describe('SuperwallPaywallNew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockRegisterPlacement.mockResolvedValue(undefined);
    mockSetSubscriptionStatus.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('should render with default placementId', () => {
      const { getByText } = render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      // Should show loading/idle state with default placement
      expect(getByText(/main_pay_wall/i)).toBeTruthy();
    });

    it('should render with custom placementId', () => {
      const { getByText } = render(
        <SuperwallPaywallNew
          placementId="custom_placement"
          onPurchaseComplete={jest.fn()}
        />
      );

      expect(getByText(/custom_placement/i)).toBeTruthy();
    });

    it('should show loading state initially', () => {
      const { getByText } = render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      // Idle state shows loading indicator
      expect(getByText(/Loading Superwall paywall|Setting up subscription/i)).toBeTruthy();
    });
  });

  describe('Subscription Status Setup', () => {
    it('should set subscription status to INACTIVE for free users', async () => {
      render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      await waitFor(() => {
        expect(mockSetSubscriptionStatus).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'INACTIVE' })
        );
      });
    });

    it('should set subscription status to INACTIVE when forceShow is true', async () => {
      render(
        <SuperwallPaywallNew
          forceShow={true}
          onPurchaseComplete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(mockSetSubscriptionStatus).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'INACTIVE' })
        );
      });
    });
  });

  describe('Props', () => {
    it('should accept onDismiss callback', () => {
      const onDismiss = jest.fn();
      // Should not throw
      render(
        <SuperwallPaywallNew
          onDismiss={onDismiss}
          onPurchaseComplete={jest.fn()}
        />
      );
    });

    it('should accept autoShow prop', () => {
      // Should not throw
      render(
        <SuperwallPaywallNew
          autoShow={true}
          onPurchaseComplete={jest.fn()}
        />
      );
    });

    it('should accept forceShow prop', () => {
      // Should not throw
      render(
        <SuperwallPaywallNew
          forceShow={true}
          onPurchaseComplete={jest.fn()}
        />
      );
    });
  });

  describe('expo-superwall Integration', () => {
    it('should call usePlacement hook', () => {
      const { usePlacement } = require('expo-superwall');

      render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      expect(usePlacement).toHaveBeenCalled();
    });

    it('should call useUser hook', () => {
      const { useUser } = require('expo-superwall');

      render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      expect(useUser).toHaveBeenCalled();
    });

    it('should call useSuperwallEvents hook', () => {
      const { useSuperwallEvents } = require('expo-superwall');

      render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      expect(useSuperwallEvents).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription status setup failure gracefully', async () => {
      mockSetSubscriptionStatus.mockRejectedValueOnce(new Error('Status setup failed'));

      // Should not throw
      render(
        <SuperwallPaywallNew onPurchaseComplete={jest.fn()} />
      );

      // Component should still render (marks as ready even on error)
      await waitFor(() => {
        expect(mockSetSubscriptionStatus).toHaveBeenCalled();
      });
    });
  });
});
