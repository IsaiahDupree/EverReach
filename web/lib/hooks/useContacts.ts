import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api'

interface Contact {
  id: string
  display_name: string
  company?: string
  title?: string
  emails?: string[]
  phones?: string[]
  tags?: string[]
  notes?: string
  warmth?: number
  watch_status?: 'none' | 'watch' | 'important' | 'vip'
  last_interaction?: string
  location?: string
  timezone?: string
  created_at?: string
  updated_at?: string
}

interface ContactsFilters {
  search?: string
  tags?: string[]
  warmth?: 'hot' | 'warm' | 'cool' | 'cold'
  watch_status?: string
  limit?: number
  offset?: number
}

// Fetch all contacts with optional filters
export function useContacts(filters?: ContactsFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.tags?.length) params.append('tags', filters.tags.join(','))
      if (filters?.warmth) params.append('warmth', filters.warmth)
      if (filters?.watch_status) params.append('watch_status', filters.watch_status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const response = await apiFetch(`/api/v1/contacts?${params}`, { requireAuth: true })
      if (!response.ok) throw new Error('Failed to fetch contacts')
      return response.json() as Promise<Contact[]>
    },
  })
}

// Fetch single contact by ID
export function useContact(id: string | null) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id) throw new Error('Contact ID required')
      const response = await apiFetch(`/api/v1/contacts/${id}`, { requireAuth: true })
      if (!response.ok) throw new Error('Failed to fetch contact')
      return response.json() as Promise<Contact>
    },
    enabled: !!id,
  })
}

// Create new contact
export function useCreateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await apiFetch('/api/v1/contacts', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(contact),
      })
      if (!response.ok) throw new Error('Failed to create contact')
      return response.json() as Promise<Contact>
    },
    onSuccess: () => {
      // Invalidate contacts list to refetch
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Update existing contact
export function useUpdateContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const response = await apiFetch(`/api/v1/contacts/${id}`, {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update contact')
      return response.json() as Promise<Contact>
    },
    onSuccess: (data) => {
      // Update cache for this specific contact
      queryClient.setQueryData(['contact', data.id], data)
      // Invalidate contacts list
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Delete contact
export function useDeleteContact() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/contacts/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })
      if (!response.ok) throw new Error('Failed to delete contact')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Update contact watch status
export function useUpdateWatchStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, watch_status }: { id: string, watch_status: Contact['watch_status'] }) => {
      const response = await apiFetch(`/api/v1/contacts/${id}/watch`, {
        method: 'PUT',
        requireAuth: true,
        body: JSON.stringify({ watch_status }),
      })
      if (!response.ok) throw new Error('Failed to update watch status')
      return response.json() as Promise<Contact>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contact', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Recompute warmth for a contact
export function useRecomputeWarmth() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/api/v1/contacts/${id}/warmth/recompute`, {
        method: 'POST',
        requireAuth: true,
      })
      if (!response.ok) throw new Error('Failed to recompute warmth')
      return response.json() as Promise<Contact>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contact', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
