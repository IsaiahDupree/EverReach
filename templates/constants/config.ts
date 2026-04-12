/**
 * SunTrace - Configuration Constants
 *
 * All secrets are loaded from environment variables.
 * Never hardcode API keys or credentials in this file.
 */

export const APP_CONFIG = {
  // ============================================
  // APP IDENTITY
  // ============================================
  APP_NAME: 'SunTrace',
  APP_SLUG: 'suntrace',
  APP_VERSION: '1.0.0',

  // ============================================
  // DEV MODE - Set to false for production builds
  // ============================================
  DEV_MODE: process.env.EXPO_PUBLIC_DEV_MODE === 'true',
  SHOW_DEV_SETTINGS: process.env.EXPO_PUBLIC_DEV_MODE === 'true',

  // ============================================
  // FEATURE FLAGS
  // ============================================
  FEATURES: {
    AUTHENTICATION: true,
    SUBSCRIPTIONS: true,
    PUSH_NOTIFICATIONS: true,
    HEALTH_KIT: true,
    LOCATION: true,
    AI_COACH: true,
    SUN_MAP: true,
    FORECAST: true,
    BADGES: true,
    STREAKS: true,
  },

  // ============================================
  // SUBSCRIPTION TIERS
  // ============================================
  SUBSCRIPTION: {
    FREE_TIER_LIMITS: {
      coach_messages_per_day: 20,
      forecast_days: 1,
      spots_submit: false,
    },
    PRO_TIER_LIMITS: {
      coach_messages_per_day: 100,
      forecast_days: 7,
      spots_submit: true,
    },
    PRO_PRICE_MONTHLY: 3.99,
    PRO_PRICE_YEARLY: 29.99,
    FAMILY_PRICE_MONTHLY: 6.99,
  },

  // ============================================
  // API ENDPOINTS — loaded from env vars
  // ============================================
  API: {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? '',
    OPEN_METEO_BASE: 'https://api.open-meteo.com/v1',
    TIMEOUT: 10000,
  },

  // ============================================
  // UV INDEX THRESHOLDS (WHO standard)
  // ============================================
  UV: {
    LOW_MAX: 2,
    MODERATE_MAX: 5,
    HIGH_MAX: 7,
    VERY_HIGH_MAX: 10,
    // Above 10 is extreme
  },

  // ============================================
  // VITAMIN D SYNTHESIS PARAMETERS
  // Formula: uvIndex * skinTypeFactor * BASE_IU_PER_MINUTE
  // ============================================
  VITAMIN_D: {
    SKIN_TYPE_FACTORS: [1.0, 0.9, 0.75, 0.6, 0.4, 0.25], // skin types 1-6 (index 0 = type 1)
    BASE_IU_PER_MINUTE: 40,
    DAILY_TARGET_IU: 1000, // target IU from sun (not supplements)
  },

  // ============================================
  // FORECAST CACHE + DEFAULTS
  // ============================================
  FORECAST: {
    CACHE_MINUTES: 15,
    DEFAULT_HOURS: 24,
  },

  // ============================================
  // STREAK RESET HOUR (local time)
  // ============================================
  STREAK: {
    RESET_HOUR: 3, // 3 AM — reset streak if no session by this hour next day
  },
} as const;

/**
 * Required environment variables — create a .env file with:
 *
 * EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * EXPO_PUBLIC_API_URL=https://api.suntrace.app
 * EXPO_PUBLIC_REVENUECAT_KEY=appl_...
 * EXPO_PUBLIC_DEV_MODE=false
 */
