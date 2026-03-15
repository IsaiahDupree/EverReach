/**
 * APP-KIT: Configuration Constants
 * 
 * 🔧 CUSTOMIZE ALL VALUES IN THIS FILE
 * This is the main configuration file for your app.
 */

export const APP_CONFIG = {
  // ============================================
  // 🔧 APP IDENTITY - Change these first!
  // ============================================
  APP_NAME: 'Your App Name',           // TODO: Replace with your app name
  APP_SLUG: 'your-app-name',           // TODO: URL-friendly version
  APP_VERSION: '1.0.0',
  
  // ============================================
  // 🔧 DEV MODE - Set to false for production
  // ============================================
  DEV_MODE: true,  // Shows in-app customization hints
  
  // ============================================
  // 🔧 FEATURE FLAGS - Enable/disable features
  // ============================================
  FEATURES: {
    AUTHENTICATION: true,
    SUBSCRIPTIONS: true,
    PUSH_NOTIFICATIONS: true,
    ANALYTICS: true,
    VOICE_NOTES: false,        // TODO: Enable if needed
    SOCIAL_LOGIN_GOOGLE: true,
    SOCIAL_LOGIN_APPLE: true,
  },
  
  // ============================================
  // 🔧 SUBSCRIPTION TIERS - Define your pricing
  // ============================================
  SUBSCRIPTION: {
    FREE_TIER_LIMITS: {
      items: 10,                // TODO: Set your free tier limit
      features: ['basic'],
    },
    PRO_PRICE_MONTHLY: 9.99,   // TODO: Set your price
    PRO_PRICE_YEARLY: 99.99,
  },
  
  // ============================================
  // 🔧 API ENDPOINTS - Your backend URLs
  // ============================================
  API: {
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.yourapp.com',
    TIMEOUT: 10000,
  },
};

/**
 * APP-KIT: Environment Variables Required
 * 
 * Create a .env file with these variables:
 * 
 * EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 * EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 * EXPO_PUBLIC_API_URL=https://api.yourapp.com
 */
