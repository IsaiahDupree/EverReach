import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { AutomationRule } from '@/lib/types/automation'

/**
 * Hook to fetch all automation rules
 */
export function useAutomationRules(includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['automation-rules', includeInactive],
    queryFn: () => {
      const url = `/api/v1/automation/rules${includeInactive ? '?include_inactive=true' : ''}`
      return getJsonArray<AutomationRule>(url, { requireAuth: true })
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch a single automation rule
 */
export function useAutomationRule(id: string | null | undefined) {
  return useQuery({
    queryKey: ['automation-rule', id],
    queryFn: async () => {
      if (!id) throw new Error('Rule ID required')

      const response = await apiFetch(`/api/v1/automation/rules/${id}`, { requireAuth: true })

      if (!response.ok) {
        throw new Error('Failed to fetch automation rule')
      }

      return response.json() as Promise<AutomationRule>
    },
    enabled: !!id,
  })
}

/**
 * Hook to create an automation rule
 */
export function useCreateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rule: Partial<AutomationRule>) => {
      const response = await apiFetch('/api/v1/automation/rules', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(rule),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(error.error || 'Failed to create automation rule')
      }

      return response.json() as Promise<AutomationRule>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}

/**
 * Hook to update an automation rule
 */
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutomationRule> }) => {
      const response = await apiFetch(`/api/v1/automation/rules/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update automation rule')
      }

      return response.json() as Promise<AutomationRule>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      queryClient.invalidateQueries({ queryKey: ['automation-rule', variables.id] })
    },
  })
}

/**
 * Hook to delete an automation rule
 */
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/automation/rules/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete automation rule')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}

/**
 * Hook to toggle automation rule active status
 */
export function useToggleAutomationRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiFetch(`/api/v1/automation/rules/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle automation rule')
      }

      return response.json() as Promise<AutomationRule>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}
