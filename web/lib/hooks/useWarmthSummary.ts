import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface WarmthSummary {
  total_contacts: number
  by_band: {
    hot: number
    warm: number
    cooling: number
    cold: number
  }
  average_score: number
  contacts_needing_attention: number
  last_updated_at: string
}

export function useWarmthSummary() {
  return useQuery({
    queryKey: ['warmth-summary'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/warmth/summary', {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch warmth summary')
      }

      return response.json() as Promise<WarmthSummary>
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}
