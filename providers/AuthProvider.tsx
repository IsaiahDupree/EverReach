/**
 * Authentication Context Provider
 * Feature: IOS-AUTH-002
 *
 * Provides authentication state and methods throughout the app:
 * - Current user state
 * - Loading state during auth operations
 * - Sign in, sign up, and sign out methods
 * - Automatic session management
 *
 * @module providers/AuthProvider
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Authentication context shape
 */
interface AuthContextValue {
  /**
   * Currently authenticated user, or null if not authenticated
   */
  user: User | null;

  /**
   * Loading state - true during initial load or auth operations
   */
  loading: boolean;

  /**
   * Sign in with email and password
   * @throws {Error} If sign in fails
   */
  signIn: (email: string, password: string) => Promise<void>;

  /**
   * Sign up with email and password
   * @throws {Error} If sign up fails
   */
  signUp: (email: string, password: string) => Promise<void>;

  /**
   * Sign out the current user
   * @throws {Error} If sign out fails
   */
  signOut: () => Promise<void>;

  /**
   * Send password reset email
   * @throws {Error} If password reset request fails
   */
  resetPassword: (email: string) => Promise<void>;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 *
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 *
 * Wraps the app and provides authentication state and methods.
 * Automatically listens for auth state changes and updates the user state.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Initialize auth state on mount
   * Loads existing session if available
   */
  useEffect(() => {
    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // User state will be updated by the auth state change listener
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // User state will be updated by the auth state change listener
  };

  /**
   * Sign out the current user
   */
  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    // User state will be updated by the auth state change listener
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Export the context for testing purposes
 * @internal
 */
export { AuthContext };
