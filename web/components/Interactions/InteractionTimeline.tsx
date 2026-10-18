import { formatDate } from '@/lib/utils'
import { InteractionCard } from './InteractionCard'
import { Spinner } from '@/components/ui'

interface Interaction {
  id: string
  contact_id: string
  type: 'call' | 'meeting' | 'message' | 'note' | 'webhook'
  direction?: 'inbound' | 'outbound' | 'internal'
  occurred_at: string
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  action_items?: string[]
}

interface InteractionTimelineProps {
  interactions: Interaction[]
  isLoading?: boolean
  onEdit?: (interaction: Interaction) => void
  onDelete?: (id: string) => void
}

export function InteractionTimeline({ 
  interactions, 
  isLoading, 
  onEdit, 
  onDelete 
}: InteractionTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!interactions || interactions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No interactions yet</h3>
        <p className="text-gray-600">
          Start logging interactions to build a timeline of your relationship.
        </p>
      </div>
    )
  }

  // Group interactions by date
  const groupedInteractions = interactions.reduce((groups, interaction) => {
    const date = new Date(interaction.occurred_at).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(interaction)
    return groups
  }, {} as Record<string, Interaction[]>)

  const sortedDates = Object.keys(groupedInteractions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Header */}
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <h3 className="px-4 text-sm font-semibold text-gray-600">
              {formatDate(date)}
            </h3>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Interactions for this date */}
          <div className="space-y-4">
            {groupedInteractions[date]?.map((interaction) => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
