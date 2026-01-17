'use client'

import { useState, useEffect } from 'react'
import { Button, Checkbox, Select } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'
import { SettingsLayout } from '@/components/Settings/SettingsLayout'

const warmthThresholds = [
  { value: '20', label: '20 (Cold)' },
  { value: '30', label: '30' },
  { value: '40', label: '40 (Cool)' },
  { value: '50', label: '50' },
  { value: '60', label: '60' },
]

export default function NotificationSettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    warmth_alerts: true,
    email_notifications: true,
    push_notifications: false,
    warmth_threshold: '40',
    daily_digest: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Load notification preferences from user metadata or database
      const preferences = user.user_metadata?.notification_preferences || {}
      
      setFormData({
        warmth_alerts: preferences.warmth_alerts ?? true,
        email_notifications: preferences.email_notifications ?? true,
        push_notifications: preferences.push_notifications ?? false,
        warmth_threshold: preferences.warmth_threshold ?? '40',
        daily_digest: preferences.daily_digest ?? true,
      })
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          notification_preferences: formData,
        },
      })

      if (error) throw error

      showToast('success', 'Notification settings updated')
    } catch (error: any) {
      showToast('error', error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <SettingsLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </SettingsLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <SettingsLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-600 mt-1">
              Control how and when you receive notifications.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warmth Alerts */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Warmth Alerts</h2>
              
              <Checkbox
                label="Enable warmth alerts"
                helperText="Get notified when a contact's warmth score drops"
                checked={formData.warmth_alerts}
                onChange={(e) => setFormData({ ...formData, warmth_alerts: e.target.checked })}
              />

              <Select
                label="Alert threshold"
                helperText="Notify me when warmth drops below this score"
                value={formData.warmth_threshold}
                onChange={(e) => setFormData({ ...formData, warmth_threshold: e.target.value })}
                options={warmthThresholds}
                disabled={!formData.warmth_alerts}
              />
            </div>

            {/* Notification Channels */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
              
              <Checkbox
                label="Email notifications"
                helperText="Receive alerts via email"
                checked={formData.email_notifications}
                onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
              />

              <Checkbox
                label="Push notifications"
                helperText="Receive browser push notifications (requires permission)"
                checked={formData.push_notifications}
                onChange={(e) => setFormData({ ...formData, push_notifications: e.target.checked })}
              />
            </div>

            {/* Digest */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Daily Digest</h2>
              
              <Checkbox
                label="Enable daily digest"
                helperText="Receive a daily summary of your contacts and interactions"
                checked={formData.daily_digest}
                onChange={(e) => setFormData({ ...formData, daily_digest: e.target.checked })}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={saving}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </SettingsLayout>
    </RequireAuth>
  )
}
