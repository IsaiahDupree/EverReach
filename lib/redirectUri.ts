import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// Platform detection
const isWeb = Platform.OS === 'web';

// Web redirect URIs (use HTTPS URLs for OAuth callbacks)
const webDevRedirect = 'http://localhost:8081/auth/callback';
const webProdRedirect = 'https://www.everreach.app/auth/callback';
const webDevResetRedirect = 'http://localhost:8081/reset-password';
const webProdResetRedirect = 'https://www.everreach.app/reset-password';

// Mobile redirect URIs (use deep link scheme)
// In dev mode (Expo Go), don't specify scheme - let Expo handle it automatically (exp://...)
// In production (standalone app), use custom scheme (everreach://)
const mobileDevRedirect = makeRedirectUri({
  // Don't specify scheme in dev - Expo will use exp:// automatically
  path: 'auth/callback',
});

const mobileProdRedirect = makeRedirectUri({
  scheme: 'everreach', // Custom scheme for production builds
  path: 'auth/callback',
});

const mobileDevResetRedirect = makeRedirectUri({
  path: 'reset-password',
});

const mobileProdResetRedirect = makeRedirectUri({
  scheme: 'everreach',
  path: 'reset-password',
});

// Select the appropriate redirect URIs based on platform
export const devRedirect = isWeb ? webDevRedirect : mobileDevRedirect;
export const prodRedirect = isWeb ? webProdRedirect : mobileProdRedirect;
export const devResetRedirect = isWeb ? webDevResetRedirect : mobileDevResetRedirect;
export const prodResetRedirect = isWeb ? webProdResetRedirect : mobileProdResetRedirect;

// Use the appropriate redirect URI based on environment
export const redirectUri = __DEV__ ? devRedirect : prodRedirect;
export const resetRedirectUri = __DEV__ ? devResetRedirect : prodResetRedirect;

console.log('🔗 Redirect URIs:', { 
  platform: Platform.OS,
  isWeb,
  dev: devRedirect, 
  prod: prodRedirect, 
  current: redirectUri,
  devReset: devResetRedirect,
  prodReset: prodResetRedirect,
  resetCurrent: resetRedirectUri,
  isDev: __DEV__
});