/**
 * OAuth Buttons Component
 * Feature: IOS-AUTH-007
 *
 * Reusable OAuth authentication buttons for Google and Apple Sign In.
 * Provides consistent styling, loading states, and error handling.
 *
 * Features:
 * - Google OAuth button with branded styling
 * - Apple Sign In button with platform-specific design
 * - Loading states during authentication
 * - Error handling with user-friendly messages
 * - Disabled state management
 *
 * @module components/auth/OAuthButtons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { Provider } from '@supabase/supabase-js';

/**
 * OAuthButtons Component Props
 */
interface OAuthButtonsProps {
  /**
   * Callback fired when OAuth flow starts
   * @param provider - The OAuth provider being used
   */
  onOAuthStart?: (provider: Provider) => void;

  /**
   * Callback fired when OAuth flow completes successfully
   * @param provider - The OAuth provider that was used
   */
  onOAuthSuccess?: (provider: Provider) => void;

  /**
   * Callback fired when OAuth flow fails
   * @param provider - The OAuth provider that failed
   * @param error - The error that occurred
   */
  onOAuthError?: (provider: Provider, error: Error) => void;
}

/**
 * OAuthButtons Component
 *
 * Renders Google and Apple OAuth buttons with built-in authentication logic.
 * Handles loading states and errors automatically.
 *
 * @example
 * ```tsx
 * <OAuthButtons
 *   onOAuthSuccess={(provider) => console.log(`Signed in with ${provider}`)}
 *   onOAuthError={(provider, error) => console.error(error)}
 * />
 * ```
 */
export default function OAuthButtons({
  onOAuthStart,
  onOAuthSuccess,
  onOAuthError,
}: OAuthButtonsProps = {}) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

  /**
   * Handle OAuth sign in for a given provider
   */
  const handleOAuthSignIn = async (provider: Provider) => {
    setLoadingProvider(provider);

    try {
      // Notify parent component that OAuth is starting
      onOAuthStart?.(provider);

      // Initiate OAuth flow with Supabase
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Use native redirect for mobile apps
          redirectTo: 'yourapp://auth/callback',
          // Skip browser redirect on mobile - handle in-app
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        throw error;
      }

      // Notify parent component of success
      onOAuthSuccess?.(provider);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('OAuth sign in failed');

      // Notify parent component of error
      onOAuthError?.(provider, err);

      // Show user-friendly error message
      Alert.alert(
        'Sign In Failed',
        `Unable to sign in with ${provider === 'google' ? 'Google' : 'Apple'}. Please try again.`,
        [{ text: 'OK' }]
      );

      console.error(`OAuth error with ${provider}:`, err);
    } finally {
      setLoadingProvider(null);
    }
  };

  /**
   * Check if a specific provider is currently loading
   */
  const isProviderLoading = (provider: Provider): boolean => {
    return loadingProvider === provider;
  };

  /**
   * Check if any provider is loading
   */
  const isAnyProviderLoading = (): boolean => {
    return loadingProvider !== null;
  };

  return (
    <View style={styles.container}>
      {/* Divider with "OR" text */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google OAuth Button */}
      <TouchableOpacity
        style={[
          styles.oauthButton,
          styles.googleButton,
          isAnyProviderLoading() ? styles.buttonDisabled : null,
        ]}
        onPress={() => handleOAuthSignIn('google')}
        disabled={isAnyProviderLoading()}
      >
        {isProviderLoading('google') ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4285F4" size="small" />
            <Text style={[styles.buttonText, styles.googleButtonText]}>
              Signing in...
            </Text>
          </View>
        ) : (
          <>
            {/* Google Logo - Using emoji as placeholder */}
            <Text style={styles.providerIcon}>G</Text>
            <Text style={[styles.buttonText, styles.googleButtonText]}>
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Apple Sign In Button */}
      <TouchableOpacity
        style={[
          styles.oauthButton,
          styles.appleButton,
          isAnyProviderLoading() ? styles.buttonDisabled : null,
        ]}
        onPress={() => handleOAuthSignIn('apple')}
        disabled={isAnyProviderLoading()}
      >
        {isProviderLoading('apple') ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              Signing in...
            </Text>
          </View>
        ) : (
          <>
            {/* Apple Logo - Using emoji as placeholder */}
            <Text style={styles.providerIcon}></Text>
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              Continue with Apple
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    color: '#999',
    fontSize: 14,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerIcon: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: '600',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  googleButtonText: {
    color: '#333',
  },
  appleButtonText: {
    color: '#fff',
  },
});
