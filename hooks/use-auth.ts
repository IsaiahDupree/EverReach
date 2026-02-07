import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

/**
 * Authentication hook for managing user auth state
 *
 * Provides user state, loading state, and auth methods (signIn, signUp, signOut).
 * Automatically syncs with Supabase auth state changes.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, signIn, signOut } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   if (!user) {
 *     return <button onClick={() => signIn('email@test.com', 'password')}>Sign In</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome {user.email}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
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
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Object with user and error (if any)
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error as AuthError,
      };
    }
  }, []);

  /**
   * Sign up with email and password
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns Object with user and error (if any)
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error as AuthError,
      };
    }
  }, []);

  /**
   * Sign out the current user
   *
   * @returns Object with error (if any)
   */
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error as AuthError,
      };
    }
  }, []);

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
