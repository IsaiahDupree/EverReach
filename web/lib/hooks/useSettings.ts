import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  bio?: string
  avatar_url?: string
  timezone?: string
  date_format?: string
  created_at: string
}

export interface UserPreferences {
  warmth_alert_threshold?: number
  default_interaction_channel?: string
  default_pipeline_id?: string
  analytics_opt_in?: boolean
  email_notifications?: boolean
  push_notifications?: boolean
  weekly_digest?: boolean
}

/**
 * Hook to fetch user profile
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/me/profile', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      return response.json() as Promise<UserProfile>
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const response = await apiFetch('/api/v1/me/profile', {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      return response.json() as Promise<UserProfile>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/me/preferences', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }

      return response.json() as Promise<UserPreferences>
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await apiFetch('/api/v1/me/preferences', {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
