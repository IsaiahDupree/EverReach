import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type BulkAction = 
  | 'add_tags'
  | 'remove_tags'
  | 'set_watch'
  | 'unset_watch'
  | 'add_to_pipeline'
  | 'archive'
  | 'delete'
  | 'export'

export interface BulkOperationPayload {
  contact_ids: string[]
  action: BulkAction
  params?: Record<string, any>
}

export interface BulkOperationResult {
  success: number
  failed: number
  errors?: Array<{ contact_id: string; error: string }>
}

/**
 * Hook to perform bulk operations on contacts
 */
export function useBulkOperation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: BulkOperationPayload) => {
      const response = await apiFetch('/api/v1/contacts/bulk', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Bulk operation failed' }))
        throw new Error(error.error || 'Bulk operation failed')
      }

      return response.json() as Promise<BulkOperationResult>
    },
    onSuccess: () => {
      // Invalidate contacts queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

/**
 * Hook to add tags to multiple contacts
 */
export function useBulkAddTags() {
  const bulkOp = useBulkOperation()

  return useMutation({
    mutationFn: async ({ contactIds, tags }: { contactIds: string[]; tags: string[] }) => {
      return bulkOp.mutateAsync({
        contact_ids: contactIds,
        action: 'add_tags',
        params: { tags },
      })
    },
  })
}

/**
 * Hook to remove tags from multiple contacts
 */
export function useBulkRemoveTags() {
  const bulkOp = useBulkOperation()

  return useMutation({
    mutationFn: async ({ contactIds, tags }: { contactIds: string[]; tags: string[] }) => {
      return bulkOp.mutateAsync({
        contact_ids: contactIds,
        action: 'remove_tags',
        params: { tags },
      })
    },
  })
}

/**
 * Hook to set watch status for multiple contacts
 */
export function useBulkSetWatch() {
  const bulkOp = useBulkOperation()

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      return bulkOp.mutateAsync({
        contact_ids: contactIds,
        action: 'set_watch',
      })
    },
  })
}

/**
 * Hook to add multiple contacts to pipeline
 */
export function useBulkAddToPipeline() {
  const bulkOp = useBulkOperation()

  return useMutation({
    mutationFn: async ({ 
      contactIds, 
      pipelineId, 
      stageId 
    }: { 
      contactIds: string[]
      pipelineId: string
      stageId: string
    }) => {
      return bulkOp.mutateAsync({
        contact_ids: contactIds,
        action: 'add_to_pipeline',
        params: { pipeline_id: pipelineId, stage_id: stageId },
      })
    },
  })
}

/**
 * Hook to delete multiple contacts
 */
export function useBulkDelete() {
  const bulkOp = useBulkOperation()

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      return bulkOp.mutateAsync({
        contact_ids: contactIds,
        action: 'delete',
      })
    },
  })
}

/**
 * Hook to export contacts
 */
export function useBulkExport() {
  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const response = await apiFetch('/api/v1/contacts/export', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ contact_ids: contactIds }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      return { success: contactIds.length, failed: 0 }
    },
  })
}
