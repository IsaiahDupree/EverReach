/**
 * Shared Contacts Hook
 * 
 * Single source of truth for contacts data.
 * Used by Dashboard, People page, and any other component that needs contacts.
 * React Query ensures they all share the same cache.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface Contact {
  id: string;
  display_name: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  title?: string;
  tags?: string[];
  warmth?: number;
  warmth_band?: 'hot' | 'warm' | 'neutral' | 'cooling' | 'cold';
  last_interaction_at?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactsResponse {
  items: Contact[];
  limit: number;
  nextCursor: string | null;
  sort?: string;
}

/**
 * Fetch all contacts from backend
 * Shared by Dashboard and People page
 */
export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ['contacts', 'all'],
    queryFn: async () => {
      console.log('[useContacts] Fetching contacts...');
      const response = await apiFetch('/api/v1/contacts?limit=100', {
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }

      const data: ContactsResponse = await response.json();
      console.log('[useContacts] Fetched:', data.items?.length || 0, 'contacts');
      return data.items || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
