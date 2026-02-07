/**
 * LoadingSpinner Component
 * Feature: IOS-COMP-006
 *
 * A loading indicator component with customizable size and color.
 * Provides a consistent loading experience across the app.
 *
 * Features:
 * - Customizable size (small, large)
 * - Customizable color
 * - Centered container by default
 * - Accessibility support
 *
 * @module components/common/LoadingSpinner
 */

import React from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';

/**
 * LoadingSpinner size types
 */
export type SpinnerSize = 'small' | 'large';

/**
 * LoadingSpinner Component Props
 */
export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'large'
   */
  size?: SpinnerSize;

  /**
   * Color of the spinner
   * @default '#007AFF' (primary brand color)
   */
  color?: string;

  /**
   * Custom container styles
   */
  style?: ViewStyle;

  /**
   * Test ID for the spinner
   */
  testID?: string;

  /**
   * Test ID for the container
   */
  containerTestID?: string;

  /**
   * Accessibility label for screen readers
   * @default 'Loading'
   */
  accessibilityLabel?: string;
}

/**
 * LoadingSpinner Component
 *
 * A reusable loading spinner component that wraps React Native's ActivityIndicator
 * with consistent styling and default values across the app.
 *
 * @example
 * ```tsx
 * // Default spinner
 * <LoadingSpinner />
 *
 * // Small spinner
 * <LoadingSpinner size="small" />
 *
 * // Custom color
 * <LoadingSpinner color="#FF0000" />
 *
 * // Custom accessibility label
 * <LoadingSpinner accessibilityLabel="Fetching data" />
 * ```
 */
export default function LoadingSpinner({
  size = 'large',
  color = '#007AFF',
  style,
  testID,
  containerTestID,
  accessibilityLabel = 'Loading',
}: LoadingSpinnerProps) {
  return (
    <View
      style={[styles.container, style]}
      testID={containerTestID}
      accessible={false} // The ActivityIndicator itself handles accessibility
    >
      <ActivityIndicator
        size={size}
        color={color}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessible={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
