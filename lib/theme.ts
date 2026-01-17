/**
 * Centralized Theme System
 * 
 * Creates a complete theme object with colors, spacing, typography, and shadows.
 * Replaces hardcoded values throughout the app.
 */

import { WARMTH_COLORS } from './warmthColors';
import { SPACING, FONT_SIZE, LINE_HEIGHT } from '@/constants/spacing';

export const createTheme = (isDark: boolean) => ({
  colors: {
    // Base colors
    background: isDark ? '#1a1a1a' : '#FFFFFF',
    surface: isDark ? '#2a2a2a' : '#F5F5F5',
    surfaceElevated: isDark ? '#3a3a3a' : '#FFFFFF',
    border: isDark ? '#3a3a3a' : '#E0E0E0',
    borderLight: isDark ? '#2a2a2a' : '#F0F0F0',
    
    // Text colors
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#B0B0B0' : '#666666',
    textTertiary: isDark ? '#808080' : '#999999',
    textInverse: isDark ? '#000000' : '#FFFFFF',
    
    // Brand colors
    primary: '#4ECDC4',
    primaryDark: '#3DBDB4',
    primaryLight: '#6FD9D2',
    secondary: '#95E1D3',
    accent: '#FFD93D',
    
    // Semantic colors
    success: '#4CAF50',
    successLight: '#81C784',
    warning: '#FFD93D',
    warningLight: '#FFE57F',
    error: '#FF6B6B',
    errorLight: '#FF8A8A',
    info: '#2196F3',
    infoLight: '#64B5F6',
    
    // Warmth colors (from existing system)
    warmth: WARMTH_COLORS,
    
    // Interactive states
    hover: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    pressed: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    disabled: isDark ? '#4a4a4a' : '#E0E0E0',
    disabledText: isDark ? '#666666' : '#999999',
    
    // Status colors
    online: '#4CAF50',
    offline: '#666666',
    away: '#FFD93D',
    busy: '#FF6B6B',
    
    // Special
    overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    modalBackground: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  
  spacing: SPACING,
  fontSize: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
  
  // Border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Shadows
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.5 : 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.6 : 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
  },
  
  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    toast: 1600,
    tooltip: 1700,
  },
  
  // Opacity values
  opacity: {
    disabled: 0.5,
    hover: 0.8,
    pressed: 0.6,
  },
  
  // Animation durations (ms)
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
});

export type Theme = ReturnType<typeof createTheme>;

// Helper to get theme-aware color
export const getThemedColor = (
  theme: Theme,
  lightColor: string,
  darkColor: string
): string => {
  // Check if theme is dark by checking background color
  return theme.colors.background === '#1a1a1a' ? darkColor : lightColor;
};

// Helper to create card style with theme
export const createCardStyle = (theme: Theme) => ({
  backgroundColor: theme.colors.surfaceElevated,
  borderRadius: theme.radius.md,
  padding: theme.spacing.base,
  ...theme.shadow.small,
});

// Helper to create button style with theme
export const createButtonStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'outline' = 'primary') => {
  const base = {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: theme.spacing.minTouchTargetAndroid,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };
  
  switch (variant) {
    case 'primary':
      return {
        ...base,
        backgroundColor: theme.colors.primary,
      };
    case 'secondary':
      return {
        ...base,
        backgroundColor: theme.colors.secondary,
      };
    case 'outline':
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    default:
      return base;
  }
};
