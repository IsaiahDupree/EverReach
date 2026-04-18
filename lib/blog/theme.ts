/**
 * Blog Theme
 * Premium reading-optimized design tokens.
 * Warm off-white background, charcoal text, EverReach purple accent.
 */

export const blogTheme = {
  colors: {
    // Backgrounds
    pageBg: '#FAFAF8',
    surfaceBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    codeBg: '#F4F4F5',
    answerBg: '#F5F0FF',
    heroOverlay: '#0A0A0F',

    // Text
    heading: '#1A1A2E',
    body: '#2D2D3F',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',

    // Brand
    primary: '#7C3AED',
    primaryLight: '#EDE9FE',
    primaryDark: '#5B21B6',
    accent: '#FBBF24',
    accentLight: '#FEF3C7',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#E5E7EB',

    // Semantic
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Category accents
    categoryPersonalCrm: '#7C3AED',
    categoryFriendships: '#EC4899',
    categoryNetworking: '#3B82F6',
    categoryFollowUp: '#10B981',
    categorySocialCapital: '#F59E0B',
    categoryFounders: '#6366F1',
  },

  typography: {
    // Fonts (system stack optimized for readability)
    headingFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    bodyFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    monoFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',

    // Sizes
    heroTitle: 42,
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 17,
    body: 17,
    small: 14,
    caption: 12,
    tag: 11,

    // Weights
    bold: '700' as const,
    semibold: '600' as const,
    medium: '500' as const,
    regular: '400' as const,

    // Line heights
    headingLineHeight: 1.3,
    bodyLineHeight: 1.7,
    tightLineHeight: 1.4,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 64,
  },

  layout: {
    maxContentWidth: 740,
    maxPageWidth: 1200,
    sidebarWidth: 260,
    headerHeight: 56,
    borderRadius: 12,
    cardRadius: 16,
    tagRadius: 6,
  },

  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    cardHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    header: '0 1px 3px rgba(0,0,0,0.05)',
  },
} as const;

export type BlogTheme = typeof blogTheme;
