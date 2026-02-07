/**
 * Card Component
 * Feature: IOS-COMP-003
 *
 * A container component with shadow, border radius, and padding.
 * Provides a consistent card-style container across the app.
 *
 * Features:
 * - Shadow styling for depth
 * - Border radius for rounded corners
 * - Consistent padding
 * - Customizable via style prop
 * - Accessibility support
 *
 * @module components/common/Card
 */

import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';

/**
 * Card Component Props
 */
export interface CardProps extends ViewProps {
  /**
   * Card content
   */
  children: React.ReactNode;

  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * Card Component
 *
 * A versatile card container with shadow, border radius, and padding.
 * Uses platform-specific shadow styling (shadowColor/shadowOffset/shadowOpacity/shadowRadius for iOS,
 * elevation for Android) to create depth.
 *
 * @example
 * ```tsx
 * // Basic card
 * <Card>
 *   <Text>Card Content</Text>
 * </Card>
 *
 * // Card with custom styling
 * <Card style={{ backgroundColor: '#f0f0f0', marginVertical: 10 }}>
 *   <Text>Custom Card</Text>
 * </Card>
 *
 * // Card with multiple children
 * <Card>
 *   <Text>Title</Text>
 *   <Text>Description</Text>
 *   <Button>Action</Button>
 * </Card>
 * ```
 */
export default function Card({
  children,
  style,
  testID,
  ...props
}: CardProps) {
  /**
   * Merge custom styles with base card styles
   */
  const cardStyle: ViewStyle = {
    ...styles.card,
    ...(style as ViewStyle),
  };

  return (
    <View
      style={cardStyle}
      testID={testID}
      accessible={true}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Padding
    padding: 16,

    // Border radius
    borderRadius: 12,

    // Background color
    backgroundColor: '#fff',

    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,

    // Android Shadow
    elevation: 3,
  },
});
