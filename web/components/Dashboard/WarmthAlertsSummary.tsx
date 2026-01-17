"use client"

import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { useAlerts } from '@/lib/hooks/useAlerts'
import { Skeleton } from '@/components/ui'

export function WarmthAlertsSummary() {
  const { data: alerts, isLoading } = useAlerts()

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const activeAlerts = alerts?.filter(
    (a) => !a.dismissed_at && (!a.snoozed_until || new Date(a.snoozed_until) < new Date())
  ) || []

  if (activeAlerts.length === 0) {
    return null // Don't show if no alerts
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-orange-500 p-2">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {activeAlerts.length} Contact{activeAlerts.length !== 1 ? 's' : ''} Going Cold
            </h3>
            <p className="text-sm text-gray-600">
              Watched contacts have dropped below warmth threshold
            </p>
          </div>
        </div>
        <Link
          href="/alerts"
          className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Review
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Preview first 3 alerts */}
      <div className="mt-4 space-y-2">
        {activeAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-md bg-white p-3 text-sm"
          >
            <span className="font-medium text-gray-900">{alert.contact_name}</span>
            <span className="text-gray-500">
              Warmth: {alert.current_warmth} (threshold: {alert.threshold})
            </span>
          </div>
        ))}
        {activeAlerts.length > 3 && (
          <p className="text-center text-sm text-gray-600 pt-2">
            +{activeAlerts.length - 3} more
          </p>
        )}
      </div>
    </div>
  )
}
