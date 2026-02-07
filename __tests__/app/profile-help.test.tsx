/**
 * Profile Help Integration Tests
 * Feature: HO-HELP-003
 *
 * Tests for help button and overlay integration on the Profile screen
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

// Mock expo-image-picker
jest.mock('expo-image-picker', () => {
  return {
    __esModule: true,
    requestMediaLibraryPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    launchImageLibraryAsync: jest.fn(() =>
      Promise.resolve({
        cancelled: false,
        assets: [{ uri: 'test-image-uri' }],
      })
    ),
    MediaTypeOptions: {
      Images: 'Images',
    },
  };
}, { virtual: true });

// Mock useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      user_metadata: {
        display_name: 'Test User',
        avatar_url: null,
      },
    },
    loading: false,
  }),
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'test-url' } })),
      })),
    },
  },
}));

// Mock the profile screen - will be imported after implementation
let ProfileScreen: React.ComponentType;

describe('Profile Screen - Help Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should display help button on the Profile screen', async () => {
    // This test will fail until we add the help button
    ProfileScreen = require('../../app/profile').default;

    const { getByTestId } = render(<ProfileScreen />);

    // Look for the help button with testID
    await waitFor(() => {
      expect(getByTestId('profile-help-button')).toBeTruthy();
    });
  });

  it('should show HelpOverlay when help button is pressed', async () => {
    ProfileScreen = require('../../app/profile').default;

    const { getByTestId, findByTestId } = render(<ProfileScreen />);

    // Find and press the help button
    const helpButton = await findByTestId('profile-help-button');
    helpButton.props.onPress();

    // Check that HelpOverlay appears
    await waitFor(() => {
      expect(getByTestId('help-overlay-modal')).toBeTruthy();
    });
  });

  it('should display profile help content in the overlay', async () => {
    ProfileScreen = require('../../app/profile').default;

    const { getByText, findByTestId } = render(<ProfileScreen />);

    // Press help button
    const helpButton = await findByTestId('profile-help-button');
    helpButton.props.onPress();

    // Verify help content is displayed
    await waitFor(() => {
      expect(getByText(/profile/i)).toBeTruthy();
    });
  });

  it('should dismiss overlay and persist dismissal state', async () => {
    ProfileScreen = require('../../app/profile').default;

    const { getByTestId, findByTestId, queryByTestId } = render(<ProfileScreen />);

    // Open help overlay
    const helpButton = await findByTestId('profile-help-button');
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
    const dismissalKey = 'help_overlay_dismissed_profile-help';
    const dismissed = await AsyncStorage.getItem(dismissalKey);
    expect(dismissed).toBe('true');
  });

  it('should not show overlay on subsequent renders if dismissed', async () => {
    // Pre-set dismissal state
    const dismissalKey = 'help_overlay_dismissed_profile-help';
    await AsyncStorage.setItem(dismissalKey, 'true');

    ProfileScreen = require('../../app/profile').default;

    const { queryByTestId } = render(<ProfileScreen />);

    // Overlay should not appear automatically
    await waitFor(() => {
      expect(queryByTestId('help-overlay-modal')).toBeNull();
    });
  });

  it('should have proper accessibility labels on help button', async () => {
    ProfileScreen = require('../../app/profile').default;

    const { getByTestId } = render(<ProfileScreen />);

    const helpButton = await waitFor(() => getByTestId('profile-help-button'));

    expect(helpButton.props.accessibilityLabel).toBeTruthy();
    expect(helpButton.props.accessibilityRole).toBe('button');
  });
});
