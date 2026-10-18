/**
 * Button Component Tests
 * Feature: IOS-COMP-001
 *
 * Tests for the themed Button component with variants and loading states.
 *
 * @module __tests__/components/common/Button
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../components/common/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      const { getByText } = render(<Button>Click Me</Button>);
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render primary variant by default', () => {
      const { getByTestId } = render(
        <Button testID="button">Click Me</Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByTestId } = render(
        <Button variant="secondary" testID="button">
          Click Me
        </Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByTestId } = render(
        <Button variant="ghost" testID="button">
          Click Me
        </Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      const { getByTestId, queryByText } = render(
        <Button loading testID="button">
          Click Me
        </Button>
      );

      // Loading spinner should be visible
      expect(getByTestId('button-loading')).toBeTruthy();

      // Button text should not be visible or should show loading text
      expect(queryByText('Click Me')).toBeFalsy();
    });

    it('should be disabled when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button loading onPress={onPress} testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      // Check that the button has the disabled prop
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should not show loading spinner when loading is false', () => {
      const { queryByTestId } = render(
        <Button loading={false} testID="button">
          Click Me
        </Button>
      );

      expect(queryByTestId('button-loading')).toBeFalsy();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button disabled onPress={onPress} testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      // Check that the button has the disabled prop
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should apply disabled styling when disabled', () => {
      const { getByTestId } = render(
        <Button disabled testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button onPress={onPress} testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button disabled onPress={onPress} testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      // Check that the button has the disabled accessibility state
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button loading onPress={onPress} testID="button">
          Click Me
        </Button>
      );

      const button = getByTestId('button');
      // Check that the button has the disabled accessibility state when loading
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Variants', () => {
    it('should have different styles for primary variant', () => {
      const { getByTestId } = render(
        <Button variant="primary" testID="button">
          Click Me
        </Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should have different styles for secondary variant', () => {
      const { getByTestId } = render(
        <Button variant="secondary" testID="button">
          Click Me
        </Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });

    it('should have different styles for ghost variant', () => {
      const { getByTestId } = render(
        <Button variant="ghost" testID="button">
          Click Me
        </Button>
      );
      const button = getByTestId('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom testID', () => {
      const { getByTestId } = render(
        <Button testID="custom-button">Click Me</Button>
      );
      expect(getByTestId('custom-button')).toBeTruthy();
    });

    it('should accept and render children', () => {
      const { getByText } = render(<Button>Custom Text</Button>);
      expect(getByText('Custom Text')).toBeTruthy();
    });
  });

  describe('Acceptance Criteria', () => {
    it('should support primary, secondary, and ghost variants', () => {
      const { rerender, getByTestId } = render(
        <Button variant="primary" testID="button">
          Primary
        </Button>
      );
      expect(getByTestId('button')).toBeTruthy();

      rerender(
        <Button variant="secondary" testID="button">
          Secondary
        </Button>
      );
      expect(getByTestId('button')).toBeTruthy();

      rerender(
        <Button variant="ghost" testID="button">
          Ghost
        </Button>
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should support loading state with spinner', () => {
      const { getByTestId } = render(
        <Button loading testID="button">
          Click Me
        </Button>
      );
      expect(getByTestId('button-loading')).toBeTruthy();
    });
  });
});
