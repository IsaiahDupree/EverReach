import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { CustomFieldDefinition, CustomFieldValue } from '@/lib/types/customFields'

/**
 * Hook to fetch custom field definitions for an entity
 */
export function useCustomFieldDefs(entity: 'contact' | 'interaction' = 'contact') {
  return useQuery({
    queryKey: ['custom-field-defs', entity],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/custom-fields?entity=${entity}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch custom field definitions')
      }

      return response.json() as Promise<CustomFieldDefinition[]>
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })
}

/**
 * Hook to create a new custom field definition
 */
export function useCreateCustomFieldDef() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fieldDef: Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await apiFetch('/api/v1/custom-fields', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(fieldDef),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create field' }))
        throw new Error(error.error || 'Failed to create field definition')
      }

      return response.json() as Promise<CustomFieldDefinition>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-defs', variables.entity] })
    },
  })
}

/**
 * Hook to update a custom field definition
 */
export function useUpdateCustomFieldDef() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, entity, updates }: { 
      id: string
      entity: string
      updates: Partial<CustomFieldDefinition> 
    }) => {
      const response = await apiFetch(`/api/v1/custom-fields/${id}`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update field definition')
      }

      return response.json() as Promise<CustomFieldDefinition>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-defs', variables.entity] })
    },
  })
}

/**
 * Hook to delete a custom field definition
 */
export function useDeleteCustomFieldDef() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, entity }: { id: string; entity: string }) => {
      const response = await apiFetch(`/api/v1/custom-fields/${id}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete field definition')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-defs', variables.entity] })
    },
  })
}

/**
 * Hook to fetch custom field values for a contact
 */
export function useCustomFieldValues(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ['custom-field-values', contactId],
    queryFn: async () => {
      if (!contactId) {
        throw new Error('Contact ID is required')
      }

      const response = await apiFetch(`/api/v1/contacts/${contactId}/custom`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch custom field values')
      }

      return response.json() as Promise<CustomFieldValue>
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Hook to update custom field values for a contact
 */
export function useUpdateCustomFieldValues() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contactId, values }: { contactId: string; values: CustomFieldValue }) => {
      const response = await apiFetch(`/api/v1/contacts/${contactId}/custom`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update values' }))
        throw new Error(error.error || 'Failed to update custom field values')
      }

      return response.json() as Promise<CustomFieldValue>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] })
    },
  })
}

/**
 * Helper hook to get active field definitions
 */
export function useActiveCustomFields(entity: 'contact' | 'interaction' = 'contact') {
  const { data: allFields, ...rest } = useCustomFieldDefs(entity)
  
  const activeFields = allFields?.filter(field => field.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return {
    ...rest,
    data: activeFields,
  }
}
