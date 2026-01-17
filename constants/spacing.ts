/**
 * Standardized Spacing System
 * 
 * Consistent spacing values across the mobile app
 * Based on 4px base unit
 */

export const SPACING = {
  // Base units
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Common patterns
  cardPadding: 16,
  sectionGap: 24,
  screenPadding: 16,
  listItemGap: 12,
  
  // Touch targets
  minTouchTarget: 44, // iOS minimum
  minTouchTargetAndroid: 48, // Android minimum
  
  // Safe areas
  safeAreaPaddingSmall: 16,
  safeAreaPaddingLarge: 24,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export type Spacing = typeof SPACING;
export type LineHeight = typeof LINE_HEIGHT;
export type FontSize = typeof FONT_SIZE;
