/**
 * Tests for DevModeOverlay component
 *
 * Acceptance criteria:
 * - Shows customization checklist
 * - Toggleable (can open and close)
 * - File paths listed
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DevModeOverlay } from '@/components/dev/DevModeOverlay';

describe('DevModeOverlay', () => {
  describe('Floating Button', () => {
    it('should render floating dev button', () => {
      const { getByLabelText } = render(<DevModeOverlay />);
      const button = getByLabelText('Open dev mode overlay');
      expect(button).toBeTruthy();
    });

    it('should show DEV badge on floating button', () => {
      const { getByText } = render(<DevModeOverlay />);
      expect(getByText('DEV')).toBeTruthy();
    });

    it('should open modal when floating button is pressed', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);
      const button = getByLabelText('Open dev mode overlay');

      fireEvent.press(button);

      expect(getByText('🛠️ APP-KIT Dev Mode')).toBeTruthy();
      expect(getByText('Customization Checklist')).toBeTruthy();
    });
  });

  describe('Customization Checklist Modal', () => {
    it('should display customization items', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Check for key customization items
      expect(getByText('App Name & Branding')).toBeTruthy();
      expect(getByText('Color Theme')).toBeTruthy();
      expect(getByText('Business Logic - Data Models')).toBeTruthy();
    });

    it('should display file paths for each customization item', () => {
      const { getByLabelText, getAllByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Check for file paths (some files appear multiple times)
      expect(getAllByText('constants/config.ts').length).toBeGreaterThan(0);
      expect(getAllByText('constants/colors.ts').length).toBeGreaterThan(0);
      expect(getAllByText('types/models.ts').length).toBeGreaterThan(0);
    });

    it('should close modal when X button is pressed', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));
      expect(getByText('🛠️ APP-KIT Dev Mode')).toBeTruthy();

      // Close modal
      const closeButton = getByLabelText('Close modal');
      fireEvent.press(closeButton);

      // Modal should be togglable - can be opened again
      fireEvent.press(getByLabelText('Open dev mode overlay'));
      expect(getByText('Customization Checklist')).toBeTruthy();
    });
  });

  describe('Detail View', () => {
    it('should show detail view when customization item is pressed', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Press on a customization item
      const item = getByText('App Name & Branding');
      fireEvent.press(item);

      // Should show detail view
      expect(getByText('Change APP_NAME, APP_SLUG, and update app.json with your app identity.')).toBeTruthy();
    });

    it('should display priority badge in detail view', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Press on a high priority item
      const item = getByText('App Name & Branding');
      fireEvent.press(item);

      // Should show priority
      expect(getByText('HIGH PRIORITY')).toBeTruthy();
    });

    it('should close detail view when X button is pressed', () => {
      const { getByLabelText, getByText, queryByText, getAllByLabelText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Open detail view
      const item = getByText('App Name & Branding');
      fireEvent.press(item);

      // Close detail view
      const closeButtons = getAllByLabelText('Close detail');
      fireEvent.press(closeButtons[0]);

      // Detail should be closed
      expect(queryByText('HIGH PRIORITY')).toBeNull();
    });
  });

  describe('Checklist Content', () => {
    it('should include at least 10 customization items', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Check for presence of items (spot check)
      expect(getByText('App Name & Branding')).toBeTruthy();
      expect(getByText('Color Theme')).toBeTruthy();
      expect(getByText('Business Logic - Data Models')).toBeTruthy();
      expect(getByText('Business Logic - API Calls')).toBeTruthy();
      expect(getByText('Business Logic - Main Screen')).toBeTruthy();
      expect(getByText('Subscription Tiers')).toBeTruthy();
      expect(getByText('Onboarding Screens')).toBeTruthy();
      expect(getByText('Settings Options')).toBeTruthy();
      expect(getByText('Push Notification Topics')).toBeTruthy();
      expect(getByText('Remove Dev Mode')).toBeTruthy();
    });

    it('should show footer with instructions to disable dev mode', () => {
      const { getByLabelText, getByText } = render(<DevModeOverlay />);

      // Open modal
      fireEvent.press(getByLabelText('Open dev mode overlay'));

      // Check footer message
      expect(getByText(/DEV_MODE: false/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(<DevModeOverlay />);

      expect(getByLabelText('Open dev mode overlay')).toBeTruthy();
    });
  });
});
