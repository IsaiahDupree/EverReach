import { useQuery } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'

export interface SearchResult {
  id: string
  type: 'contact' | 'interaction' | 'note' | 'template'
  title: string
  subtitle?: string
  description?: string
  url: string
  metadata?: {
    warmth_score?: number
    warmth_band?: string
    last_touch_at?: string
    tags?: string[]
    channel?: string
    occurred_at?: string
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

/**
 * Hook to perform global search across all entities
 */
export function useGlobalSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { results: [], total: 0, query: '' } as SearchResponse
      }

      const response = await apiFetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=20`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      return response.json() as Promise<SearchResponse>
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30 * 1000, // Cache for 30 seconds
  })
}

/**
 * Hook to search specific entity type
 */
export function useEntitySearch(
  type: 'contacts' | 'interactions' | 'notes' | 'templates',
  query: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['entity-search', type, query],
    queryFn: () => {
      if (!query || query.trim().length < 2) {
        return []
      }
      return getJsonArray<SearchResult>(
        `/api/v1/search/${type}?q=${encodeURIComponent(query)}&limit=10`,
        { requireAuth: true }
      )
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30 * 1000,
    retry: 1, // Retry once on transient failures
  })
}

/**
 * Format search result for display
 */
export function formatSearchResult(result: SearchResult): {
  icon: string
  badge?: string
  badgeColor?: string
} {
  switch (result.type) {
    case 'contact':
      return {
        icon: '👤',
        badge: result.metadata?.warmth_band,
        badgeColor: getWarmthColor(result.metadata?.warmth_band),
      }
    case 'interaction':
      return {
        icon: getChannelIcon(result.metadata?.channel),
        badge: result.metadata?.channel,
      }
    case 'note':
      return {
        icon: '📝',
      }
    case 'template':
      return {
        icon: '📄',
        badge: result.metadata?.channel,
      }
    default:
      return { icon: '📄' }
  }
}

function getChannelIcon(channel?: string): string {
  switch (channel) {
    case 'email':
      return '📧'
    case 'sms':
      return '💬'
    case 'call':
      return '📞'
    case 'meeting':
      return '🤝'
    case 'dm':
      return '💬'
    default:
      return '📬'
  }
}

function getWarmthColor(band?: string): string {
  switch (band) {
    case 'hot':
      return 'red'
    case 'warm':
      return 'orange'
    case 'cooling':
      return 'yellow'
    case 'cold':
      return 'blue'
    default:
      return 'gray'
  }
}
