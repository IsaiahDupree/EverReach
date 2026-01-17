/**
 * AuthProvider - Clean, Mobile-First Authentication
 * 
 * Key improvements:
 * - Let Supabase handle session persistence
 * - Simple OAuth flow without manual code extraction
 * - Single source of truth for auth state
 * - Auto-navigation friendly
 * - ~200 lines vs 700 lines
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { clearSessionCache } from '@/lib/api';
import { redirectUri, resetRedirectUri } from '@/lib/redirectUri';
import { FLAGS } from '@/constants/flags';
import { getOrCreateLocalUser, LocalUser } from '@/auth/LocalAuth';
import createContextHook from '@nkzw/create-context-hook';
import type { Session, User } from '@supabase/supabase-js';
import { identifyUser, resetPostHog } from '@/lib/posthog';
import { getLocales } from 'expo-localization';
import { SubscriptionRepo } from '@/repos/SubscriptionRepo';
import { logIn as revenueCatLogIn, logOut as revenueCatLogOut } from '@/lib/revenuecat';

// Complete auth session for WebBrowser (native only)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

type AuthContextValue = {
  // State
  session: Session | null;
  user: User | LocalUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  
  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  clearPasswordRecovery: () => void;
  
  // Utility
  orgId: string | null;
};

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  // Core state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Derived state
  const isAuthenticated = !!session || FLAGS.LOCAL_ONLY;

  /**
   * Initialize auth - check for existing session
   */
  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initAuth = async () => {
      console.log('\n[Auth] 🚀 Initializing...');

      try {
        // Local-only mode
        if (FLAGS.LOCAL_ONLY) {
          console.log('[Auth] Local-only mode enabled');
          const localUser = await getOrCreateLocalUser();
          if (mounted) {
            setUser(localUser);
            setOrgId('local-org');
            setLoading(false);
          }
          return;
        }

        // Get current session from Supabase
        // Supabase automatically loads from AsyncStorage
        const { data: { session: currentSession }, error } = await supabase!.auth.getSession();

        if (error) {
          console.error('[Auth] ❌ Session check error:', error.message);
        }

        if (mounted) {
          if (currentSession) {
            console.log('[Auth] ✅ Found existing session:', currentSession.user.email);
            setSession(currentSession);
            setUser(currentSession.user);
            setOrgId('default-org-id');
            
            // Refresh entitlements on app startup with existing session
            console.log('[Auth] 🔄 Refreshing entitlements on startup...');
            SubscriptionRepo.getEntitlements()
              .then(() => console.log('[Auth] ✅ Entitlements refreshed'))
              .catch(err => console.error('[Auth] ❌ Failed to refresh entitlements:', err));
          } else {
            console.log('[Auth] No existing session');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] ❌ Init error:', err);
        if (mounted) setLoading(false);
      }
    };

    // Set up auth state listener
    // This fires on: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    if (!FLAGS.LOCAL_ONLY && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event: string, newSession: Session | null) => {
        if (!mounted) return;

        console.log('[Auth] 🔔 Auth event:', event);

        switch (event) {
          case 'SIGNED_IN':
            if (newSession) {
              console.log('[Auth] ✅ User signed in:', newSession.user.email);
              setSession(newSession);
              setUser(newSession.user);
              setOrgId('default-org-id');
              setIsPasswordRecovery(false);
              
              identifyUser(newSession.user.id, {
                locale: getLocales()[0]?.languageTag || 'en',
                platform: Platform.OS,
              }).catch(err => console.error('[Auth] Failed to identify user:', err));
              
              // CRITICAL: Identify RevenueCat with the authenticated user ID
              // This ensures subscriptions are tied to THIS user account, not the device/Apple ID
              console.log('[Auth] 🔐 Identifying RevenueCat with user ID:', newSession.user.id);
              revenueCatLogIn(newSession.user.id)
                .then((result) => {
                  if (result) {
                    console.log('[Auth] ✅ RevenueCat identified with user:', newSession.user.id, 'created:', result.created);
                  } else {
                    console.warn('[Auth] ⚠️ RevenueCat logIn returned null (may not be available)');
                  }
                })
                .catch((err) => {
                  console.error('[Auth] ❌ Failed to identify RevenueCat:', err);
                  // Don't block sign-in if RevenueCat fails
                });
              
              // Automatically refresh all subscription data after sign-in
              // This will fetch entitlements for THIS user only (validated by backend)
              console.log('[Auth] 🔄 Refreshing subscription data after sign-in...');
              Promise.all([
                SubscriptionRepo.getEntitlements(),
                SubscriptionRepo.restorePurchases(), // Syncs with RevenueCat/App Store for THIS user
              ])
                .then(() => console.log('[Auth] ✅ Subscription data refreshed and synced'))
                .catch(err => console.error('[Auth] ❌ Failed to refresh subscription data:', err?.message || 'Unknown error'));
            }
            break;

          case 'SIGNED_OUT':
            console.log('[Auth] 👋 User signed out');
            
            // CRITICAL: Log out RevenueCat to prevent subscription leakage
            // This ensures the next user who signs in doesn't get access to previous user's subscription
            console.log('[Auth] 🔐 Logging out RevenueCat...');
            revenueCatLogOut()
              .then((success) => {
                if (success) {
                  console.log('[Auth] ✅ RevenueCat logged out successfully');
                } else {
                  console.warn('[Auth] ⚠️ RevenueCat logOut returned false (may not be available)');
                }
              })
              .catch((err) => {
                console.error('[Auth] ❌ Failed to log out RevenueCat:', err);
                // Don't block sign-out if RevenueCat fails
              });
            
            setSession(null);
            setUser(null);
            setOrgId(null);
            setIsPasswordRecovery(false);
            
            resetPostHog().catch(err => console.error('[Auth] Failed to reset PostHog:', err));
            break;

          case 'TOKEN_REFRESHED':
            if (newSession) {
              console.log('[Auth] 🔄 Token refreshed');
              setSession(newSession);
              setUser(newSession.user);
            }
            break;

          case 'USER_UPDATED':
            if (newSession) {
              console.log('[Auth] 📝 User updated');
              setSession(newSession);
              setUser(newSession.user);
            }
            break;

          case 'PASSWORD_RECOVERY':
            console.log('[Auth] 🔐 Password recovery mode');
            setIsPasswordRecovery(true);
            if (newSession) {
              setSession(newSession);
              setUser(newSession.user);
            }
            break;
        }
      });

      authListener = data.subscription;
    }

    initAuth();

    return () => {
      mounted = false;
      authListener?.unsubscribe();
    };
  }, []);

  /**
   * Request password reset email with redirect to reset-password route
   */
  const requestPasswordReset = useCallback(async (email: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Password reset disabled in local mode');
      return;
    }

    const trimmed = (email || '').trim();
    if (!trimmed) {
      throw new Error('Please enter your email address');
    }

    console.log('[Auth] 🔐 Requesting password reset email for:', trimmed);
    const { error } = await supabase!.auth.resetPasswordForEmail(trimmed, {
      redirectTo: resetRedirectUri,
    });
    if (error) throw error;
    console.log('[Auth] 📧 Password reset email sent');
  }, []);

  /**
   * Clear password recovery mode flag
   */
  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  /**
   * Sign in with Google OAuth
   * Simple flow - let Supabase handle everything
   */
  const signInWithGoogle = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Google sign-in disabled in local mode');
      return;
    }

    try {
      console.log('\n[Auth] 🔐 Starting Google OAuth...');

      // For web, let Supabase handle the redirect in the same window
      if (Platform.OS === 'web') {
        const { error } = await supabase!.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
            skipBrowserRedirect: false,
          },
        });

        if (error) throw error;
        // Supabase will redirect the window
        return;
      }

      // Native flow (iOS/Android): use WebBrowser session and exchange code
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL received');

      console.log('[Auth] 🌐 Opening browser...');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'cancel') {
        console.log('[Auth] ⚠️  User cancelled');
        return;
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error(`Browser auth failed: ${result.type}`);
      }

      console.log('[Auth] ✅ Browser auth completed');

      // Extract code from callback URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const error_param = url.searchParams.get('error');

      if (error_param) {
        throw new Error(url.searchParams.get('error_description') || error_param);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('[Auth] 🔄 Exchanging code for session...');

      // Exchange code for session
      // Supabase will automatically:
      // - Save to AsyncStorage
      // - Trigger onAuthStateChange
      // - Update our state
      const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);

      if (exchangeError) throw exchangeError;

      console.log('[Auth] ✅ Google sign-in complete!');
      // onAuthStateChange will update our state automatically

    } catch (error: any) {
      console.error('[Auth] ❌ Google sign-in error:', error.message);
      Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
    }
  }, []);

  /**
   * Sign in with Apple (iOS only)
   */
  const signInWithApple = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Apple sign-in disabled in local mode');
      throw new Error('Apple sign-in disabled in local mode');
    }

    try {
      console.log('[Auth] 🍎 Starting Apple sign-in...');

      if (Platform.OS === 'ios') {
        const rawNonce = Math.random().toString(36).slice(2) + Date.now();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce
        );

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });

        if (!credential.identityToken) {
          throw new Error('No identity token received from Apple');
        }

        const { error } = await supabase!.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });

        if (error) {
          console.error('[Auth] ❌ Supabase sign-in error:', error);
          throw error;
        }

        console.log('[Auth] ✅ Apple sign-in complete!');
        return; // Done via native flow
      } else {
        // Non-iOS platforms use OAuth PKCE browser flow
        console.log('[Auth] 🌐 Starting Apple OAuth (non-iOS)...');
        const { data, error } = await supabase!.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: redirectUri,
            skipBrowserRedirect: false,
          },
        });

        if (error) throw error;
        if (!data.url) throw new Error('No OAuth URL received');

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'cancel') return;
        if (result.type !== 'success' || !result.url) {
          throw new Error(`Browser auth failed: ${result.type}`);
        }

        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const error_param = url.searchParams.get('error');
        if (error_param) {
          throw new Error(url.searchParams.get('error_description') || error_param);
        }
        if (!code) throw new Error('No authorization code received');

        const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        console.log('[Auth] ✅ Apple OAuth sign-in complete!');
      }
    } catch (error: any) {
      // On iOS, if native flow fails and wasn't canceled, fall back to OAuth PKCE
      if (Platform.OS === 'ios' && error?.code !== 'ERR_REQUEST_CANCELED') {
        try {
          console.warn('[Auth] ⚠️ Native Apple sign-in failed, falling back to OAuth:', error?.message);
          const { data, error: oauthError } = await supabase!.auth.signInWithOAuth({
            provider: 'apple',
            options: {
              redirectTo: redirectUri,
              skipBrowserRedirect: false,
            },
          });
          if (oauthError) throw oauthError;
          if (!data.url) throw new Error('No OAuth URL received');

          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUri
          );

          if (result.type === 'cancel') return;
          if (result.type !== 'success' || !result.url) {
            throw new Error(`Browser auth failed: ${result.type}`);
          }

          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          const error_param = url.searchParams.get('error');
          if (error_param) {
            throw new Error(url.searchParams.get('error_description') || error_param);
          }
          if (!code) throw new Error('No authorization code received');

          const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          console.log('[Auth] ✅ Apple OAuth fallback sign-in complete!');
          return;
        } catch (fallbackErr: any) {
          console.error('[Auth] ❌ Apple OAuth fallback error:', fallbackErr?.message);
          Alert.alert('Sign In Error', fallbackErr?.message || 'Failed to sign in with Apple');
          throw fallbackErr; // Re-throw so auth.tsx can catch it
        }
      }

      if (error?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[Auth] ❌ Apple sign-in error:', error?.message);
        Alert.alert('Sign In Error', error?.message || 'Failed to sign in with Apple');
        throw error; // Re-throw so auth.tsx can catch it
      } else {
        // User canceled - throw a cancel error so auth.tsx knows
        throw error;
      }
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Email sign-in disabled in local mode');
      return;
    }

    try {
      console.log('[Auth] 📧 Signing in with email:', email);

      const { error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('[Auth] ✅ Email sign-in complete!');
      // onAuthStateChange will update our state

    } catch (error: any) {
      console.error('[Auth] ❌ Email sign-in error:', error.message);
      throw error; // Let the UI handle this
    }
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      console.log('\n[Auth] 👋 Signing out...');

      // CRITICAL: Log out RevenueCat FIRST to prevent subscription leakage
      // This ensures the next user who signs in doesn't get access to previous user's subscription
      console.log('[Auth] 🔐 Logging out RevenueCat...');
      try {
        const success = await revenueCatLogOut();
        if (success) {
          console.log('[Auth] ✅ RevenueCat logged out successfully');
        } else {
          console.warn('[Auth] ⚠️ RevenueCat logOut returned false (may not be available)');
        }
      } catch (rcError: any) {
        console.error('[Auth] ❌ Failed to log out RevenueCat:', rcError?.message || rcError);
        // Don't block sign-out if RevenueCat fails
      }

      // Clear API cache
      clearSessionCache();

      if (!FLAGS.LOCAL_ONLY && supabase) {
        // Sign out from Supabase (clears all sessions globally)
        await supabase.auth.signOut({ scope: 'global' });
        
        // Immediately clear state (don't wait for onAuthStateChange)
        setSession(null);
        setUser(null);
        setOrgId(null);
        
        // Reset PostHog tracking
        resetPostHog();
      }

      // For local mode, reset to local user
      if (FLAGS.LOCAL_ONLY) {
        const localUser = await getOrCreateLocalUser();
        setUser(localUser);
        setOrgId('local-org');
      }

      console.log('[Auth] ✅ Sign out complete!');
    } catch (error: any) {
      console.error('[Auth] ❌ Sign out error:', error.message);
      // Force clean state even on error
      clearSessionCache();
      setSession(null);
      setUser(null);
      setOrgId(null);
      resetPostHog();
    }
  }, []);

  // Memoized context value
  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      isAuthenticated,
      isPasswordRecovery,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signOut,
      requestPasswordReset,
      clearPasswordRecovery,
      orgId,
    }),
    [session, user, loading, isAuthenticated, isPasswordRecovery, signInWithGoogle, signInWithApple, signInWithEmail, signOut, requestPasswordReset, clearPasswordRecovery, orgId]
  );

  return value;
});
