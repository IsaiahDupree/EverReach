/**
 * AuthProvider v2 - Clean, Mobile-First Authentication
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
import { supabase } from '../lib/supabase';
import { clearSessionCache } from '../lib/api';
import { redirectUri, resetRedirectUri } from '../lib/redirectUri';
import { FLAGS } from '@/constants/flags';
import { getOrCreateLocalUser, LocalUser } from '@/auth/LocalAuth';
import createContextHook from '@nkzw/create-context-hook';
import type { Session, User } from '@supabase/supabase-js';

// Complete auth session for WebBrowser
WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  // State
  session: Session | null;
  user: User | LocalUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Utility
  orgId: string | null;
};

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  // Core state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Derived state
  const isAuthenticated = !!session || FLAGS.LOCAL_ONLY;

  /**
   * Initialize auth - check for existing session
   */
  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initAuth = async () => {
      console.log('\n[Auth v2] 🚀 Initializing...');

      try {
        // Local-only mode
        if (FLAGS.LOCAL_ONLY) {
          console.log('[Auth v2] Local-only mode enabled');
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
          console.error('[Auth v2] ❌ Session check error:', error.message);
        }

        if (mounted) {
          if (currentSession) {
            console.log('[Auth v2] ✅ Found existing session:', currentSession.user.email);
            setSession(currentSession);
            setUser(currentSession.user);
            setOrgId('default-org-id');
          } else {
            console.log('[Auth v2] No existing session');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth v2] ❌ Init error:', err);
        if (mounted) setLoading(false);
      }
    };

    // Set up auth state listener
    // This fires on: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    if (!FLAGS.LOCAL_ONLY && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!mounted) return;

        console.log('[Auth v2] 🔔 Auth event:', event);

        switch (event) {
          case 'SIGNED_IN':
            if (newSession) {
              console.log('[Auth v2] ✅ User signed in:', newSession.user.email);
              setSession(newSession);
              setUser(newSession.user);
              setOrgId('default-org-id');
            }
            break;

          case 'SIGNED_OUT':
            console.log('[Auth v2] 👋 User signed out');
            setSession(null);
            setUser(null);
            setOrgId(null);
            break;

          case 'TOKEN_REFRESHED':
            if (newSession) {
              console.log('[Auth v2] 🔄 Token refreshed');
              setSession(newSession);
              setUser(newSession.user);
            }
            break;

          case 'USER_UPDATED':
            if (newSession) {
              console.log('[Auth v2] 📝 User updated');
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
   * Sign in with Google OAuth
   * Simple flow - let Supabase handle everything
   */
  const signInWithGoogle = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth v2] Google sign-in disabled in local mode');
      return;
    }

    try {
      console.log('\n[Auth v2] 🔐 Starting Google OAuth...');

      // Get OAuth URL from Supabase
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL received');

      console.log('[Auth v2] 🌐 Opening browser...');

      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'cancel') {
        console.log('[Auth v2] ⚠️  User cancelled');
        return;
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error(`Browser auth failed: ${result.type}`);
      }

      console.log('[Auth v2] ✅ Browser auth completed');

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

      console.log('[Auth v2] 🔄 Exchanging code for session...');

      // Exchange code for session
      // Supabase will automatically:
      // - Save to AsyncStorage
      // - Trigger onAuthStateChange
      // - Update our state
      const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);

      if (exchangeError) throw exchangeError;

      console.log('[Auth v2] ✅ Google sign-in complete!');
      // onAuthStateChange will update our state automatically

    } catch (error: any) {
      console.error('[Auth v2] ❌ Google sign-in error:', error.message);
      Alert.alert('Sign In Error', error.message || 'Failed to sign in with Google');
    }
  }, []);

  /**
   * Sign in with Apple (iOS only)
   */
  const signInWithApple = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth v2] Apple sign-in disabled in local mode');
      return;
    }

    try {
      console.log('[Auth v2] 🍎 Starting Apple sign-in...');

      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error('No identity token received');
        }

        const { error } = await supabase!.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;

        console.log('[Auth v2] ✅ Apple sign-in complete!');
      } else {
        // Non-iOS platforms use OAuth flow
        const { data, error } = await supabase!.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: redirectUri,
            skipBrowserRedirect: Platform.OS !== 'web',
          },
        });

        if (error) throw error;
        console.log('[Auth v2] ✅ Apple OAuth initiated');
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[Auth v2] ❌ Apple sign-in error:', error.message);
        Alert.alert('Sign In Error', error.message || 'Failed to sign in with Apple');
      }
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth v2] Email sign-in disabled in local mode');
      return;
    }

    try {
      console.log('[Auth v2] 📧 Signing in with email:', email);

      const { error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('[Auth v2] ✅ Email sign-in complete!');
      // onAuthStateChange will update our state

    } catch (error: any) {
      console.error('[Auth v2] ❌ Email sign-in error:', error.message);
      throw error; // Let the UI handle this
    }
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      console.log('\n[Auth v2] 👋 Signing out...');

      // Clear API cache
      clearSessionCache();

      if (!FLAGS.LOCAL_ONLY && supabase) {
        // Supabase will:
        // - Clear AsyncStorage automatically
        // - Trigger SIGNED_OUT event
        // - Update our state via onAuthStateChange
        await supabase.auth.signOut();
      }

      // For local mode, reset to local user
      if (FLAGS.LOCAL_ONLY) {
        const localUser = await getOrCreateLocalUser();
        setUser(localUser);
        setOrgId('local-org');
      }

      console.log('[Auth v2] ✅ Sign out complete!');
    } catch (error: any) {
      console.error('[Auth v2] ❌ Sign out error:', error.message);
      // Force clean state even on error
      clearSessionCache();
      setSession(null);
      setUser(null);
      setOrgId(null);
    }
  }, []);

  // Memoized context value
  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      isAuthenticated,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signOut,
      orgId,
    }),
    [session, user, loading, isAuthenticated, signInWithGoogle, signInWithApple, signInWithEmail, signOut, orgId]
  );

  return value;
});
