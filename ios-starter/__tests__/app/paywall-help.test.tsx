/**
 * Paywall Help Integration Tests
 * Feature: HO-HELP-003
 *
 * Tests for help button and overlay integration on the Paywall screen
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
}));

// Mock RevenueCat SDK
jest.mock('react-native-purchases', () => {
  const mockPurchasePackage = jest.fn();
  const mockRestorePurchases = jest.fn();
  const mockGetOfferings = jest.fn().mockResolvedValue({
    current: null,
    all: {},
  });

  return {
    __esModule: true,
    default: {
      purchasePackage: mockPurchasePackage,
      restorePurchases: mockRestorePurchases,
      getOfferings: mockGetOfferings,
    },
    purchasePackage: mockPurchasePackage,
    restorePurchases: mockRestorePurchases,
    getOfferings: mockGetOfferings,
  };
});

// Mock the paywall screen - will be imported after implementation
let PaywallScreen: React.ComponentType;

describe('Paywall Screen - Help Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should display help button on the Paywall screen', async () => {
    // This test will fail until we add the help button
    // Import the component
    PaywallScreen = require('../../app/paywall').default;

    const { getByTestId } = render(<PaywallScreen />);

    // Look for the help button with testID
    await waitFor(() => {
      expect(getByTestId('paywall-help-button')).toBeTruthy();
    });
  });

  it('should show HelpOverlay when help button is pressed', async () => {
    PaywallScreen = require('../../app/paywall').default;

    const { getByTestId, findByTestId } = render(<PaywallScreen />);

    // Find and press the help button
    const helpButton = await findByTestId('paywall-help-button');
    helpButton.props.onPress();

    // Check that HelpOverlay appears
    await waitFor(() => {
      expect(getByTestId('help-overlay-modal')).toBeTruthy();
    });
  });

  it('should display subscription help content in the overlay', async () => {
    PaywallScreen = require('../../app/paywall').default;

    const { getByText, findByTestId } = render(<PaywallScreen />);

    // Press help button
    const helpButton = await findByTestId('paywall-help-button');
    helpButton.props.onPress();

    // Verify help content is displayed
    await waitFor(() => {
      expect(getByText(/subscription/i)).toBeTruthy();
    });
  });

  it('should dismiss overlay and persist dismissal state', async () => {
    PaywallScreen = require('../../app/paywall').default;

    const { getByTestId, findByTestId, queryByTestId } = render(<PaywallScreen />);

    // Open help overlay
    const helpButton = await findByTestId('paywall-help-button');
    helpButton.props.onPress();

    // Wait for overlay to appear
    await waitFor(() => {
      expect(getByTestId('help-overlay-modal')).toBeTruthy();
    });

    // Dismiss overlay
    const dismissButton = getByTestId('help-overlay-dismiss');
    dismissButton.props.onPress();

    // Verify overlay is dismissed
    await waitFor(() => {
      expect(queryByTestId('help-overlay-modal')).toBeNull();
    });

    // Verify dismissal was saved
    const dismissalKey = 'help_overlay_dismissed_paywall-help';
    const dismissed = await AsyncStorage.getItem(dismissalKey);
    expect(dismissed).toBe('true');
  });

  it('should not show overlay on subsequent renders if dismissed', async () => {
    // Pre-set dismissal state
    const dismissalKey = 'help_overlay_dismissed_paywall-help';
    await AsyncStorage.setItem(dismissalKey, 'true');

    PaywallScreen = require('../../app/paywall').default;

    const { queryByTestId } = render(<PaywallScreen />);

    // Overlay should not appear automatically
    await waitFor(() => {
      expect(queryByTestId('help-overlay-modal')).toBeNull();
    });
  });

  it('should have proper accessibility labels on help button', async () => {
    PaywallScreen = require('../../app/paywall').default;

    const { getByTestId } = render(<PaywallScreen />);

    const helpButton = await waitFor(() => getByTestId('paywall-help-button'));

    expect(helpButton.props.accessibilityLabel).toBeTruthy();
    expect(helpButton.props.accessibilityRole).toBe('button');
  });
});
