'use client'

import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { ActivityData } from '@/lib/hooks/useAnalytics'

interface ActivityChartProps {
  data: ActivityData[]
  isLoading?: boolean
}

export function ActivityChart({ data, isLoading }: ActivityChartProps) {
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
          No activity data available
        </div>
      </div>
    )
  }

  const maxInteractions = Math.max(...data.map(d => d.interactions))
  const maxContacts = Math.max(...data.map(d => d.contacts_added))
  const maxValue = Math.max(maxInteractions, maxContacts)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Timeline</h3>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">Interactions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Contacts Added</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.date} className="space-y-2">
            <div className="text-xs text-gray-500">
              {formatDate(item.date)}
            </div>
            <div className="flex items-center gap-2">
              {/* Interactions Bar */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-24 text-xs text-gray-600">Interactions</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full flex items-center justify-end px-2 transition-all"
                      style={{ width: `${(item.interactions / maxValue) * 100}%` }}
                    >
                      {item.interactions > 0 && (
                        <span className="text-xs text-white font-medium">
                          {item.interactions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Contacts Bar */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-24 text-xs text-gray-600">Contacts</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-green-500 h-full flex items-center justify-end px-2 transition-all"
                      style={{ width: `${(item.contacts_added / maxValue) * 100}%` }}
                    >
                      {item.contacts_added > 0 && (
                        <span className="text-xs text-white font-medium">
                          {item.contacts_added}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
