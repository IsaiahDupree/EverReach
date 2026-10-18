/**
 * Development & Debug Configuration
 * 
 * Controls visibility of developer-only features and debug information.
 * Set environment variables to enable/disable features in different builds.
 */

/**
 * Master switch for all development features
 * Defaults to true in __DEV__ mode, false in production
 */
export const DEV_FEATURES_ENABLED = 
  process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true' || __DEV__;

/**
 * Show debug information sections
 * Examples: subscription debug info, API response logs, state dumps
 */
export const SHOW_DEBUG_INFO = 
  process.env.EXPO_PUBLIC_SHOW_DEBUG_INFO === 'true' || 
  (DEV_FEATURES_ENABLED && process.env.EXPO_PUBLIC_SHOW_DEBUG_INFO !== 'false');

/**
 * Show developer settings and controls
 * Examples: test warmth modes, override subscription, force refresh buttons
 */
export const SHOW_DEV_SETTINGS = 
  process.env.EXPO_PUBLIC_SHOW_DEV_SETTINGS === 'true' || 
  (DEV_FEATURES_ENABLED && process.env.EXPO_PUBLIC_SHOW_DEV_SETTINGS !== 'false');

/**
 * Enable detailed console logging
 * Includes API calls, state changes, analytics events
 */
export const ENABLE_DEBUG_LOGGING = 
  process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGGING === 'true' || 
  (DEV_FEATURES_ENABLED && process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGGING !== 'false');

/**
 * Show refresh/reload buttons in production
 * Useful for beta testing or when debugging production issues
 */
export const SHOW_REFRESH_BUTTONS = 
  process.env.EXPO_PUBLIC_SHOW_REFRESH_BUTTONS === 'true' || 
  SHOW_DEV_SETTINGS;

/**
 * Enable experimental features
 * Features still in development that shouldn't appear in production
 */
export const ENABLE_EXPERIMENTAL_FEATURES = 
  process.env.EXPO_PUBLIC_ENABLE_EXPERIMENTAL === 'true' || 
  (DEV_FEATURES_ENABLED && process.env.EXPO_PUBLIC_ENABLE_EXPERIMENTAL !== 'false');

/**
 * Development mode indicator
 * Read-only, based on React Native's __DEV__ global
 */
export const IS_DEV_MODE = __DEV__;

/**
 * Development config summary for debugging
 */
export const DEV_CONFIG = {
  masterSwitch: DEV_FEATURES_ENABLED,
  debugInfo: SHOW_DEBUG_INFO,
  devSettings: SHOW_DEV_SETTINGS,
  debugLogging: ENABLE_DEBUG_LOGGING,
  refreshButtons: SHOW_REFRESH_BUTTONS,
  experimental: ENABLE_EXPERIMENTAL_FEATURES,
  devMode: IS_DEV_MODE,
} as const;

/**
 * Log development config on startup (dev mode only)
 */
if (IS_DEV_MODE && ENABLE_DEBUG_LOGGING) {
  console.log('[Dev Config]', DEV_CONFIG);
}

/**
 * Environment variable reference:
 * 
 * EXPO_PUBLIC_ENABLE_DEV_FEATURES=true|false
 *   Master switch for all dev features (defaults to __DEV__)
 * 
 * EXPO_PUBLIC_SHOW_DEBUG_INFO=true|false
 *   Show debug sections (subscription info, state, etc.)
 * 
 * EXPO_PUBLIC_SHOW_DEV_SETTINGS=true|false
 *   Show developer controls (warmth modes, overrides, etc.)
 * 
 * EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=true|false
 *   Enable detailed console logs
 * 
 * EXPO_PUBLIC_SHOW_REFRESH_BUTTONS=true|false
 *   Show refresh/reload buttons
 * 
 * EXPO_PUBLIC_ENABLE_EXPERIMENTAL=true|false
 *   Enable experimental/beta features
 * 
 * Usage examples:
 * 
 * 1. Production build (all debug features off):
 *    No env vars needed - defaults to production mode
 * 
 * 2. Beta/TestFlight build (some debug features):
 *    EXPO_PUBLIC_SHOW_REFRESH_BUTTONS=true
 *    EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=false
 * 
 * 3. Internal testing build (all debug features):
 *    EXPO_PUBLIC_ENABLE_DEV_FEATURES=true
 * 
 * 4. Development with minimal logging:
 *    EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=false
 */
