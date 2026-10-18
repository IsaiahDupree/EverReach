'use client'

import { useDashboardOverview, useRecentErrors } from '@/lib/hooks/useAdmin'
import { MetricCard } from '@/components/admin/shared/MetricCard'
import { UserGrowthChart } from '@/components/admin/dashboard/UserGrowthChart'
import { SystemHealthCard } from '@/components/admin/dashboard/SystemHealthCard'
import { ActiveExperimentsCard } from '@/components/admin/dashboard/ActiveExperimentsCard'
import { TopEndpointsTable } from '@/components/admin/dashboard/TopEndpointsTable'
import { RecentErrorsList } from '@/components/admin/dashboard/RecentErrorsList'
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Zap,
  AlertTriangle,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: overview, isLoading } = useDashboardOverview()
  const { data: recentErrors } = useRecentErrors(10)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monitor system health, user growth, and performance metrics
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview?.users?.total || 0}
          change={overview?.users?.growth_7d || 0}
          icon={Users}
          trend={overview?.users?.growth_7d >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Active Users (7d)"
          value={overview?.users?.active_7d || 0}
          change={overview?.users?.active_change || 0}
          icon={Activity}
          trend={overview?.users?.active_change >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="MRR"
          value={`$${((overview?.revenue?.mrr || 0) / 100).toLocaleString()}`}
          change={overview?.revenue?.mrr_growth || 0}
          icon={DollarSign}
          trend={overview?.revenue?.mrr_growth >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="API Requests (24h)"
          value={overview?.api?.requests_24h || 0}
          change={overview?.api?.requests_change || 0}
          icon={Zap}
          trend={overview?.api?.requests_change >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* System Health & User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard
          uptime={overview?.system?.uptime || 0}
          errorRate={overview?.system?.error_rate || 0}
          avgLatency={overview?.system?.avg_latency || 0}
        />
        <UserGrowthChart data={overview?.users?.growth_data || []} />
      </div>

      {/* Active Experiments */}
      {overview?.experiments && overview.experiments.length > 0 && (
        <ActiveExperimentsCard experiments={overview.experiments} />
      )}

      {/* Top Endpoints & Recent Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopEndpointsTable endpoints={overview?.api?.top_endpoints || []} />
        <RecentErrorsList errors={recentErrors || []} />
      </div>

      {/* Alert if error rate is high */}
      {overview?.system?.error_rate > 1 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">High Error Rate Detected</h3>
            <p className="text-sm text-red-700 mt-1">
              Error rate is at {overview.system.error_rate.toFixed(2)}%. Consider
              investigating recent deployments or infrastructure issues.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
