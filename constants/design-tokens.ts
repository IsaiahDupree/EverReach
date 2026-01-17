export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const lightColors = {
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',
  
  secondary: '#5856D6',
  secondaryLight: '#AF52DE',
  secondaryDark: '#3634A3',
  
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  backgroundTertiary: '#E5E5EA',
  
  surface: '#FFFFFF',
  surfaceSecondary: '#F9F9FB',
  surfaceTertiary: '#F2F2F7',
  
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textDisabled: '#C7C7CC',
  
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  borderDark: '#8E8E93',
  
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  
  warmth: {
    hot: '#FF6B6B',
    warm: '#FFB366',
    cool: '#4ECDC4',
    cold: '#95A5A6',
  },
  
  status: {
    online: '#34C759',
    offline: '#8E8E93',
    away: '#FF9500',
    busy: '#FF3B30',
  },
} as const;

export const darkColors = {
  primary: '#0A84FF',
  primaryLight: '#64D2FF',
  primaryDark: '#0051D5',
  
  secondary: '#5E5CE6',
  secondaryLight: '#BF5AF2',
  secondaryDark: '#3634A3',
  
  success: '#32D74B',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
  
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  backgroundTertiary: '#2C2C2E',
  
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  surfaceTertiary: '#3A3A3C',
  
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textDisabled: '#48484A',
  
  border: '#38383A',
  borderLight: '#48484A',
  borderDark: '#2C2C2E',
  
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  
  warmth: {
    hot: '#FF6B6B',
    warm: '#FFB366',
    cool: '#4ECDC4',
    cold: '#95A5A6',
  },
  
  status: {
    online: '#32D74B',
    offline: '#8E8E93',
    away: '#FF9F0A',
    busy: '#FF453A',
  },
} as const;

export const highContrastLightColors = {
  ...lightColors,
  text: '#000000',
  textSecondary: '#1C1C1E',
  border: '#000000',
  primary: '#0051D5',
} as const;

export const highContrastDarkColors = {
  ...darkColors,
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  border: '#FFFFFF',
  primary: '#64D2FF',
} as const;

export type ColorPalette = typeof lightColors;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Typography = typeof typography;
export type Shadows = typeof shadows;
