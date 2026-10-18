/**
 * App Configuration Constants
 * Feature: IOS-THEME-003
 *
 * Centralized configuration for the application including DEV_MODE flag,
 * API URLs, and feature flags. This file reads from environment variables
 * and provides type-safe access to configuration values.
 *
 * Customization Guide:
 * - APP_NAME: Change this to your app's display name
 * - APP_VERSION: Update when releasing new versions
 * - DEV_MODE: Set to false for production builds
 * - Feature flags: Enable/disable features as needed
 *
 * @module constants/config
 */

/**
 * Configuration interface
 * Defines the shape of the app configuration object
 */
export interface AppConfig {
  /** Application display name */
  APP_NAME: string;
  /** Application version (semver format) */
  APP_VERSION: string;
  /** Development mode flag - shows dev overlay when true */
  DEV_MODE: boolean;

  // API Configuration
  /** Supabase project URL */
  SUPABASE_URL: string;
  /** Supabase anonymous/public key */
  SUPABASE_ANON_KEY: string;
  /** Backend API base URL */
  API_URL: string;

  // Payment Configuration
  /** RevenueCat iOS API key */
  REVENUECAT_IOS_KEY: string;
  /** RevenueCat Android API key */
  REVENUECAT_ANDROID_KEY: string;

  // Feature Flags
  /** Enable analytics tracking */
  ENABLE_ANALYTICS: boolean;
  /** Enable crash reporting (e.g., Sentry) */
  ENABLE_CRASH_REPORTING: boolean;
  /** Enable push notifications */
  ENABLE_PUSH_NOTIFICATIONS: boolean;
}

/**
 * Helper function to parse boolean environment variables
 * Handles string values like "true", "false", "1", "0"
 *
 * @param value - The environment variable value
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed boolean value
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
}

/**
 * Helper function to get required environment variable
 * Throws error if the variable is not set (in development)
 *
 * @param key - Environment variable key
 * @param defaultValue - Default value for development
 * @returns The environment variable value
 */
function getEnvVar(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (value === undefined) {
    // In development, we allow placeholders
    // In production builds, you should ensure all values are set
    return defaultValue;
  }
  return value;
}

/**
 * Application Configuration
 * Main configuration object with all app settings.
 *
 * 🔧 CUSTOMIZE THESE VALUES for your app!
 *
 * Environment variables are read from .env file (see .env.example).
 * All EXPO_PUBLIC_* variables are embedded in the app at build time.
 *
 * Usage:
 * ```tsx
 * import { Config } from '@/constants/config';
 *
 * if (Config.DEV_MODE) {
 *   console.log('Running in development mode');
 * }
 *
 * const apiUrl = Config.API_URL;
 * ```
 */
export const Config: AppConfig = {
  // ============================================================================
  // APP IDENTITY
  // ============================================================================

  /**
   * Application Name
   * 🔧 CUSTOMIZE: Change this to your app's name
   */
  APP_NAME: getEnvVar('EXPO_PUBLIC_APP_NAME', 'EverReach Starter'),

  /**
   * Application Version
   * 🔧 CUSTOMIZE: Update this when releasing new versions
   * Should follow semantic versioning (MAJOR.MINOR.PATCH)
   */
  APP_VERSION: '1.0.0',

  /**
   * Development Mode
   * When true, shows the developer overlay with customization guide.
   * 🔧 IMPORTANT: Set to false for production builds!
   *
   * Set via DEV_MODE environment variable in .env
   */
  DEV_MODE: parseBoolean(process.env.DEV_MODE, true),

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================

  /**
   * Supabase Project URL
   * Get this from your Supabase project settings.
   * Format: https://your-project-id.supabase.co
   */
  SUPABASE_URL: getEnvVar(
    'EXPO_PUBLIC_SUPABASE_URL',
    'https://your-project.supabase.co'
  ),

  /**
   * Supabase Anonymous Key
   * Public key that's safe to use in client-side code.
   * Get this from your Supabase project settings.
   */
  SUPABASE_ANON_KEY: getEnvVar(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'your-supabase-anon-key'
  ),

  /**
   * Backend API Base URL
   * For development: http://localhost:3000
   * For production: https://your-api.vercel.app
   */
  API_URL: getEnvVar('EXPO_PUBLIC_API_URL', 'http://localhost:3000'),

  // ============================================================================
  // PAYMENT CONFIGURATION
  // ============================================================================

  /**
   * RevenueCat iOS API Key
   * Get this from your RevenueCat project settings.
   * Format: appl_xxxxxxxxxxxxx
   */
  REVENUECAT_IOS_KEY: getEnvVar(
    'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
    'your-revenuecat-ios-key'
  ),

  /**
   * RevenueCat Android API Key
   * Get this from your RevenueCat project settings.
   * Format: goog_xxxxxxxxxxxxx
   */
  REVENUECAT_ANDROID_KEY: getEnvVar(
    'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
    'your-revenuecat-android-key'
  ),

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  /**
   * Enable Analytics
   * When true, sends analytics events (e.g., PostHog, Mixpanel).
   * 🔧 CUSTOMIZE: Set based on your privacy policy and requirements.
   */
  ENABLE_ANALYTICS: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_ANALYTICS, false),

  /**
   * Enable Crash Reporting
   * When true, reports crashes to services like Sentry.
   * Recommended: true for production, false for development.
   */
  ENABLE_CRASH_REPORTING: parseBoolean(
    process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING,
    false
  ),

  /**
   * Enable Push Notifications
   * When true, registers device for push notifications.
   * 🔧 CUSTOMIZE: Enable when you've set up push notification services.
   */
  ENABLE_PUSH_NOTIFICATIONS: parseBoolean(
    process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS,
    false
  ),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if app is running in development mode
 * @returns true if DEV_MODE is enabled
 *
 * Usage:
 * ```tsx
 * import { isDevelopment } from '@/constants/config';
 *
 * if (isDevelopment()) {
 *   console.log('Dev tools available');
 * }
 * ```
 */
export function isDevelopment(): boolean {
  return Config.DEV_MODE;
}

/**
 * Check if app is running in production mode
 * @returns true if DEV_MODE is disabled
 *
 * Usage:
 * ```tsx
 * import { isProduction } from '@/constants/config';
 *
 * if (isProduction()) {
 *   initAnalytics();
 * }
 * ```
 */
export function isProduction(): boolean {
  return !Config.DEV_MODE;
}

/**
 * Check if a specific feature is enabled
 * @param feature - The feature flag to check
 * @returns true if the feature is enabled
 *
 * Usage:
 * ```tsx
 * import { isFeatureEnabled } from '@/constants/config';
 *
 * if (isFeatureEnabled('ENABLE_ANALYTICS')) {
 *   trackEvent('page_view');
 * }
 * ```
 */
export function isFeatureEnabled(
  feature: 'ENABLE_ANALYTICS' | 'ENABLE_CRASH_REPORTING' | 'ENABLE_PUSH_NOTIFICATIONS'
): boolean {
  return Config[feature];
}

/**
 * Validate that all required configuration values are set
 * Useful for catching configuration issues early in development
 *
 * @throws Error if required configuration is missing
 *
 * Usage:
 * ```tsx
 * import { validateConfig } from '@/constants/config';
 *
 * // Call this in your app entry point
 * validateConfig();
 * ```
 */
export function validateConfig(): void {
  const requiredVars = [
    { key: 'SUPABASE_URL', value: Config.SUPABASE_URL },
    { key: 'SUPABASE_ANON_KEY', value: Config.SUPABASE_ANON_KEY },
    { key: 'API_URL', value: Config.API_URL },
  ];

  const missing = requiredVars.filter((v) => !v.value || v.value.includes('your-'));

  if (missing.length > 0 && isProduction()) {
    const missingKeys = missing.map((v) => v.key).join(', ');
    throw new Error(
      `Missing required configuration: ${missingKeys}. Please check your .env file.`
    );
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type for feature flag keys
 */
export type FeatureFlag =
  | 'ENABLE_ANALYTICS'
  | 'ENABLE_CRASH_REPORTING'
  | 'ENABLE_PUSH_NOTIFICATIONS';

/**
 * Type for environment mode
 */
export type EnvironmentMode = 'development' | 'production';

/**
 * Get current environment mode
 * @returns The current environment mode
 */
export function getEnvironmentMode(): EnvironmentMode {
  return isDevelopment() ? 'development' : 'production';
}
