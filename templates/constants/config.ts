/**
 * PulseLense - Configuration Constants
 *
 * All secrets are loaded from environment variables.
 * Never hardcode API keys or credentials in this file.
 */

export const APP_CONFIG = {
  // ============================================
  // APP IDENTITY
  // ============================================
  APP_NAME: 'PulseLense',
  APP_SLUG: 'pulselense',
  APP_VERSION: '1.0.0',

  // ============================================
  // DEV MODE - Set to false for production builds
  // ============================================
  DEV_MODE: process.env.EXPO_PUBLIC_DEV_MODE === 'true',

  // ============================================
  // FEATURE FLAGS
  // ============================================
  FEATURES: {
    AUTHENTICATION: true,
    SUBSCRIPTIONS: true,
    PUSH_NOTIFICATIONS: true,
    ANALYTICS: true,
    REAL_TIME_UPDATES: true,
    ALERT_NOTIFICATIONS: true,
    SOCIAL_LOGIN_GOOGLE: true,
    SOCIAL_LOGIN_APPLE: true,
  },

  // ============================================
  // SUBSCRIPTION TIERS
  // ============================================
  SUBSCRIPTION: {
    FREE_TIER_LIMITS: {
      dashboards: 1,
      metrics_per_dashboard: 5,
      alerts: 3,
    },
    PRO_TIER_LIMITS: {
      dashboards: 20,
      metrics_per_dashboard: 50,
      alerts: 100,
    },
    PRO_PRICE_MONTHLY: 9.99,
    PRO_PRICE_YEARLY: 79.99,
  },

  // ============================================
  // API ENDPOINTS — loaded from env vars
  // ============================================
  API: {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? '',
    TIMEOUT: 10000,
  },

  // ============================================
  // REAL-TIME CONFIG
  // ============================================
  REALTIME: {
    METRIC_POLL_INTERVAL_MS: 30000,   // 30 seconds
    ALERT_CHECK_INTERVAL_MS: 60000,   // 1 minute
  },
} as const;

/**
 * Required environment variables — create a .env file with:
 *
 * EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * EXPO_PUBLIC_API_URL=https://api.pulselense.com
 * EXPO_PUBLIC_REVENUECAT_KEY=appl_...
 * EXPO_PUBLIC_DEV_MODE=false
 */
