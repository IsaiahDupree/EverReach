import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type AnalysisType = 'relationship_health' | 'engagement_suggestions' | 'context_summary' | 'full_analysis'

export interface RelationshipHealth {
  score: number
  trend: 'improving' | 'stable' | 'declining'
  factors: {
    interaction_frequency: number
    response_rate: number
    recency: number
    sentiment: number
  }
  summary: string
}

export interface EngagementSuggestion {
  id: string
  type: 'reach_out' | 'follow_up' | 'celebrate' | 'check_in'
  priority: 'low' | 'medium' | 'high'
  reason: string
  suggested_message?: string
  timing?: string
}

export interface ContactAnalysis {
  relationship_health?: RelationshipHealth
  engagement_suggestions?: EngagementSuggestion[]
  context_summary?: string
  generated_at: string
}

export function useContactAnalysis(contactId: string | null | undefined, type: AnalysisType = 'full_analysis') {
  return useQuery({
    queryKey: ['contact-analysis', contactId, type],
    queryFn: async () => {
      if (!contactId) {
        throw new Error('Contact ID is required')
      }

      const response = await apiFetch('/api/v1/agent/analyze/contact', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contactId,
          type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze contact')
      }

      return response.json() as Promise<ContactAnalysis>
    },
    enabled: !!contactId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })
}
