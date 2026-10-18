/**
 * Color Constants
 * Feature: IOS-THEME-002
 *
 * Centralized color definitions for light mode, dark mode, and brand colors.
 * This file provides a comprehensive color system that can be customized for your brand.
 *
 * Customization Guide:
 * - Brand colors: Update these to match your brand identity
 * - Light/Dark colors: Adjust for your preferred theme aesthetics
 * - All colors use hex format for consistency
 *
 * @module constants/colors
 */

/**
 * Color palette interface for theme colors
 * Used by both LightColors and DarkColors
 */
export interface ColorPalette {
  /** Main background color for screens */
  background: string;
  /** Foreground/surface color for cards and elevated surfaces */
  foreground: string;
  /** Primary text color */
  text: string;
  /** Secondary text color (less emphasis) */
  textSecondary: string;
  /** Tertiary text color (least emphasis, hints) */
  textTertiary: string;
  /** Border color for inputs and dividers */
  border: string;
  /** Separator/divider line color */
  separator: string;
  /** Shadow color */
  shadow: string;
  /** Card background color */
  card: string;
}

/**
 * Brand color interface
 * Theme-independent brand colors used throughout the app
 */
export interface BrandColorPalette {
  /** Primary brand color (main CTA, important actions) */
  primary: string;
  /** Secondary brand color (alternative actions) */
  secondary: string;
  /** Accent color (highlights, special features) */
  accent: string;
  /** Success state color */
  success: string;
  /** Warning state color */
  warning: string;
  /** Error/danger state color */
  error: string;
  /** Info/neutral state color */
  info: string;
}

/**
 * Brand Colors
 * Theme-independent colors that represent your brand identity.
 *
 * 🔧 CUSTOMIZE THESE to match your brand!
 *
 * Current colors are iOS defaults (blue theme).
 * Replace with your own brand colors.
 */
export const BrandColors: BrandColorPalette = {
  // Primary brand color - used for main actions, CTAs, active states
  primary: '#007AFF', // iOS blue

  // Secondary brand color - used for alternative actions
  secondary: '#5856D6', // iOS purple

  // Accent color - used for highlights, special features
  accent: '#FF9500', // iOS orange

  // Semantic state colors
  success: '#34C759', // Green
  warning: '#FF9500', // Orange
  error: '#FF3B30', // Red
  info: '#007AFF', // Blue
};

/**
 * Light Mode Colors
 * Color palette for light theme.
 *
 * 🔧 CUSTOMIZE THESE to adjust your light theme appearance.
 *
 * These colors provide good contrast and readability in light mode.
 */
export const LightColors: ColorPalette = {
  // Backgrounds
  background: '#FFFFFF', // Pure white for main background
  foreground: '#F2F2F7', // Light gray for cards and surfaces
  card: '#FFFFFF', // White cards on gray background

  // Text colors (dark on light background)
  text: '#000000', // Black for primary text
  textSecondary: '#3C3C43', // Dark gray for secondary text (60% opacity)
  textTertiary: '#8E8E93', // Medium gray for tertiary text/hints

  // Borders and separators
  border: '#C6C6C8', // Light gray borders
  separator: '#E5E5EA', // Very light gray separators
  shadow: '#000000', // Black shadow (opacity applied in styles)
};

/**
 * Dark Mode Colors
 * Color palette for dark theme.
 *
 * 🔧 CUSTOMIZE THESE to adjust your dark theme appearance.
 *
 * These colors provide good contrast and readability in dark mode,
 * following iOS dark mode guidelines.
 */
export const DarkColors: ColorPalette = {
  // Backgrounds
  background: '#000000', // Pure black for main background (true black for OLED)
  foreground: '#1C1C1E', // Dark gray for cards and surfaces
  card: '#2C2C2E', // Slightly lighter gray for cards

  // Text colors (light on dark background)
  text: '#FFFFFF', // White for primary text
  textSecondary: '#EBEBF5', // Light gray for secondary text (60% opacity)
  textTertiary: '#8E8E93', // Medium gray for tertiary text/hints

  // Borders and separators
  border: '#38383A', // Dark gray borders
  separator: '#2C2C2E', // Very dark gray separators
  shadow: '#000000', // Black shadow (opacity applied in styles)
};

/**
 * Unified Colors Export
 * Main export that combines all color palettes.
 *
 * Usage with theme context:
 * ```tsx
 * import { Colors } from '@/constants/colors';
 * import { useTheme } from '@/providers/ThemeProvider';
 *
 * function MyComponent() {
 *   const { colorScheme } = useTheme();
 *   const colors = Colors[colorScheme];
 *
 *   return (
 *     <View style={{ backgroundColor: colors.background }}>
 *       <Text style={{ color: colors.text }}>Hello</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export const Colors = {
  light: LightColors,
  dark: DarkColors,
  brand: BrandColors,
} as const;

/**
 * Type helper for color scheme
 */
export type ColorScheme = 'light' | 'dark';

/**
 * Helper function to get colors for current theme
 * @param scheme - The color scheme ('light' or 'dark')
 * @returns The color palette for the specified scheme
 */
export function getColors(scheme: ColorScheme): ColorPalette {
  return Colors[scheme];
}

/**
 * Helper function to get themed color with fallback
 * @param scheme - The color scheme ('light' or 'dark')
 * @param key - The color key from the palette
 * @returns The color value for the specified key
 */
export function getColor(scheme: ColorScheme, key: keyof ColorPalette): string {
  return Colors[scheme][key];
}
