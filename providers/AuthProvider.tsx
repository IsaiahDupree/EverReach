import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { redirectUri } from '../lib/redirectUri';
import { FLAGS } from '@/constants/flags';
import { getOrCreateLocalUser, LocalUser } from '@/auth/LocalAuth';
import createContextHook from '@nkzw/create-context-hook';
import type { Session, User } from '@supabase/supabase-js';

type AuthCtx = {
  session: Session | null;
  user: User | LocalUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmailOtp: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  orgId: string | null;
};

WebBrowser.maybeCompleteAuthSession();
const REDIRECT = redirectUri;

export const [AuthProvider, useAuth] = createContextHook<AuthCtx>(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cloudModeEnabled, setCloudModeEnabled] = useState<boolean>(!FLAGS.LOCAL_ONLY);
  
  // Compute offline mode based on FLAGS and cloud mode setting
  const isOfflineMode = FLAGS.LOCAL_ONLY || !cloudModeEnabled;

  // Load cloud mode setting from storage
  useEffect(() => {
    let isMounted = true;
    
    const loadCloudMode = async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const cloudModeStr = await AsyncStorage.default.getItem('@app_settings_cloud_mode');
        if (isMounted && cloudModeStr !== null) {
          const cloudValue = cloudModeStr === 'true' || (cloudModeStr !== 'false' && JSON.parse(cloudModeStr));
          setCloudModeEnabled(cloudValue);
        }
      } catch (error) {
        console.warn('[AuthProvider] Error loading cloud mode:', error);
      }
    };
    
    if (!FLAGS.LOCAL_ONLY) {
      loadCloudMode();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Load existing session with optimized performance
  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth state...');
        console.log('[AuthProvider] FLAGS.LOCAL_ONLY:', FLAGS.LOCAL_ONLY);
        console.log('[AuthProvider] cloudModeEnabled:', cloudModeEnabled);
        console.log('[AuthProvider] isOfflineMode:', isOfflineMode);
        
        // Set loading to false immediately to prevent hydration timeout
        if (isMounted) {
          setLoading(false);
        }
        
        if (FLAGS.LOCAL_ONLY) {
          console.log('[AuthProvider] Using local-only mode');
          // Use local user in local-only mode - this is fast
          const localUser = await getOrCreateLocalUser();
          if (isMounted) {
            console.log('[AuthProvider] Local user created/loaded:', localUser.id);
            setUser(localUser);
            setOrgId('local-org');
          }
        } else if (!isOfflineMode) {
          console.log('[AuthProvider] Checking for existing Supabase session');
          // Check for existing Supabase session with timeout
          if (supabase) {
            // Set a timeout for session check to prevent hanging
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 2000)
            );
            
            try {
              const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
              if (isMounted) {
                console.log('[AuthProvider] Session data:', !!data?.session);
                setSession(data?.session ?? null);
                setUser(data?.session?.user ?? null);
                
                // Set org ID asynchronously to not block UI
                if (data?.session?.user) {
                  setOrgId('default-org-id'); // Set default immediately
                  // Then try to get real org ID in background
                  supabase.rpc('ensure_user_org')
                    .then(({ data: rpc, error }: { data: any; error: any }) => {
                      if (isMounted && !error && rpc) {
                        setOrgId(rpc as string);
                      }
                    })
                    .catch((err: any) => console.warn('[AuthProvider] Background org check failed:', err));
                }
              }
            } catch (error) {
              console.warn('[AuthProvider] Session check failed:', error);
              if (isMounted) {
                setSession(null);
                setUser(null);
              }
            }
          } else {
            console.log('[AuthProvider] Supabase client not available');
          }
        } else {
          console.log('[AuthProvider] Offline mode enabled, skipping session check');
        }
        
        console.log('[AuthProvider] Auth initialization complete');
      } catch (error) {
        console.error('[AuthProvider] Error during auth initialization:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth immediately
    initializeAuth();

    // Set up auth state listener only if not in local-only mode
    if (!FLAGS.LOCAL_ONLY && supabase) {
      console.log('[AuthProvider] Setting up auth state listener');
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event: any, sess: any) => {
        if (!isMounted || FLAGS.LOCAL_ONLY || !cloudModeEnabled) {
          console.log('[AuthProvider] Ignoring auth state change due to offline mode or unmounted');
          return;
        }
        
        console.log('[AuthProvider] Auth state change:', _event, sess?.user?.email);
        setSession(sess ?? null);
        setUser(sess?.user ?? null);
        
        if (sess?.user && supabase) {
          // Set default org ID immediately, then update in background
          setOrgId('default-org-id');
          
          // Update org ID in background
          supabase.rpc('ensure_user_org')
            .then(({ data: rpc, error }: { data: any; error: any }) => {
              if (isMounted && !error && rpc) {
                setOrgId(rpc as string);
              }
            })
            .catch((err: any) => console.warn('[AuthProvider] Background org update failed:', err));
        } else {
          console.log('[AuthProvider] No session, clearing org ID');
          setOrgId(null);
        }
      });
      
      authSubscription = sub;
    } else {
      console.log('[AuthProvider] Skipping auth state listener setup');
    }

    return () => {
      isMounted = false;
      console.log('[AuthProvider] Cleaning up auth state listener');
      if (authSubscription && !FLAGS.LOCAL_ONLY && cloudModeEnabled) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [cloudModeEnabled, isOfflineMode]);

  const signInWithGoogle = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Google sign-in disabled in local-only mode');
      return;
    }
    try {
      console.log('[Auth] Google sign-in start, redirect URI:', REDIRECT);
      if (Platform.OS === 'web') {
        const { error } = await supabase!.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: REDIRECT }
        });
        if (error) Alert.alert('Sign in error', error.message);
        return;
      }
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: REDIRECT, 
          skipBrowserRedirect: false
        }
      });
      if (error) {
        console.error('[Auth] OAuth error:', error);
        Alert.alert('Sign in error', error.message);
        return;
      }
      const url = data?.url;
      console.log('[Auth] Google auth URL:', url);
      if (url) {
        const res = await WebBrowser.openAuthSessionAsync(url, REDIRECT);
        console.log('[Auth] WebBrowser result:', res);
      } else {
        Alert.alert('Sign in error', 'No authorization URL');
      }
    } catch (error: any) {
      console.error('[Auth] Google sign-in error:', error);
      Alert.alert('Sign in error', error.message);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Apple sign-in disabled in local-only mode');
      return;
    }
    try {
      if (Platform.OS === 'ios') {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        
        if (credential.identityToken) {
          const { error } = await supabase!.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          });
          if (error) Alert.alert('Sign in error', error.message);
        } else {
          throw new Error('No identityToken.');
        }
      } else {
        const { error } = await supabase!.auth.signInWithOAuth({
          provider: 'apple',
          options: { 
            redirectTo: REDIRECT, 
            skipBrowserRedirect: Platform.OS !== 'web'
          }
        });
        if (error) Alert.alert('Sign in error', error.message);
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // handle that the user canceled the sign-in flow
      } else {
        Alert.alert('Sign in error', error.message);
      }
    }
  }, []);

  const signInWithEmailOtp = useCallback(async (email: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Email OTP disabled in local-only mode');
      return;
    }
    try {
      const { error } = await supabase!.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: REDIRECT, 
          shouldCreateUser: true 
        }
      });
      if (error) Alert.alert('OTP error', error.message);
      else Alert.alert('Check your email', 'We sent you a magic link to sign in.');
    } catch (error: any) {
      Alert.alert('OTP error', error.message);
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Password sign-in disabled in local-only mode');
      return;
    }
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Sign in error', error.message);
    } catch (error: any) {
      Alert.alert('Sign in error', error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (FLAGS.LOCAL_ONLY) {
      console.log('[Auth] Sign up disabled in local-only mode');
      return;
    }
    try {
      const { error } = await supabase!.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: REDIRECT
        }
      });
      if (error) Alert.alert('Sign up error', error.message);
      else Alert.alert('Check your email', 'We sent you a confirmation link.');
    } catch (error: any) {
      Alert.alert('Sign up error', error.message);
    }
  }, []);



  const signOut = useCallback(async () => {
    try {
      console.log('[Auth] Signing out...');
      console.log('[Auth] Current state - FLAGS.LOCAL_ONLY:', FLAGS.LOCAL_ONLY, 'isOfflineMode:', isOfflineMode, 'user:', !!user);
      
      // Only attempt Supabase sign out if we have a real Supabase session
      if (!FLAGS.LOCAL_ONLY && !isOfflineMode && supabase && session) {
        console.log('[Auth] Attempting Supabase sign out...');
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[Auth] Supabase sign out error:', error);
          // Don't show alert for sign out errors, just log them
        } else {
          console.log('[Auth] Supabase sign out successful');
        }
      } else {
        console.log('[Auth] Skipping Supabase sign out - local mode or no session');
      }
      
      // Always clear local state
      console.log('[Auth] Clearing local auth state...');
      setSession(null);
      
      if (FLAGS.LOCAL_ONLY) {
        // In local-only mode, recreate local user
        console.log('[Auth] Recreating local user for local-only mode...');
        const localUser = await getOrCreateLocalUser();
        setUser(localUser);
        setOrgId('local-org');
      } else {
        // In cloud mode, clear user completely
        console.log('[Auth] Clearing user for cloud mode...');
        setUser(null);
        setOrgId(null);
      }
      
      console.log('[Auth] Sign out completed successfully');
    } catch (error: any) {
      console.error('[Auth] Sign out catch error:', error);
      
      // Force clear state even if there's an error
      setSession(null);
      if (FLAGS.LOCAL_ONLY) {
        // In local-only mode, still try to recreate local user
        try {
          const localUser = await getOrCreateLocalUser();
          setUser(localUser);
          setOrgId('local-org');
        } catch (localError) {
          console.error('[Auth] Error recreating local user:', localError);
          setUser(null);
          setOrgId(null);
        }
      } else {
        setUser(null);
        setOrgId(null);
      }
      
      // Only show error alert on mobile and if it's not a network error
      if (Platform.OS !== 'web' && error?.message && !error.message.includes('fetch')) {
        Alert.alert('Sign out error', error.message);
      }
    }
  }, [isOfflineMode, session, user]);

  return useMemo(() => ({
    session, 
    user, 
    loading, 
    signInWithGoogle, 
    signInWithApple, 
    signInWithEmailOtp, 
    signInWithPassword, 
    signUp,
    signOut,
    orgId
  }), [session, user, loading, signInWithGoogle, signInWithApple, signInWithEmailOtp, signInWithPassword, signUp, signOut, orgId]);
});