"use client"

import { Bell, BellOff, Check, Clock } from 'lucide-react'
import Link from 'next/link'
import { useAlerts, useAlertAction } from '@/lib/hooks/useAlerts'
import { Button, Spinner } from '@/components/ui'
import RequireAuth from '@/components/RequireAuth'

function AlertsContent() {
  const { data: alerts, isLoading, error } = useAlerts()
  const { mutate: takeAction, isPending } = useAlertAction()

  const handleAction = (id: string, action: 'dismiss' | 'snooze' | 'reached_out') => {
    takeAction({ id, action })
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load warmth alerts. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Warmth Alerts</h1>
        <p className="text-gray-600 mt-1">
          Contacts that need your attention
        </p>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              data-testid="alert-item"
              className="alert-card rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Bell className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <Link 
                      href={`/contacts/${alert.contact_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {alert.contact_name || 'Unknown Contact'}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      Warmth dropped to <span className="font-medium text-orange-600">{alert.current_warmth}</span> (threshold: {alert.threshold})
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(alert.triggered_at).toLocaleDateString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(alert.id, 'dismiss')}
                  disabled={isPending}
                  data-action="dismiss"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Dismiss
                </button>
                <button
                  onClick={() => handleAction(alert.id, 'snooze')}
                  disabled={isPending}
                  data-action="snooze"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze
                </button>
                <button
                  onClick={() => handleAction(alert.id, 'reached_out')}
                  disabled={isPending}
                  data-action="reached_out"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Reached Out
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 font-medium">No warmth alerts</p>
          <p className="text-sm text-gray-500">
            All caught up! You'll see alerts here when contacts need attention.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  return (
    <RequireAuth>
      <AlertsContent />
    </RequireAuth>
  )
}
