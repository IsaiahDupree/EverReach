'use client'

import { TrendingUp, TrendingDown, Users, MessageSquare, Flame, DollarSign } from 'lucide-react'
import { AnalyticsMetrics } from '@/lib/hooks/useAnalytics'
import { cn } from '@/lib/utils'

interface MetricsCardsProps {
  metrics: AnalyticsMetrics
  isLoading?: boolean
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Contacts',
      value: metrics.total_contacts.toLocaleString(),
      change: metrics.contacts_growth,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Interactions',
      value: metrics.total_interactions.toLocaleString(),
      change: metrics.interactions_growth,
      icon: MessageSquare,
      color: 'green',
    },
    {
      title: 'Avg Warmth Score',
      value: Math.round(metrics.avg_warmth_score),
      change: metrics.warmth_growth,
      icon: Flame,
      color: 'orange',
    },
    {
      title: 'Pipeline Value',
      value: formatCurrency(metrics.total_pipeline_value),
      change: 0, // No growth data for now
      icon: DollarSign,
      color: 'purple',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  change: number
  icon: any
  color: string
}) {
  const isPositive = change >= 0
  const hasChange = change !== 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className={cn(
          'p-2 rounded-lg',
          color === 'blue' && 'bg-blue-100',
          color === 'green' && 'bg-green-100',
          color === 'orange' && 'bg-orange-100',
          color === 'purple' && 'bg-purple-100'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            color === 'blue' && 'text-blue-600',
            color === 'green' && 'text-green-600',
            color === 'orange' && 'text-orange-600',
            color === 'purple' && 'text-purple-600'
          )} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {hasChange && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
