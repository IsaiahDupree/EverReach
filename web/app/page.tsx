import { QuickActions } from '@/components/Dashboard/QuickActions'
import { WarmthSummaryWidget } from '@/components/Dashboard/WarmthSummaryWidget'
import { WarmthAlertsSummary } from '@/components/Dashboard/WarmthAlertsSummary'
import { RelationshipHealthGrid } from '@/components/Dashboard/RelationshipHealthGrid'
import { RecentActivity } from '@/components/Dashboard/RecentActivity'
import { CustomFieldsSummary } from '@/components/Dashboard/CustomFieldsSummary'
import RequireAuth from '@/components/RequireAuth'

function DashboardContent() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Your relationship intelligence at a glance
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warmth Summary */}
        <WarmthSummaryWidget />
        
        {/* Custom Fields Summary */}
        <CustomFieldsSummary />
      </div>

      {/* Warmth Alerts */}
      <WarmthAlertsSummary />

      {/* Relationship Health Grid */}
      <RelationshipHealthGrid />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}

export default function Page() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}
