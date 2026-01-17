import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AnalyticsMetrics {
  total_contacts: number
  contacts_growth: number // % change from previous period
  total_interactions: number
  interactions_growth: number
  avg_warmth_score: number
  warmth_growth: number
  active_pipelines: number
  total_pipeline_value: number
  active_goals: number
  goals_completion_rate: number
}

export interface ActivityData {
  date: string
  interactions: number
  contacts_added: number
  warmth_avg: number
}

export interface WarmthDistribution {
  band: 'hot' | 'warm' | 'cooling' | 'cold'
  count: number
  percentage: number
}

export interface TopContacts {
  id: string
  display_name: string
  warmth_score: number
  interaction_count: number
  last_touch_at: string
}

/**
 * Hook to fetch analytics metrics
 */
export function useAnalyticsMetrics(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return useQuery({
    queryKey: ['analytics-metrics', period],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/analytics/metrics?period=${period}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics metrics')
      }

      return response.json() as Promise<AnalyticsMetrics>
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch activity timeline data
 */
export function useActivityData(period: 'week' | 'month' | 'quarter' = 'month') {
  return useQuery({
    queryKey: ['activity-data', period],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/analytics/activity?period=${period}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity data')
      }

      const data = await response.json()
      return (data.activity || []) as ActivityData[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch warmth distribution
 */
export function useWarmthDistribution() {
  return useQuery({
    queryKey: ['warmth-distribution'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/analytics/warmth-distribution', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch warmth distribution')
      }

      const data = await response.json()
      return (data.distribution || []) as WarmthDistribution[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to fetch top contacts
 */
export function useTopContacts(limit: number = 10) {
  return useQuery({
    queryKey: ['top-contacts', limit],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/analytics/top-contacts?limit=${limit}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch top contacts')
      }

      const data = await response.json()
      return (data.contacts || []) as TopContacts[]
    },
    staleTime: 10 * 60 * 1000,
  })
}
