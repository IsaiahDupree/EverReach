import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { SavedFilter, FilterGroup } from '@/lib/types/filters'

/**
 * Hook to fetch saved filters
 */
export function useSavedFilters() {
  return useQuery({
    queryKey: ['saved-filters'],
    queryFn: () => getJsonArray<SavedFilter>('/api/v1/filters', { requireAuth: true }),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to save a filter
 */
export function useSaveFilter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filter: { name: string; description?: string; filter_group: FilterGroup }) => {
      const response = await apiFetch('/api/v1/filters', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(filter),
      })

      if (!response.ok) {
        throw new Error('Failed to save filter')
      }

      return response.json() as Promise<SavedFilter>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
  })
}

/**
 * Hook to delete a saved filter
 */
export function useDeleteFilter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/filters/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete filter')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
  })
}
