import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export interface VoiceNote {
  id: string
  type: 'voice'
  title: string
  file_url: string
  transcription?: string
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  duration_seconds?: number
}

/**
 * Hook to fetch all voice notes
 */
export function useVoiceNotes() {
  return useQuery({
    queryKey: ['voice-notes'],
    queryFn: () => getJsonArray<VoiceNote>('/api/v1/me/persona-notes?type=voice', { requireAuth: true }),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Hook to fetch a single voice note
 */
export function useVoiceNote(id: string | null | undefined) {
  return useQuery({
    queryKey: ['voice-note', id],
    queryFn: async () => {
      if (!id) throw new Error('Voice note ID is required')

      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch voice note')
      }

      return response.json() as Promise<VoiceNote>
    },
    enabled: !!id,
  })
}

/**
 * Hook to upload and create a voice note
 */
export function useUploadVoiceNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      // Upload to Supabase storage
      const path = `voice-notes/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(path, file, {
          contentType: file.type || 'audio/m4a',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(path)

      // Create voice note record
      const response = await apiFetch('/api/v1/me/persona-notes', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          type: 'voice',
          title: file.name,
          file_url: publicData.publicUrl,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create note' }))
        throw new Error(error.error || 'Failed to create voice note')
      }

      const result = await response.json()
      return result.note as VoiceNote
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes'] })
    },
  })
}

/**
 * Hook to request transcription for a voice note
 */
export function useTranscribeVoiceNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await apiFetch(`/api/v1/me/persona-notes/${noteId}/transcribe`, {
        method: 'POST',
        requireAuth: true,
      })

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData?.error?.code === 'analytics_opt_in_required') {
          throw new Error('Transcription requires analytics opt-in. Enable it in Settings.')
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Transcription failed' }))
        throw new Error(error.error || 'Failed to start transcription')
      }

      return response.json()
    },
    onSuccess: (_, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes'] })
      queryClient.invalidateQueries({ queryKey: ['voice-note', noteId] })
    },
  })
}

/**
 * Hook to delete a voice note
 */
export function useDeleteVoiceNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/me/persona-notes/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete voice note')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-notes'] })
    },
  })
}
