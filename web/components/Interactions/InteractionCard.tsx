import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  FileText,
  Webhook,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

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

interface InteractionCardProps {
  interaction: Interaction
  showContact?: boolean
  onEdit?: (interaction: Interaction) => void
  onDelete?: (id: string) => void
}

const iconMap = {
  call: Phone,
  meeting: Calendar,
  message: MessageSquare,
  note: FileText,
  webhook: Webhook,
}

const sentimentMap = {
  positive: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50' },
  neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50' },
  negative: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50' },
}

const directionLabels = {
  inbound: 'Incoming',
  outbound: 'Outgoing',
  internal: 'Internal',
}

export function InteractionCard({ interaction, onEdit, onDelete }: InteractionCardProps) {
  const Icon = iconMap[interaction.type]
  const sentiment = interaction.sentiment ? sentimentMap[interaction.sentiment] : null
  const SentimentIcon = sentiment?.icon

  return (
    <div className="flex gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 capitalize">
              {interaction.type}
            </h4>
            {interaction.direction && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {directionLabels[interaction.direction]}
              </span>
            )}
            {sentiment && SentimentIcon && (
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sentiment.bg}`}>
                <SentimentIcon className={`w-3 h-3 ${sentiment.color}`} />
                <span className={sentiment.color}>{interaction.sentiment}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatRelativeTime(interaction.occurred_at)}
          </span>
        </div>

        {interaction.summary && (
          <p className="mt-2 text-sm text-gray-700 line-clamp-3">
            {interaction.summary}
          </p>
        )}

        {interaction.action_items && interaction.action_items.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Action Items:</p>
            <ul className="space-y-1">
              {interaction.action_items.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(onEdit || onDelete) && (
          <div className="mt-3 flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(interaction)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(interaction.id)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
