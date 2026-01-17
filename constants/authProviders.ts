/**
 * Auth Provider Configuration
 * Central config for all authentication providers
 */

import { Platform } from 'react-native';
import { FLAGS } from './flags';

export type AuthProviderId = 'google' | 'apple' | 'facebook' | 'twitter' | 'github' | 'email';

export interface AuthProviderConfig {
  id: AuthProviderId;
  name: string;
  icon: string;
  color: string;
  textColor: string;
  platforms: ('ios' | 'android' | 'web')[];
  enabled: boolean;
  order: number;
}

export const AUTH_PROVIDERS: Record<AuthProviderId, AuthProviderConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    icon: 'chrome',
    color: '#4285F4',
    textColor: '#FFFFFF',
    platforms: ['ios', 'android', 'web'],
    enabled: !FLAGS.LOCAL_ONLY,
    order: 1,
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: 'apple',
    color: '#000000',
    textColor: '#FFFFFF',
    platforms: ['ios'],
    enabled: !FLAGS.LOCAL_ONLY && Platform.OS === 'ios',
    order: 2,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    textColor: '#FFFFFF',
    platforms: ['ios', 'android', 'web'],
    enabled: false,
    order: 3,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    textColor: '#FFFFFF',
    platforms: ['ios', 'android', 'web'],
    enabled: false,
    order: 4,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    color: '#24292e',
    textColor: '#FFFFFF',
    platforms: ['ios', 'android', 'web'],
    enabled: false,
    order: 5,
  },
  email: {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    color: '#6B7280',
    textColor: '#FFFFFF',
    platforms: ['ios', 'android', 'web'],
    enabled: true,
    order: 99,
  },
};

export function getAvailableProviders(): AuthProviderConfig[] {
  const currentPlatform = Platform.OS;
  
  return Object.values(AUTH_PROVIDERS)
    .filter(provider => 
      provider.enabled &&
      provider.platforms.includes(currentPlatform as any)
    )
    .sort((a, b) => a.order - b.order);
}

export function getOAuthProviders(): AuthProviderConfig[] {
  return getAvailableProviders().filter(p => p.id !== 'email');
}

export function isProviderAvailable(providerId: AuthProviderId): boolean {
  const provider = AUTH_PROVIDERS[providerId];
  if (!provider) return false;
  
  const currentPlatform = Platform.OS;
  return provider.enabled && provider.platforms.includes(currentPlatform as any);
}
