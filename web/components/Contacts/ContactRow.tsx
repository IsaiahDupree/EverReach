import Link from 'next/link'
import { Building2, Mail, Phone, Eye } from 'lucide-react'
import { getWarmthColor, formatRelativeTime } from '@/lib/utils'

interface Contact {
  id: string
  display_name: string
  company?: string
  title?: string
  emails?: string[]
  phones?: string[]
  tags?: string[]
  warmth?: number
  watch_status?: 'none' | 'watch' | 'important' | 'vip'
  last_interaction?: string
}

interface ContactRowProps {
  contact: Contact
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export function ContactRow({ contact, isSelected, onToggleSelect }: ContactRowProps) {
  const warmthColor = getWarmthColor(contact.warmth)
  
  const watchIcons = {
    vip: '⭐',
    important: '❗',
    watch: '👁️',
    none: null,
  }

  const watchIcon = contact.watch_status && contact.watch_status !== 'none' 
    ? watchIcons[contact.watch_status]
    : null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-md">
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect(contact.id)
          }}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      )}

      <Link
        href={`/contacts/${contact.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        {/* Warmth Indicator */}
        <div className="flex items-center gap-2">
          <div className={`h-10 w-10 rounded-full ${warmthColor} flex items-center justify-center text-white font-bold text-sm`}>
            {contact.warmth ?? '?'}
          </div>
        </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {contact.display_name}
          </h3>
          {watchIcon && (
            <span className="text-sm" title={contact.watch_status}>
              {watchIcon}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
          {contact.company && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              {contact.company}
              {contact.title && ` • ${contact.title}`}
            </span>
          )}
          {contact.emails && contact.emails.length > 0 && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 flex-shrink-0" />
              {contact.emails[0]}
            </span>
          )}
          {contact.phones && contact.phones.length > 0 && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {contact.phones[0]}
            </span>
          )}
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                +{contact.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

        {/* Last Interaction */}
        {contact.last_interaction && (
          <div className="text-right text-xs text-gray-500">
            <div>Last contact:</div>
            <div className="font-medium">{formatRelativeTime(contact.last_interaction)}</div>
          </div>
        )}
      </Link>
    </div>
  )
}
