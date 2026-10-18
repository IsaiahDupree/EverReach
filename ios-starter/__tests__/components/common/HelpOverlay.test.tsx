/**
 * HelpOverlay Component Tests
 * Feature: HO-HELP-001
 *
 * Tests for the reusable HelpOverlay component for first-time feature use
 * with dismissible functionality and persisted state.
 *
 * @module __tests__/components/common/HelpOverlay
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HelpOverlay from '../../../components/common/HelpOverlay';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('HelpOverlay Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('should render overlay with title and content', async () => {
      const { getByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="This is a help overlay"
        />
      );

      await waitFor(() => {
        expect(getByText('Welcome!')).toBeTruthy();
        expect(getByText('This is a help overlay')).toBeTruthy();
      });
    });

    it('should render with custom content component', async () => {
      const { getByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
        >
          <Text>Custom help content</Text>
        </HelpOverlay>
      );

      await waitFor(() => {
        expect(getByText('Welcome!')).toBeTruthy();
        expect(getByText('Custom help content')).toBeTruthy();
      });
    });

    it('should not render if previously dismissed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { queryByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeFalsy();
        expect(queryByText('Help text')).toBeFalsy();
      });
    });

    it('should render as modal overlay', async () => {
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-modal')).toBeTruthy();
      });
    });
  });

  describe('Dismissal', () => {
    it('should have a dismiss/close button', async () => {
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-dismiss')).toBeTruthy();
      });
    });

    it('should hide overlay when dismissed', async () => {
      const { getByTestId, queryByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeTruthy();
      });

      const dismissButton = getByTestId('help-overlay-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeFalsy();
      });
    });

    it('should persist dismissal to AsyncStorage', async () => {
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('help-overlay-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'help_overlay_dismissed_test-overlay',
          'true'
        );
      });
    });

    it('should call onDismiss callback when dismissed', async () => {
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
          onDismiss={onDismiss}
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('help-overlay-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      });
    });

    it('should support "Got it" button text', async () => {
      const { getByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
          dismissText="Got it"
        />
      );

      await waitFor(() => {
        expect(getByText('Got it')).toBeTruthy();
      });
    });
  });

  describe('Backdrop Dismissal', () => {
    it('should dismiss when backdrop is tapped', async () => {
      const { getByTestId, queryByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeTruthy();
      });

      const backdrop = getByTestId('help-overlay-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeFalsy();
      });
    });

    it('should persist dismissal when backdrop is tapped', async () => {
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-backdrop')).toBeTruthy();
      });

      const backdrop = getByTestId('help-overlay-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'help_overlay_dismissed_test-overlay',
          'true'
        );
      });
    });
  });

  describe('Acceptance Criteria', () => {
    it('should be a reusable component', async () => {
      const { rerender, getByText } = render(
        <HelpOverlay
          id="overlay-1"
          title="First Overlay"
          content="First content"
        />
      );

      await waitFor(() => {
        expect(getByText('First Overlay')).toBeTruthy();
      });

      rerender(
        <HelpOverlay
          id="overlay-2"
          title="Second Overlay"
          content="Second content"
        />
      );

      await waitFor(() => {
        expect(getByText('Second Overlay')).toBeTruthy();
      });
    });

    it('should be dismissible with button', async () => {
      const { getByTestId, queryByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeTruthy();
      });

      const dismissButton = getByTestId('help-overlay-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeFalsy();
      });
    });

    it('should be dismissible with backdrop', async () => {
      const { getByTestId, queryByText } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeTruthy();
      });

      const backdrop = getByTestId('help-overlay-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(queryByText('Welcome!')).toBeFalsy();
      });
    });

    it('should persist dismissal state', async () => {
      const { getByTestId } = render(
        <HelpOverlay
          id="test-overlay"
          title="Welcome!"
          content="Help text"
        />
      );

      await waitFor(() => {
        expect(getByTestId('help-overlay-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('help-overlay-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'help_overlay_dismissed_test-overlay',
          'true'
        );
      });
    });
  });
});
