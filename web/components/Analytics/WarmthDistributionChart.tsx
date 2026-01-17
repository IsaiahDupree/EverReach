'use client'

import { WarmthDistribution } from '@/lib/hooks/useAnalytics'
import { cn } from '@/lib/utils'

interface WarmthDistributionChartProps {
  data: WarmthDistribution[]
  isLoading?: boolean
}

export function WarmthDistributionChart({ data, isLoading }: WarmthDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          No warmth data available
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Warmth Distribution</h3>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.band} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-3 h-3 rounded',
                  item.band === 'hot' && 'bg-red-500',
                  item.band === 'warm' && 'bg-orange-500',
                  item.band === 'cooling' && 'bg-yellow-500',
                  item.band === 'cold' && 'bg-blue-500'
                )} />
                <span className="capitalize font-medium text-gray-900">{item.band}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">{item.count} contacts</span>
                <span className="font-semibold text-gray-900">{item.percentage}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  item.band === 'hot' && 'bg-red-500',
                  item.band === 'warm' && 'bg-orange-500',
                  item.band === 'cooling' && 'bg-yellow-500',
                  item.band === 'cold' && 'bg-blue-500'
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Total Contacts</span>
          <span className="text-2xl font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  )
}
