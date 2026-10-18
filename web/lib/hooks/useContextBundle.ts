import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ContextBundle {
  contact: {
    id: string
    name: string
    display_name?: string
    emails?: string[]
    phones?: string[]
    tags?: string[]
    warmth_score?: number
    warmth_band?: string
    last_touch_at?: string
    custom_fields?: Record<string, any>
    company?: string
    location?: string
  }
  interactions: Array<{
    id: string
    channel: string
    direction: 'inbound' | 'outbound'
    summary?: string
    sentiment?: string
    occurred_at: string
  }>
  pipeline?: {
    pipeline_id: string
    pipeline_name: string
    stage_id: string
    stage_name: string
  }
  tasks?: Array<{
    id: string
    title: string
    due_date?: string
    status: string
  }>
  context: {
    prompt_skeleton: string
    brand_rules?: {
      tone?: string
      do?: string[]
      dont?: string[]
    }
    preferred_channel?: 'email' | 'sms' | 'dm' | 'call'
    quiet_hours?: {
      start?: string
      end?: string
    }
    flags: {
      dnc: boolean
      requires_approval: boolean
    }
  }
  meta: {
    generated_at: string
    token_estimate: number
  }
}

export interface ContextBundleOptions {
  interactions?: number // Number of interactions to include (default 20, max 50)
}

/**
 * Hook to fetch the complete context bundle for a contact
 * This is the most important endpoint for AI agents - provides LLM-ready context
 */
export function useContextBundle(
  contactId: string | null | undefined,
  options: ContextBundleOptions = {}
) {
  const { interactions = 20 } = options

  return useQuery({
    queryKey: ['context-bundle', contactId, interactions],
    queryFn: async () => {
      if (!contactId) {
        throw new Error('Contact ID is required')
      }

      const params = new URLSearchParams()
      if (interactions) {
        params.append('interactions', interactions.toString())
      }

      const url = `/api/v1/contacts/${contactId}/context-bundle${
        params.toString() ? `?${params.toString()}` : ''
      }`

      const response = await apiFetch(url, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to fetch context bundle')
      }

      return response.json() as Promise<ContextBundle>
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Extract just the prompt skeleton from context bundle
 */
export function usePromptSkeleton(contactId: string | null | undefined) {
  const { data, ...rest } = useContextBundle(contactId, { interactions: 10 })
  
  return {
    ...rest,
    promptSkeleton: data?.context.prompt_skeleton,
  }
}

/**
 * Check if contact has any blocking flags (DNC, requires approval)
 */
export function useContactFlags(contactId: string | null | undefined) {
  const { data, ...rest } = useContextBundle(contactId, { interactions: 0 })
  
  return {
    ...rest,
    flags: data?.context.flags,
    isDNC: data?.context.flags.dnc || false,
    requiresApproval: data?.context.flags.requires_approval || false,
  }
}
