import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { MessageTemplate, TemplateCategory, TemplateChannel } from '@/lib/types/templates'

/**
 * Hook to fetch all templates
 */
export function useTemplates(filters?: {
  category?: TemplateCategory
  channel?: TemplateChannel
  active_only?: boolean
}) {
  const queryParams = new URLSearchParams()
  if (filters?.category) queryParams.set('category', filters.category)
  if (filters?.channel) queryParams.set('channel', filters.channel)
  if (filters?.active_only) queryParams.set('active_only', 'true')

  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => {
      const url = `/api/v1/templates${queryParams.toString() ? `?${queryParams}` : ''}`
      return getJsonArray<MessageTemplate>(url, { requireAuth: true })
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch a single template
 */
export function useTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      if (!id) throw new Error('Template ID is required')

      const response = await apiFetch(`/api/v1/templates/${id}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch template')
      }

      return response.json() as Promise<MessageTemplate>
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'user_id' | 'use_count' | 'created_at' | 'updated_at'>) => {
      const response = await apiFetch('/api/v1/templates', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create template' }))
        throw new Error(error.error || 'Failed to create template')
      }

      return response.json() as Promise<MessageTemplate>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

/**
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MessageTemplate> }) => {
      const response = await apiFetch(`/api/v1/templates/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update template')
      }

      return response.json() as Promise<MessageTemplate>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] })
    },
  })
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/templates/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

/**
 * Hook to use (record usage of) a template
 */
export function useRecordTemplateUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/templates/${id}/use`, {
        method: 'POST',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to record template usage')
      }

      return response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template', id] })
    },
  })
}

/**
 * Hook to get popular templates
 */
export function usePopularTemplates(limit: number = 5) {
  return useQuery({
    queryKey: ['templates', 'popular', limit],
    queryFn: () => getJsonArray<MessageTemplate>(
      `/api/v1/templates/popular?limit=${limit}`,
      { requireAuth: true }
    ),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1, // Retry once on transient failures
  })
}
