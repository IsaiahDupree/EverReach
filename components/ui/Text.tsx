/**
 * Standardized Text Component
 * 
 * Replaces all raw Text components with consistent typography,
 * automatic theme colors, and proper line heights.
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { FONT_SIZE, LINE_HEIGHT } from '@/constants/spacing';
import { useAppSettings } from '@/providers/AppSettingsProvider';

type TextVariant = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'error' | 'success' | 'warning' | 'info';

interface TextComponentProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor | string;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: 'tight' | 'normal' | 'relaxed';
}

export function Text({ 
  variant = 'base', 
  weight = 'normal', 
  color,
  align = 'left',
  lineHeight: lineHeightType = 'normal',
  style, 
  ...props 
}: TextComponentProps) {
  const { theme } = useAppSettings();
  
  const fontSize = FONT_SIZE[variant];
  const lineHeight = fontSize * LINE_HEIGHT[lineHeightType];
  
  const fontWeight = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }[weight];
  
  // Resolve color
  let textColor: string;
  if (color) {
    // Check if it's a theme color key
    switch (color) {
      case 'primary':
        textColor = theme.colors.text;
        break;
      case 'secondary':
        textColor = theme.colors.textSecondary;
        break;
      case 'tertiary':
        textColor = theme.colors.textTertiary;
        break;
      case 'inverse':
        textColor = theme.colors.textInverse;
        break;
      case 'error':
        textColor = theme.colors.error;
        break;
      case 'success':
        textColor = theme.colors.success;
        break;
      case 'warning':
        textColor = theme.colors.warning;
        break;
      case 'info':
        textColor = theme.colors.info;
        break;
      default:
        // Custom color string
        textColor = color;
    }
  } else {
    // Default to primary text color
    textColor = theme.colors.text;
  }
  
  return (
    <RNText
      style={[
        styles.base,
        {
          fontSize,
          lineHeight,
          fontWeight,
          color: textColor,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Base text styles if needed
  },
});

// Convenience components for common text types
export function Heading({ variant = 'xxl', weight = 'bold', ...props }: TextComponentProps) {
  return <Text variant={variant} weight={weight} {...props} />;
}

export function Body({ variant = 'base', ...props }: TextComponentProps) {
  return <Text variant={variant} {...props} />;
}

export function Caption({ variant = 'sm', color = 'secondary', ...props }: TextComponentProps) {
  return <Text variant={variant} color={color} {...props} />;
}

export function Label({ variant = 'sm', weight = 'medium', ...props }: TextComponentProps) {
  return <Text variant={variant} weight={weight} {...props} />;
}
