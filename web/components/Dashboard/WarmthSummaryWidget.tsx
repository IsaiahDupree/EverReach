'use client'

import { Flame, TrendingUp, AlertTriangle, Snowflake } from 'lucide-react'
import { useWarmthSummary } from '@/lib/hooks/useWarmthSummary'
import { cn } from '@/lib/utils'

export function WarmthSummaryWidget() {
  const { data: summary, isLoading, error } = useWarmthSummary()

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load warmth summary</p>
        </div>
      </div>
    )
  }

  const bands = [
    {
      key: 'hot',
      label: 'Hot',
      count: summary.by_band.hot,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: Flame,
      description: '81-100',
    },
    {
      key: 'warm',
      label: 'Warm',
      count: summary.by_band.warm,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: TrendingUp,
      description: '61-80',
    },
    {
      key: 'cooling',
      label: 'Cooling',
      count: summary.by_band.cooling,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: AlertTriangle,
      description: '41-60',
    },
    {
      key: 'cold',
      label: 'Cold',
      count: summary.by_band.cold,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Snowflake,
      description: '0-40',
    },
  ]

  const needsAttentionPercentage = summary.total_contacts > 0
    ? Math.round((summary.contacts_needing_attention / summary.total_contacts) * 100)
    : 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Relationship Health</h2>
          <p className="text-sm text-gray-600 mt-1">
            Overview of {summary.total_contacts} contacts
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {summary.average_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Avg Score</div>
        </div>
      </div>

      {/* Band Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bands.map((band) => {
          const Icon = band.icon
          const percentage = summary.total_contacts > 0
            ? Math.round((band.count / summary.total_contacts) * 100)
            : 0

          return (
            <div
              key={band.key}
              className={cn(
                'rounded-lg border p-4 space-y-2',
                band.bgColor,
                band.borderColor
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className={cn('h-5 w-5', band.color)} />
                <span className={cn('text-xs font-medium', band.color)}>
                  {percentage}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{band.count}</div>
                <div className="text-xs text-gray-600">
                  {band.label} <span className="text-gray-500">({band.description})</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Attention Alert */}
      {summary.contacts_needing_attention > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {summary.contacts_needing_attention} contact{summary.contacts_needing_attention !== 1 ? 's' : ''} need{summary.contacts_needing_attention === 1 ? 's' : ''} attention
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {needsAttentionPercentage}% of your contacts are cooling off or cold. 
                Consider reaching out to maintain these relationships.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Last updated: {new Date(summary.last_updated_at).toLocaleString()}
      </div>
    </div>
  )
}
