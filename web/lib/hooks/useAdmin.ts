import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { SystemStats, OrganizationSettings, ActivityLog } from '@/lib/types/admin'

/**
 * Hook to fetch system statistics
 */
export function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/admin/stats', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch system stats')
      }

      return response.json() as Promise<SystemStats>
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch organization settings
 */
export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/admin/organization', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch organization settings')
      }

      return response.json() as Promise<OrganizationSettings>
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to update organization settings
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<OrganizationSettings>) => {
      const response = await apiFetch('/api/v1/admin/organization', {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update organization')
      }

      return response.json() as Promise<OrganizationSettings>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] })
    },
  })
}

/**
 * Hook to fetch activity logs
 */
export function useActivityLogs(limit: number = 50) {
  return useQuery({
    queryKey: ['activity-logs', limit],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/admin/activity?limit=${limit}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs')
      }

      const data = await response.json()
      return (data.logs || []) as ActivityLog[]
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Hook to fetch dashboard overview
 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/dashboard/overview', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard overview')
      }

      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })
}

/**
 * Hook to fetch recent errors
 */
export function useRecentErrors(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-errors', limit],
    queryFn: async () => {
      const response = await apiFetch(`/api/admin/errors?limit=${limit}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recent errors')
      }

      const data = await response.json()
      return data.errors || []
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch feature flags
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/feature-flags', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }

      const data = await response.json()
      return data.flags || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to create a feature flag
 */
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (flag: any) => {
      const response = await apiFetch('/api/admin/feature-flags', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(flag),
      })

      if (!response.ok) {
        throw new Error('Failed to create feature flag')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    },
  })
}

/**
 * Hook to update a feature flag
 */
export function useUpdateFeatureFlag(key: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiFetch(`/api/admin/feature-flags/${key}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update feature flag')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      queryClient.invalidateQueries({ queryKey: ['feature-flag', key] })
    },
  })
}

/**
 * Hook to fetch experiments
 */
export function useExperiments() {
  return useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/experiments', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch experiments')
      }

      const data = await response.json()
      return data.experiments || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch marketing overview
 */
export function useMarketingOverview() {
  return useQuery({
    queryKey: ['marketing-overview'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/marketing/overview', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch marketing overview')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
