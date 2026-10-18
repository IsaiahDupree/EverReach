/**
 * useAuth Hook
 * Feature: IOS-AUTH-003
 *
 * Convenient hook for accessing authentication state and methods.
 * This hook wraps the AuthContext and provides a simpler API for components.
 *
 * @returns Authentication state and methods including:
 *   - user: Current authenticated user or null
 *   - loading: Boolean indicating if auth state is loading
 *   - signIn: Function to sign in with email/password
 *   - signOut: Function to sign out
 *   - signUp: Function to sign up with email/password
 *
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * ```tsx
 * import { useAuth } from '@/hooks/useAuth';
 *
 * function MyComponent() {
 *   const { user, loading, signIn, signOut } = useAuth();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <UserProfile user={user} onLogout={signOut} />;
 * }
 * ```
 *
 * @module hooks/useAuth
 */

import { useAuthContext } from '../providers/AuthProvider';

/**
 * Hook to access authentication state and methods
 *
 * This is a convenience wrapper around useAuthContext that provides
 * a more ergonomic API for components that need authentication.
 *
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  return useAuthContext();
};
