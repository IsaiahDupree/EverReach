'use client'

import { useState, useEffect } from 'react'
import { Button, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'
import { SettingsLayout } from '@/components/Settings/SettingsLayout'

export default function ProfileSettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    timezone: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      setFormData({
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
          full_name: formData.full_name,
        },
      })

      if (error) throw error

      showToast('success', 'Profile updated successfully')
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
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your personal information and preferences.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <Input
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                disabled
                helperText="Email cannot be changed"
              />

              <Input
                label="Timezone"
                value={formData.timezone}
                disabled
                helperText="Detected automatically from your browser"
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
