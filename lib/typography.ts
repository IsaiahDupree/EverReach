/**
 * Typography Utility
 * 
 * Centralized font and text styling system for consistent typography across the app.
 * Use these helpers instead of inline font styles to maintain design consistency.
 * 
 * @example
 * ```tsx
 * import { typography } from '@/lib/typography';
 * 
 * <Text style={typography.h1}>Page Title</Text>
 * <Text style={typography.body}>Regular text</Text>
 * <Text style={[typography.caption, { color: 'red' }]}>Small text</Text>
 * ```
 */

import { TextStyle } from 'react-native';
import { FONT_SIZE, LINE_HEIGHT } from '@/constants/spacing';

// ============================================================================
// Font Weights
// ============================================================================

export const FONT_WEIGHT = {
  thin: '100' as TextStyle['fontWeight'],
  extraLight: '200' as TextStyle['fontWeight'],
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
} as const;

// ============================================================================
// Typography Presets
// ============================================================================

/**
 * Pre-defined text styles for common use cases
 * Use these directly in your components for consistent typography
 */
export const typography = {
  // Headings
  h1: {
    fontSize: FONT_SIZE.xxxl,
    lineHeight: FONT_SIZE.xxxl * LINE_HEIGHT.tight,
    fontWeight: FONT_WEIGHT.bold,
  } as TextStyle,
  
  h2: {
    fontSize: FONT_SIZE.xxl,
    lineHeight: FONT_SIZE.xxl * LINE_HEIGHT.tight,
    fontWeight: FONT_WEIGHT.bold,
  } as TextStyle,
  
  h3: {
    fontSize: FONT_SIZE.xl,
    lineHeight: FONT_SIZE.xl * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.semiBold,
  } as TextStyle,
  
  h4: {
    fontSize: FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.semiBold,
  } as TextStyle,
  
  h5: {
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.semiBold,
  } as TextStyle,
  
  h6: {
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.semiBold,
  } as TextStyle,
  
  // Body text
  body: {
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.relaxed,
    fontWeight: FONT_WEIGHT.regular,
  } as TextStyle,
  
  bodyLarge: {
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.relaxed,
    fontWeight: FONT_WEIGHT.regular,
  } as TextStyle,
  
  bodySmall: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.relaxed,
    fontWeight: FONT_WEIGHT.regular,
  } as TextStyle,
  
  // Labels and captions
  label: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.medium,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    letterSpacing: 0.5,
  } as TextStyle,
  
  caption: {
    fontSize: FONT_SIZE.xs,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.regular,
  } as TextStyle,
  
  captionBold: {
    fontSize: FONT_SIZE.xs,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.semiBold,
  } as TextStyle,
  
  // Buttons
  button: {
    fontSize: FONT_SIZE.md,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.tight,
    fontWeight: FONT_WEIGHT.semiBold,
    textAlign: 'center' as TextStyle['textAlign'],
  } as TextStyle,
  
  buttonSmall: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.tight,
    fontWeight: FONT_WEIGHT.semiBold,
    textAlign: 'center' as TextStyle['textAlign'],
  } as TextStyle,
  
  buttonLarge: {
    fontSize: FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.tight,
    fontWeight: FONT_WEIGHT.semiBold,
    textAlign: 'center' as TextStyle['textAlign'],
  } as TextStyle,
  
  // Special
  link: {
    fontSize: FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    fontWeight: FONT_WEIGHT.medium,
    textDecorationLine: 'underline' as TextStyle['textDecorationLine'],
  } as TextStyle,
  
  code: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.relaxed,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: 'Courier' as TextStyle['fontFamily'],
  } as TextStyle,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a custom text style with specified size, weight, and line height
 * 
 * @example
 * const customStyle = createTextStyle(18, 'semiBold', 'relaxed');
 */
export const createTextStyle = (
  fontSize: number,
  fontWeight: keyof typeof FONT_WEIGHT = 'regular',
  lineHeight: keyof typeof LINE_HEIGHT = 'normal'
): TextStyle => ({
  fontSize,
  fontWeight: FONT_WEIGHT[fontWeight],
  lineHeight: fontSize * LINE_HEIGHT[lineHeight],
});

/**
 * Create a text style with custom line height multiplier
 * 
 * @example
 * const style = withLineHeight(typography.body, 1.8);
 */
export const withLineHeight = (
  baseStyle: TextStyle,
  multiplier: number
): TextStyle => ({
  ...baseStyle,
  lineHeight: (baseStyle.fontSize || FONT_SIZE.base) * multiplier,
});

/**
 * Create a text style with custom font weight
 * 
 * @example
 * const boldBody = withFontWeight(typography.body, 'bold');
 */
export const withFontWeight = (
  baseStyle: TextStyle,
  fontWeight: keyof typeof FONT_WEIGHT
): TextStyle => ({
  ...baseStyle,
  fontWeight: FONT_WEIGHT[fontWeight],
});

/**
 * Create a text style with custom letter spacing
 * 
 * @example
 * const spaced = withLetterSpacing(typography.label, 1.5);
 */
export const withLetterSpacing = (
  baseStyle: TextStyle,
  letterSpacing: number
): TextStyle => ({
  ...baseStyle,
  letterSpacing,
});

/**
 * Create theme-aware text color style
 * Useful when you need to override text color based on theme
 * 
 * @example
 * const style = withColor(typography.body, isDark ? '#FFF' : '#000');
 */
export const withColor = (
  baseStyle: TextStyle,
  color: string
): TextStyle => ({
  ...baseStyle,
  color,
});

/**
 * Combine multiple text styles
 * Helper to merge typography presets with custom styles
 * 
 * @example
 * const style = combineTextStyles(typography.body, { color: 'red', marginTop: 10 });
 */
export const combineTextStyles = (
  ...styles: (TextStyle | undefined | false | null)[]
): TextStyle => {
  return Object.assign({}, ...styles.filter(Boolean)) as TextStyle;
};

// ============================================================================
// Type Exports
// ============================================================================

export type TypographyPreset = keyof typeof typography;
export type FontWeight = keyof typeof FONT_WEIGHT;
export type LineHeightMultiplier = keyof typeof LINE_HEIGHT;
