import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api'

interface Interaction {
  id: string
  contact_id: string
  type: 'call' | 'meeting' | 'message' | 'note' | 'webhook'
  direction?: 'inbound' | 'outbound' | 'internal'
  occurred_at: string
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  action_items?: string[]
  created_at?: string
  updated_at?: string
}

interface InteractionsFilters {
  contact_id?: string
  type?: string
  direction?: string
  limit?: number
  offset?: number
}

// Fetch interactions with optional filters
export function useInteractions(filters?: InteractionsFilters) {
  return useQuery({
    queryKey: ['interactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.contact_id) params.append('contact_id', filters.contact_id)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.direction) params.append('direction', filters.direction)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())
      params.append('order', 'desc')

      const response = await apiFetch(`/api/v1/interactions?${params}`, { requireAuth: true })
      if (!response.ok) throw new Error('Failed to fetch interactions')
      return response.json() as Promise<Interaction[]>
    },
  })
}

// Fetch single interaction by ID
export function useInteraction(id: string | null) {
  return useQuery({
    queryKey: ['interaction', id],
    queryFn: async () => {
      if (!id) throw new Error('Interaction ID required')
      const response = await apiFetch(`/api/v1/interactions/${id}`, { requireAuth: true })
      if (!response.ok) throw new Error('Failed to fetch interaction')
      return response.json() as Promise<Interaction>
    },
    enabled: !!id,
  })
}

// Create new interaction
export function useCreateInteraction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await apiFetch('/api/v1/interactions', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(interaction),
      })
      if (!response.ok) throw new Error('Failed to create interaction')
      return response.json() as Promise<Interaction>
    },
    onSuccess: (data) => {
      // Invalidate interactions list and related contact
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      queryClient.invalidateQueries({ queryKey: ['contact', data.contact_id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Update existing interaction
export function useUpdateInteraction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Interaction> & { id: string }) => {
      const response = await apiFetch(`/api/v1/interactions/${id}`, {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update interaction')
      return response.json() as Promise<Interaction>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['interaction', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      queryClient.invalidateQueries({ queryKey: ['contact', data.contact_id] })
    },
  })
}

// Delete interaction
export function useDeleteInteraction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/interactions/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })
      if (!response.ok) throw new Error('Failed to delete interaction')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
