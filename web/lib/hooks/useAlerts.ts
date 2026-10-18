import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '../api'

interface WarmthAlert {
  id: string
  contact_id: string
  contact_name: string
  current_warmth: number
  threshold: number
  triggered_at: string
  dismissed_at?: string
  snoozed_until?: string
  action_taken?: 'dismiss' | 'snooze' | 'reached_out'
  notified?: boolean
}

// Fetch all warmth alerts
export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => getJsonArray<WarmthAlert>('/api/v1/alerts', { requireAuth: true }),
    retry: 1, // Retry once on transient failures
  })
}

// Take action on an alert (dismiss, snooze, reached_out)
export function useAlertAction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      action 
    }: { 
      id: string
      action: 'dismiss' | 'snooze' | 'reached_out'
    }) => {
      const response = await apiFetch(`/api/v1/alerts/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ action }),
      })
      if (!response.ok) throw new Error('Failed to update alert')
      return response.json() as Promise<WarmthAlert>
    },
    onSuccess: () => {
      // Invalidate alerts to refetch
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
