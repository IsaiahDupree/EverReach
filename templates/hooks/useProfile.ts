/**
 * useProfile
 *
 * Manages the authenticated user's SunTrace profile.
 *
 * Fetches on mount, exposes helpers to create or update the profile.
 * Results are cached in component state; call refetch() to revalidate.
 *
 * Returns:
 *   profile        Profile | null
 *   isLoading      boolean
 *   error          string | null
 *   updateProfile  (input: UpdateProfileInput) => Promise<void>
 *   createProfile  (input: CreateProfileInput) => Promise<void>
 *   refetch        () => void
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getProfile,
  createProfile as apiCreateProfile,
  updateProfile as apiUpdateProfile,
} from '@/services/api';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
} from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<void>;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      setError(null);
      try {
        const updated = await apiUpdateProfile(input);
        setProfile(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        throw err;
      }
    },
    []
  );

  const createProfile = useCallback(
    async (input: CreateProfileInput) => {
      setError(null);
      try {
        const created = await apiCreateProfile(input);
        setProfile(created);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create profile';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    createProfile,
    refetch,
  };
}

export default useProfile;
