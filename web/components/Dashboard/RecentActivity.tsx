"use client"

import Link from 'next/link'
import { Phone, Video, MessageCircle, FileText, ExternalLink } from 'lucide-react'
import { useInteractions } from '@/lib/hooks/useInteractions'
import { Skeleton } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'

export function RecentActivity() {
  const { data: interactions, isLoading } = useInteractions({ limit: 10 })

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!interactions || interactions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-center py-8">
          No interactions yet. Start by adding contacts or logging interactions.
        </p>
      </div>
    )
  }

  const typeIcons = {
    call: Phone,
    meeting: Video,
    message: MessageCircle,
    note: FileText,
    webhook: ExternalLink,
  }

  const typeColors = {
    call: 'bg-blue-100 text-blue-600',
    meeting: 'bg-purple-100 text-purple-600',
    message: 'bg-green-100 text-green-600',
    note: 'bg-gray-100 text-gray-600',
    webhook: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link
          href={"/interactions" as any}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {(interactions || []).map((interaction) => {
          const Icon = typeIcons[interaction.type] || FileText
          const colorClass = typeColors[interaction.type] || typeColors.note

          return (
            <div
              key={interaction.id}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className={`rounded-full p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)}
                    {interaction.direction && (
                      <span className="text-gray-500 font-normal">
                        {' '}• {interaction.direction}
                      </span>
                    )}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatRelativeTime(interaction.occurred_at)}
                  </span>
                </div>
                {interaction.summary && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {interaction.summary}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
