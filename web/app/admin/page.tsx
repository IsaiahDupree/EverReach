'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Database, Activity, Settings, Shield, TrendingUp } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import {
  useSystemStats,
  useOrganizationSettings,
  useUpdateOrganization,
  useActivityLogs,
} from '@/lib/hooks/useAdmin'
import {
  AVAILABLE_FEATURES,
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/lib/types/admin'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'
import { cn } from '@/lib/utils'

type AdminTab = 'overview' | 'organization' | 'features' | 'activity'

function AdminPageContent() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  const { data: stats } = useSystemStats()
  const { data: orgSettings } = useOrganizationSettings()
  const updateOrg = useUpdateOrganization()
  const { data: activityLogs } = useActivityLogs(100)

  const [orgData, setOrgData] = useState({
    name: '',
    timezone: '',
    currency: '',
  })

  // Load org data when available
  useState(() => {
    if (orgSettings) {
      setOrgData({
        name: orgSettings.name || '',
        timezone: orgSettings.timezone || '',
        currency: orgSettings.currency || '',
      })
    }
  })

  const handleSaveOrg = async () => {
    try {
      await updateOrg.mutateAsync(orgData)
      showToast('success', 'Organization settings updated')
    } catch (error) {
      showToast('error', 'Failed to update settings')
    }
  }

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: TrendingUp },
    { id: 'organization' as AdminTab, label: 'Organization', icon: Settings },
    { id: 'features' as AdminTab, label: 'Features', icon: Shield },
    { id: 'activity' as AdminTab, label: 'Activity', icon: Activity },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-600 mt-1">System configuration and management</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Admin Dashboard</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Monitor system</strong> - View stats and usage metrics</li>
          <li>• <strong>Configure organization</strong> - Set timezone, currency, and branding</li>
          <li>• <strong>Manage features</strong> - Enable/disable features for your team</li>
          <li>• <strong>Track activity</strong> - Monitor user actions and system events</li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Total Users"
                value={stats.total_users}
                color="blue"
              />
              <StatCard
                icon={<Database className="h-5 w-5" />}
                label="Total Contacts"
                value={stats.total_contacts}
                color="green"
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                label="Interactions"
                value={stats.total_interactions}
                color="purple"
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Avg Warmth"
                value={Math.round(stats.avg_warmth_score)}
                color="orange"
              />
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Active Today</div>
                <div className="text-2xl font-bold text-gray-900">{stats.active_users_today}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Active This Week</div>
                <div className="text-2xl font-bold text-gray-900">{stats.active_users_week}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Storage Used</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(stats.storage_used_mb / 1024).toFixed(1)} GB
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  of {(stats.storage_limit_mb / 1024).toFixed(0)} GB
                </div>
              </div>
            </div>

            {/* Storage Progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Storage Usage</span>
                <span className="text-gray-600">
                  {((stats.storage_used_mb / stats.storage_limit_mb) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all',
                    (stats.storage_used_mb / stats.storage_limit_mb) > 0.9
                      ? 'bg-red-500'
                      : (stats.storage_used_mb / stats.storage_limit_mb) > 0.7
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  )}
                  style={{ width: `${(stats.storage_used_mb / stats.storage_limit_mb) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'organization' && orgSettings && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>

            <div className="space-y-4">
              <Input
                label="Organization Name"
                value={orgData.name}
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                placeholder="My Organization"
              />

              <Select
                label="Timezone"
                value={orgData.timezone}
                onChange={(e) => setOrgData({ ...orgData, timezone: e.target.value })}
                options={TIMEZONE_OPTIONS}
              />

              <Select
                label="Currency"
                value={orgData.currency}
                onChange={(e) => setOrgData({ ...orgData, currency: e.target.value })}
                options={CURRENCY_OPTIONS}
              />

              <div className="pt-4">
                <Button
                  onClick={handleSaveOrg}
                  isLoading={updateOrg.isPending}
                >
                  Save Settings
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Organization Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Users:</span>
                  <span className="font-medium text-gray-900">{orgSettings.max_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage Limit:</span>
                  <span className="font-medium text-gray-900">{orgSettings.storage_limit_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">{formatDateTime(orgSettings.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && orgSettings && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Feature Management</h2>
            
            <div className="space-y-3">
              {AVAILABLE_FEATURES.map((feature) => {
                const isEnabled = orgSettings.features_enabled?.includes(feature.id)
                
                return (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{feature.label}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {/* Handle toggle */}}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'activity' && activityLogs && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>

            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                  <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{log.user_email}</span> {log.action}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.resource_type} • {formatDateTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          'p-2 rounded-lg',
          color === 'blue' && 'bg-blue-100 text-blue-600',
          color === 'green' && 'bg-green-100 text-green-600',
          color === 'purple' && 'bg-purple-100 text-purple-600',
          color === 'orange' && 'bg-orange-100 text-orange-600'
        )}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminPageContent />
    </RequireAuth>
  )
}
