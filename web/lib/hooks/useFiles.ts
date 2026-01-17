import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { UploadedFile } from '@/lib/types/files'

/**
 * Hook to fetch files
 */
export function useFiles(contactId?: string) {
  const queryParams = contactId ? `?contact_id=${contactId}` : ''
  
  return useQuery({
    queryKey: ['files', contactId],
    queryFn: () => getJsonArray<UploadedFile>(`/api/v1/files${queryParams}`, { requireAuth: true }),
    staleTime: 2 * 60 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to upload files
 */
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      file, 
      contactId,
      description,
      tags,
    }: { 
      file: File
      contactId?: string
      description?: string
      tags?: string[]
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (contactId) formData.append('contact_id', contactId)
      if (description) formData.append('description', description)
      if (tags) formData.append('tags', JSON.stringify(tags))

      const response = await apiFetch('/api/v1/files/upload', {
        method: 'POST',
        requireAuth: true,
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(error.error || 'Failed to upload file')
      }

      return response.json() as Promise<UploadedFile>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ['files', variables.contactId] })
      }
    },
  })
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/files/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

/**
 * Hook to update file metadata
 */
export function useUpdateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: { description?: string; tags?: string[] }
    }) => {
      const response = await apiFetch(`/api/v1/files/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update file')
      }

      return response.json() as Promise<UploadedFile>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}
