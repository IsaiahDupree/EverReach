/**
 * Input Component
 * Feature: IOS-COMP-002
 *
 * A themed text input component with validation, labels, and icon support.
 * Provides consistent styling across the app with error states and accessibility.
 *
 * Features:
 * - Label support with optional indicator
 * - Error state with validation message
 * - Left and right icon support
 * - Disabled state
 * - Multiline support
 * - Accessibility support
 *
 * @module components/common/Input
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';

/**
 * Input Component Props
 */
export interface InputProps extends TextInputProps {
  /**
   * Label text displayed above the input
   */
  label?: string;

  /**
   * Error message to display below the input
   * When provided, applies error styling to the input
   */
  error?: string;

  /**
   * Icon to display on the left side of the input
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display on the right side of the input
   */
  rightIcon?: React.ReactNode;

  /**
   * Whether the field is optional (shows "(optional)" next to label)
   * @default false
   */
  optional?: boolean;

  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;

  /**
   * Custom input style
   */
  inputStyle?: TextStyle;
}

/**
 * Input Component
 *
 * A versatile text input component with label, error state, and icon support.
 * Automatically handles error styling and accessibility.
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input placeholder="Enter email" />
 *
 * // Input with label
 * <Input label="Email Address" placeholder="Enter email" />
 *
 * // Input with error
 * <Input
 *   label="Email"
 *   placeholder="Enter email"
 *   error="Email is required"
 * />
 *
 * // Input with icons
 * <Input
 *   placeholder="Search"
 *   leftIcon={<SearchIcon />}
 *   rightIcon={<ClearIcon />}
 * />
 *
 * // Password input
 * <Input
 *   label="Password"
 *   placeholder="Enter password"
 *   secureTextEntry
 *   rightIcon={<EyeIcon />}
 * />
 * ```
 */
export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  optional = false,
  containerStyle,
  inputStyle,
  style,
  testID,
  editable = true,
  multiline = false,
  ...props
}: InputProps) {
  /**
   * Get container styles based on state
   */
  const getContainerStyle = (): ViewStyle => {
    const baseStyle = styles.inputContainer;
    const errorStyle = error ? styles.inputContainerError : {};
    const disabledStyle = !editable ? styles.inputContainerDisabled : {};

    return {
      ...baseStyle,
      ...errorStyle,
      ...disabledStyle,
    };
  };

  /**
   * Get input text styles based on state
   */
  const getInputStyle = (): TextStyle => {
    const baseStyle = styles.input;
    const disabledStyle = !editable ? styles.inputDisabled : {};
    const multilineStyle = multiline ? styles.inputMultiline : {};

    return {
      ...baseStyle,
      ...multilineStyle,
      ...disabledStyle,
      ...(inputStyle as TextStyle),
      ...(style as TextStyle),
    };
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {optional && <Text style={styles.optional}> (optional)</Text>}
          </Text>
        </View>
      )}

      {/* Input Container */}
      <View style={getContainerStyle()} testID={testID ? `${testID}-container` : 'input-container'}>
        {/* Left Icon */}
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        {/* Text Input */}
        <TextInput
          style={getInputStyle()}
          editable={editable}
          multiline={multiline}
          placeholderTextColor="#999"
          testID={testID}
          accessible={true}
          accessibilityLabel={label || props.placeholder}
          accessibilityState={{
            disabled: !editable,
          }}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>

      {/* Error Message */}
      {error && (
        <Text
          style={styles.errorText}
          testID={testID ? `${testID}-error` : 'input-error'}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Main container
  container: {
    marginBottom: 16,
  },

  // Label container
  labelContainer: {
    marginBottom: 8,
  },

  // Label text
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Optional indicator
  optional: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
  },

  // Input container (border, background)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },

  // Input container in error state
  inputContainerError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },

  // Input container when disabled
  inputContainerDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },

  // Text input
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },

  // Multiline input
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },

  // Disabled input text
  inputDisabled: {
    color: '#999',
  },

  // Left icon container
  leftIconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Right icon container
  rightIconContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error message text
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
    marginLeft: 4,
  },
});
