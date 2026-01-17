/**
 * Contact Avatar Hook
 * 
 * Provides cached avatar URLs with React Query
 * - 1 hour stale time
 * - 24 hour cache time
 * - Automatic prefetch on app startup
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ContactAvatarData {
  avatarUrl: string | null;
  displayName: string;
}

/**
 * Hook to get a contact's avatar URL with caching
 */
export function useContactAvatar(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ['contact-avatar', contactId],
    queryFn: async () => {
      if (!contactId) {
        return null;
      }

      try {
        const response = await apiFetch(`/api/v1/contacts/${contactId}`, {
          method: 'GET',
          requireAuth: true,
        });

        if (!response.ok) {
          console.warn(`[useContactAvatar] Failed to fetch avatar for ${contactId}:`, response.status);
          return null;
        }

        const data = await response.json();
        return data.contact?.avatar_url || null;
      } catch (error) {
        console.error('[useContactAvatar] Error fetching avatar:', error);
        return null;
      }
    },
    enabled: !!contactId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (was cacheTime in v4)
    retry: 1,
  });
}

/**
 * Hook to prefetch all contact avatars in bulk
 * Call this on app startup for instant avatar loading
 */
export function usePrefetchContactAvatars() {
  const queryClient = useQueryClient();

  const prefetchAvatars = async () => {
    try {
      console.log('[usePrefetchContactAvatars] Starting avatar prefetch...');
      
      const response = await apiFetch('/api/v1/contacts?limit=100', {
        method: 'GET',
        requireAuth: true,
      });

      if (!response.ok) {
        console.warn('[usePrefetchContactAvatars] Failed to fetch contacts:', response.status);
        return;
      }

      const data = await response.json();
      const contacts = data.contacts || [];

      // Cache the full contacts list
      queryClient.setQueryData(['contacts', 'list'], contacts);

      // Pre-cache individual avatar URLs
      let cached = 0;
      contacts.forEach((contact: any) => {
        if (contact.id) {
          queryClient.setQueryData(
            ['contact-avatar', contact.id],
            contact.avatar_url || null
          );
          if (contact.avatar_url) cached++;
        }
      });

      console.log(`✅ Prefetched ${cached} contact avatars out of ${contacts.length} contacts`);
    } catch (error) {
      console.error('[usePrefetchContactAvatars] Error prefetching avatars:', error);
    }
  };

  return { prefetchAvatars };
}

/**
 * Hook to invalidate avatar cache for a contact
 * Use this after uploading a new avatar
 */
export function useInvalidateContactAvatar() {
  const queryClient = useQueryClient();

  const invalidateAvatar = (contactId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['contact-avatar', contactId],
    });
  };

  return { invalidateAvatar };
}

/**
 * Hook to manually set avatar in cache (optimistic update)
 */
export function useSetContactAvatar() {
  const queryClient = useQueryClient();

  const setAvatar = (contactId: string, avatarUrl: string | null) => {
    queryClient.setQueryData(['contact-avatar', contactId], avatarUrl);
  };

  return { setAvatar };
}

/**
 * Batch fetch avatars for multiple contacts
 * More efficient than individual fetches
 */
export async function batchFetchAvatars(contactIds: string[]): Promise<Record<string, string | null>> {
  try {
    const response = await apiFetch('/api/v1/contacts/avatars/batch', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ ids: contactIds }),
    });

    if (!response.ok) {
      console.warn('[batchFetchAvatars] Batch fetch failed:', response.status);
      return {};
    }

    const data = await response.json();
    return data.avatars || {};
  } catch (error) {
    console.error('[batchFetchAvatars] Error:', error);
    return {};
  }
}
