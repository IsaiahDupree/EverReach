'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import { MetricsCards } from '@/components/Analytics/MetricsCards'
import { ActivityChart } from '@/components/Analytics/ActivityChart'
import { WarmthDistributionChart } from '@/components/Analytics/WarmthDistributionChart'
import { 
  useAnalyticsMetrics, 
  useActivityData, 
  useWarmthDistribution,
  useTopContacts 
} from '@/lib/hooks/useAnalytics'
import RequireAuth from '@/components/RequireAuth'
import { formatDateTime } from '@/lib/utils'

type Period = 'week' | 'month' | 'quarter' | 'year'

const periodOptions = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last 3 Months' },
  { value: 'year', label: 'Last Year' },
]

function AnalyticsPageContent() {
  const [period, setPeriod] = useState<Period>('month')

  const { data: metrics, isLoading: metricsLoading } = useAnalyticsMetrics(period)
  const { data: activityData, isLoading: activityLoading } = useActivityData(period === 'year' ? 'quarter' : period)
  const { data: warmthData, isLoading: warmthLoading } = useWarmthDistribution()
  const { data: topContacts, isLoading: topContactsLoading } = useTopContacts(10)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track your relationship management performance
            </p>
          </div>
        </div>

        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          options={periodOptions}
          className="w-48"
        />
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Analytics Overview</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Track metrics</strong> across different time periods</li>
          <li>• <strong>Monitor activity</strong> trends and patterns</li>
          <li>• <strong>Analyze warmth distribution</strong> across your network</li>
          <li>• <strong>Identify top contacts</strong> based on engagement</li>
        </ul>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <MetricsCards metrics={metrics} isLoading={metricsLoading} />
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        {activityData && (
          <ActivityChart data={activityData} isLoading={activityLoading} />
        )}

        {/* Warmth Distribution */}
        {warmthData && (
          <WarmthDistributionChart data={warmthData} isLoading={warmthLoading} />
        )}
      </div>

      {/* Top Contacts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Contacts</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>

        {topContactsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : topContacts && topContacts.length > 0 ? (
          <div className="space-y-3">
            {topContacts.map((contact, index) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{contact.display_name}</h4>
                  <p className="text-sm text-gray-500">
                    {contact.interaction_count} interactions • Last: {formatDateTime(contact.last_touch_at)}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">Warmth Score</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {contact.warmth_score}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No contact data available
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h4 className="font-medium text-gray-700">Active Goals</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics?.active_goals || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {metrics?.goals_completion_rate || 0}% completion rate
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h4 className="font-medium text-gray-700">Active Pipelines</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics?.active_pipelines || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tracking deals and opportunities
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h4 className="font-medium text-gray-700">Average Warmth</h4>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics?.avg_warmth_score ? Math.round(metrics.avg_warmth_score) : 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {(metrics?.warmth_growth ?? 0) >= 0 ? '+' : ''}{metrics?.warmth_growth ?? 0}% from last period
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsPageContent />
    </RequireAuth>
  )
}
