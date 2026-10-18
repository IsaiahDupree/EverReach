/**
 * useUser Hook
 * Feature: IOS-DATA-005
 *
 * React hook for managing User profile operations.
 * Provides methods to get and update user profile information.
 *
 * This hook uses Supabase for data persistence and manages loading/error states.
 * Consider migrating to React Query for better caching and state management.
 *
 * @returns Object containing:
 *   - profile: User profile object or null
 *   - loading: Boolean indicating if operation is in progress
 *   - error: Error object if operation failed
 *   - updateProfile: Function to update user profile
 *   - refetch: Function to manually refetch profile
 *
 * @example
 * ```tsx
 * import { useUser } from '@/hooks/useUser';
 *
 * function ProfileScreen() {
 *   const { profile, loading, error, updateProfile } = useUser();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   const handleSave = async () => {
 *     await updateProfile({
 *       full_name: 'New Name',
 *       avatar_url: 'https://example.com/avatar.jpg',
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Text>{profile?.full_name}</Text>
 *       <Button onPress={handleSave}>Save</Button>
 *     </View>
 *   );
 * }
 * ```
 *
 * @module hooks/useUser
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserProfileUpdateInput } from '../types/user';

/**
 * Return type for useUser hook
 */
interface UseUserReturn {
  profile: User | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (input: UserProfileUpdateInput) => Promise<User>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage user profile operations
 */
export const useUser = (): UseUserReturn => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch user profile from database
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch user profile from users table
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch profile');
      setError(error);
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (input: UserProfileUpdateInput): Promise<User> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update profile in database
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error('Failed to update profile');
      }

      // Update local state
      setProfile(data);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      console.error('Error updating profile:', error);
      throw error;
    }
  }, []);

  /**
   * Manually refetch profile
   */
  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch,
  };
};
