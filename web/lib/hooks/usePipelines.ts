import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { Pipeline, PipelineStage, ContactInPipeline, PipelineMetrics } from '@/lib/types/pipelines'

/**
 * Hook to fetch all pipelines
 */
export function usePipelines(includeArchived: boolean = false) {
  return useQuery({
    queryKey: ['pipelines', includeArchived],
    queryFn: () => {
      const url = `/api/v1/pipelines${includeArchived ? '?include_archived=true' : ''}`
      return getJsonArray<Pipeline>(url, { requireAuth: true })
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch a single pipeline with stages
 */
export function usePipeline(id: string | null | undefined) {
  return useQuery({
    queryKey: ['pipeline', id],
    queryFn: async () => {
      if (!id) throw new Error('Pipeline ID required')

      const response = await apiFetch(`/api/v1/pipelines/${id}`, { requireAuth: true })

      if (!response.ok) {
        throw new Error('Failed to fetch pipeline')
      }

      return response.json() as Promise<Pipeline & { stages: PipelineStage[] }>
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch contacts in a pipeline
 */
export function usePipelineContacts(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ['pipeline-contacts', pipelineId],
    queryFn: () => {
      if (!pipelineId) throw new Error('Pipeline ID required')
      return getJsonArray<ContactInPipeline>(`/api/v1/pipelines/${pipelineId}/contacts`, { requireAuth: true })
    },
    enabled: !!pipelineId,
    staleTime: 2 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch pipeline metrics
 */
export function usePipelineMetrics(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ['pipeline-metrics', pipelineId],
    queryFn: async () => {
      if (!pipelineId) throw new Error('Pipeline ID required')

      const response = await apiFetch(`/api/v1/pipelines/${pipelineId}/metrics`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pipeline metrics')
      }

      return response.json() as Promise<PipelineMetrics>
    },
    enabled: !!pipelineId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a pipeline
 */
export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pipeline: Partial<Pipeline>) => {
      const response = await apiFetch('/api/v1/pipelines', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(pipeline),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create' }))
        throw new Error(error.error || 'Failed to create pipeline')
      }

      return response.json() as Promise<Pipeline>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

/**
 * Hook to update a pipeline
 */
export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pipeline> }) => {
      const response = await apiFetch(`/api/v1/pipelines/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update pipeline')
      }

      return response.json() as Promise<Pipeline>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', variables.id] })
    },
  })
}

/**
 * Hook to delete a pipeline
 */
export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/pipelines/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete pipeline')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

/**
 * Hook to move contact to different stage
 */
export function useMoveContactToStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contactId, stageId }: { contactId: string; stageId: string }) => {
      const response = await apiFetch(`/api/v1/pipeline-contacts/${contactId}/move`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ stage_id: stageId }),
      })

      if (!response.ok) {
        throw new Error('Failed to move contact')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-contacts'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] })
    },
  })
}

/**
 * Hook to add contact to pipeline
 */
export function useAddContactToPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      contact_id: string
      pipeline_id: string
      stage_id: string
      expected_value?: number
      probability?: number
    }) => {
      const response = await apiFetch('/api/v1/pipeline-contacts', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to add contact to pipeline')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-contacts'] })
    },
  })
}

/**
 * Hook to remove contact from pipeline
 */
export function useRemoveContactFromPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/pipeline-contacts/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to remove contact from pipeline')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-contacts'] })
    },
  })
}
