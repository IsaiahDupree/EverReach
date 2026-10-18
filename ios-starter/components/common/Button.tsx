/**
 * Button Component
 * Feature: IOS-COMP-001
 *
 * A themed button component with multiple variants and loading states.
 * Provides consistent styling across the app with primary, secondary, and ghost variants.
 *
 * Features:
 * - Three variants: primary, secondary, ghost
 * - Loading state with spinner
 * - Disabled state
 * - Press handling
 * - Accessibility support
 *
 * @module components/common/Button
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Button Component Props
 */
export interface ButtonProps extends TouchableOpacityProps {
  /**
   * Button variant style
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Whether the button is in loading state
   * Shows a spinner and disables interaction
   * @default false
   */
  loading?: boolean;

  /**
   * Button text or custom content
   */
  children: React.ReactNode;
}

/**
 * Button Component
 *
 * A versatile button component with multiple styling variants and loading state support.
 * Automatically handles disabled states during loading.
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button onPress={handleSubmit}>Submit</Button>
 *
 * // Secondary button
 * <Button variant="secondary" onPress={handleCancel}>Cancel</Button>
 *
 * // Ghost button
 * <Button variant="ghost" onPress={handleBack}>Back</Button>
 *
 * // Loading button
 * <Button loading onPress={handleSubmit}>Submitting...</Button>
 * ```
 */
export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  style,
  testID,
  onPress,
  ...props
}: ButtonProps) {
  // Button is disabled if explicitly disabled or loading
  const isDisabled = disabled || loading;

  /**
   * Get button container styles based on variant and state
   */
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const variantStyle = {
      primary: styles.primaryButton,
      secondary: styles.secondaryButton,
      ghost: styles.ghostButton,
    }[variant];

    const disabledStyle = isDisabled ? styles.buttonDisabled : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...disabledStyle,
      ...(style as ViewStyle),
    };
  };

  /**
   * Get button text styles based on variant and state
   */
  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.buttonText;
    const variantStyle = {
      primary: styles.primaryButtonText,
      secondary: styles.secondaryButtonText,
      ghost: styles.ghostButtonText,
    }[variant];

    return {
      ...baseStyle,
      ...variantStyle,
    };
  };

  /**
   * Get spinner color based on variant
   */
  const getSpinnerColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return '#007AFF';
      case 'ghost':
        return '#007AFF';
      default:
        return '#fff';
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={getSpinnerColor()}
          size="small"
          testID={testID ? `${testID}-loading` : 'button-loading'}
        />
      ) : (
        <Text style={getTextStyle()}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base button styles
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  // Primary variant (filled, brand color)
  primaryButton: {
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },

  // Secondary variant (outlined)
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },

  // Ghost variant (text only)
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },

  // Disabled state
  buttonDisabled: {
    opacity: 0.5,
  },

  // Base text styles
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Primary variant text
  primaryButtonText: {
    color: '#fff',
  },

  // Secondary variant text
  secondaryButtonText: {
    color: '#007AFF',
  },

  // Ghost variant text
  ghostButtonText: {
    color: '#007AFF',
  },
});
