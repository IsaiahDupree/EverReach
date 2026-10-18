import { FitzpatrickType } from '@/types/suntrace';

export const SUNTRACE_COLORS = {
  // UV index colors
  uvLow: '#22c55e',
  uvModerate: '#eab308',
  uvHigh: '#f97316',
  uvVeryHigh: '#ef4444',
  uvExtreme: '#7c3aed',

  // Brand colors
  primary: '#F59E0B', // amber/sun
  primaryDark: '#D97706',
  secondary: '#3B82F6', // sky blue
  accent: '#10B981', // emerald

  // Background
  bgDark: '#0F172A',
  bgCard: '#1E293B',
  bgCardLight: '#F8FAFC',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textDark: '#1E293B',

  // Burn risk
  burnLow: '#22c55e',
  burnModerate: '#eab308',
  burnHigh: '#f97316',
  burnVeryHigh: '#ef4444',
};

export const SUNTRACE_CONFIG = {
  // UV forecast cache TTL in minutes
  FORECAST_CACHE_TTL: 15,

  // Coach message limits
  FREE_COACH_MESSAGES_PER_DAY: 20,
  PRO_COACH_MESSAGES_PER_DAY: 100,

  // Session
  MIN_SESSION_MINUTES: 1,
  MAX_SESSION_MINUTES: 180,

  // RevenueCat
  PRO_ENTITLEMENT: 'pro',
  FAMILY_ENTITLEMENT: 'family',

  // Badge check trigger
  BADGE_CHECK_ON_SESSION_COMPLETE: true,

  // Streak grace period (hours)
  STREAK_GRACE_HOURS: 36,
};

// Fitzpatrick scale display names for onboarding
export const SKIN_TYPE_LABELS: Record<FitzpatrickType, string> = {
  1: 'Type I',
  2: 'Type II',
  3: 'Type III',
  4: 'Type IV',
  5: 'Type V',
  6: 'Type VI',
};

// Navigation routes
export const ROUTES = {
  onboarding: '/onboarding-suntrace',
  home: '/(tabs)/sun-home',
  session: '/session',
  forecast: '/(tabs)/forecast',
  logbook: '/(tabs)/logbook',
  map: '/(tabs)/sun-map',
  coach: '/(tabs)/coach',
  profile: '/(tabs)/profile',
  settings: '/settings/sun-settings',
  paywall: '/sun-paywall',
} as const;
