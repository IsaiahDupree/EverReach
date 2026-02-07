/**
 * Tooltip Component Tests
 * Feature: HO-HELP-001
 *
 * Tests for the reusable Tooltip component with dismissible functionality
 * and persisted state.
 *
 * @module __tests__/components/common/Tooltip
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tooltip from '../../../components/common/Tooltip';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Tooltip Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('should render tooltip with content', async () => {
      const { getByText } = render(
        <Tooltip id="test-tooltip" content="This is a helpful tooltip">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByText('This is a helpful tooltip')).toBeTruthy();
      });
    });

    it('should render children', async () => {
      const { getByText } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <Text>Child Content</Text>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByText('Child Content')).toBeTruthy();
      });
    });

    it('should not render if previously dismissed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { queryByText } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(queryByText('Help text')).toBeFalsy();
      });
    });
  });

  describe('Dismissal', () => {
    it('should have a dismiss button', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByTestId('tooltip-dismiss')).toBeTruthy();
      });
    });

    it('should hide tooltip when dismissed', async () => {
      const { getByTestId, queryByText } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(queryByText('Help text')).toBeTruthy();
      });

      const dismissButton = getByTestId('tooltip-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(queryByText('Help text')).toBeFalsy();
      });
    });

    it('should persist dismissal to AsyncStorage', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByTestId('tooltip-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('tooltip-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'tooltip_dismissed_test-tooltip',
          'true'
        );
      });
    });

    it('should call onDismiss callback when dismissed', async () => {
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text" onDismiss={onDismiss}>
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByTestId('tooltip-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('tooltip-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Positioning', () => {
    it('should support top position', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text" position="top">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        const tooltip = getByTestId('tooltip-container');
        expect(tooltip).toBeTruthy();
      });
    });

    it('should support bottom position (default)', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        const tooltip = getByTestId('tooltip-container');
        expect(tooltip).toBeTruthy();
      });
    });

    it('should support left position', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text" position="left">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        const tooltip = getByTestId('tooltip-container');
        expect(tooltip).toBeTruthy();
      });
    });

    it('should support right position', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text" position="right">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        const tooltip = getByTestId('tooltip-container');
        expect(tooltip).toBeTruthy();
      });
    });
  });

  describe('Acceptance Criteria', () => {
    it('should be a reusable component', async () => {
      const { rerender, getByText } = render(
        <Tooltip id="tooltip-1" content="First tooltip">
          <Text>Content</Text>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByText('First tooltip')).toBeTruthy();
      });

      rerender(
        <Tooltip id="tooltip-2" content="Second tooltip">
          <Text>Content</Text>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByText('Second tooltip')).toBeTruthy();
      });
    });

    it('should be dismissible', async () => {
      const { getByTestId, queryByText } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(queryByText('Help text')).toBeTruthy();
      });

      const dismissButton = getByTestId('tooltip-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(queryByText('Help text')).toBeFalsy();
      });
    });

    it('should persist dismissal state', async () => {
      const { getByTestId } = render(
        <Tooltip id="test-tooltip" content="Help text">
          <></>
        </Tooltip>
      );

      await waitFor(() => {
        expect(getByTestId('tooltip-dismiss')).toBeTruthy();
      });

      const dismissButton = getByTestId('tooltip-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'tooltip_dismissed_test-tooltip',
          'true'
        );
      });
    });
  });
});
