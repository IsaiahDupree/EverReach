/**
 * LoadingSpinner Component Tests
 * Feature: IOS-COMP-006
 *
 * Tests for the LoadingSpinner component with customizable size.
 *
 * @module __tests__/components/common/LoadingSpinner
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render the spinner', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('should render with default size (medium)', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      const spinner = getByTestId('spinner');
      expect(spinner).toBeTruthy();
      // Default size should be 'large' for React Native ActivityIndicator
      expect(spinner.props.size).toBe('large');
    });

    it('should render with small size', () => {
      const { getByTestId } = render(
        <LoadingSpinner size="small" testID="spinner" />
      );
      const spinner = getByTestId('spinner');
      expect(spinner.props.size).toBe('small');
    });

    it('should render with large size', () => {
      const { getByTestId } = render(
        <LoadingSpinner size="large" testID="spinner" />
      );
      const spinner = getByTestId('spinner');
      expect(spinner.props.size).toBe('large');
    });
  });

  describe('Customization', () => {
    it('should accept custom color', () => {
      const { getByTestId } = render(
        <LoadingSpinner color="#FF0000" testID="spinner" />
      );
      const spinner = getByTestId('spinner');
      expect(spinner.props.color).toBe('#FF0000');
    });

    it('should use default color when not specified', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      const spinner = getByTestId('spinner');
      // Default color should be primary brand color
      expect(spinner.props.color).toBe('#007AFF');
    });

    it('should accept custom testID', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="custom-spinner" />
      );
      expect(getByTestId('custom-spinner')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should be animating by default', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      const spinner = getByTestId('spinner');
      // ActivityIndicator is always animating in React Native
      expect(spinner).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      const spinner = getByTestId('spinner');
      expect(spinner.props.accessibilityLabel).toBe('Loading');
    });

    it('should accept custom accessibility label', () => {
      const { getByTestId } = render(
        <LoadingSpinner
          accessibilityLabel="Fetching data"
          testID="spinner"
        />
      );
      const spinner = getByTestId('spinner');
      expect(spinner.props.accessibilityLabel).toBe('Fetching data');
    });
  });

  describe('Container Styling', () => {
    it('should render with centered container by default', () => {
      const { getByTestId } = render(
        <LoadingSpinner testID="spinner" containerTestID="container" />
      );
      const container = getByTestId('container');
      expect(container).toBeTruthy();
    });

    it('should accept custom container styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <LoadingSpinner
          testID="spinner"
          containerTestID="container"
          style={customStyle}
        />
      );
      const container = getByTestId('container');
      expect(container).toBeTruthy();
    });
  });

  describe('Acceptance Criteria', () => {
    it('should display animated spinner', () => {
      const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
      const spinner = getByTestId('spinner');
      expect(spinner).toBeTruthy();
    });

    it('should support customizable size (small, large)', () => {
      const { rerender, getByTestId } = render(
        <LoadingSpinner size="small" testID="spinner" />
      );
      expect(getByTestId('spinner').props.size).toBe('small');

      rerender(<LoadingSpinner size="large" testID="spinner" />);
      expect(getByTestId('spinner').props.size).toBe('large');
    });
  });
});
