import { makeRedirectUri } from 'expo-auth-session';

// Development redirect URI (for Expo Go)
export const devRedirect = makeRedirectUri();

// Production redirect URI (for standalone apps)
export const prodRedirect = makeRedirectUri({
  scheme: 'everreach', // matches the scheme in app.json
  path: 'auth/callback',
});

// Use the appropriate redirect URI based on environment
export const redirectUri = __DEV__ ? devRedirect : prodRedirect;

console.log('🔗 Redirect URIs:', { 
  dev: devRedirect, 
  prod: prodRedirect, 
  current: redirectUri,
  isDev: __DEV__
});