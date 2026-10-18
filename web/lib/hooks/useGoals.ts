import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { Goal, GoalProgress, GoalStatus } from '@/lib/types/goals'

/**
 * Hook to fetch all goals
 */
export function useGoals(filters?: { status?: GoalStatus; active_only?: boolean }) {
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.active_only) queryParams.set('active_only', 'true')

  return useQuery({
    queryKey: ['goals', filters],
    queryFn: () => {
      const url = `/api/v1/goals${queryParams.toString() ? `?${queryParams}` : ''}`
      return getJsonArray<Goal>(url, { requireAuth: true })
    },
    staleTime: 2 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch a single goal
 */
export function useGoal(id: string | null | undefined) {
  return useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      if (!id) throw new Error('Goal ID required')

      const response = await apiFetch(`/api/v1/goals/${id}`, { requireAuth: true })

      if (!response.ok) {
        throw new Error('Failed to fetch goal')
      }

      return response.json() as Promise<Goal>
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch goal progress history
 */
export function useGoalProgress(goalId: string | null | undefined) {
  return useQuery({
    queryKey: ['goal-progress', goalId],
    queryFn: () => {
      if (!goalId) throw new Error('Goal ID required')
      return getJsonArray<GoalProgress>(`/api/v1/goals/${goalId}/progress`, { requireAuth: true })
    },
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to create a goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goal: Partial<Goal>) => {
      const response = await apiFetch('/api/v1/goals', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(goal),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(error.error || 'Failed to create goal')
      }

      return response.json() as Promise<Goal>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

/**
 * Hook to update a goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const response = await apiFetch(`/api/v1/goals/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update goal')
      }

      return response.json() as Promise<Goal>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goal', variables.id] })
    },
  })
}

/**
 * Hook to delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/goals/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete goal')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

/**
 * Hook to update goal progress
 */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, value, notes }: { goalId: string; value: number; notes?: string }) => {
      const response = await apiFetch(`/api/v1/goals/${goalId}/progress`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ value, notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update progress')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] })
      queryClient.invalidateQueries({ queryKey: ['goal-progress', variables.goalId] })
    },
  })
}

/**
 * Hook to complete a goal
 */
export function useCompleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/goals/${id}/complete`, {
        method: 'POST',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to complete goal')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}
