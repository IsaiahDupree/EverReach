'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Bell, Lock, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button, Input, Textarea } from '@/components/ui'
import { useUserProfile, useUserPreferences, useUpdateProfile, useUpdatePreferences } from '@/lib/hooks/useSettings'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'
import { cn } from '@/lib/utils'

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'account'

function SettingsPageContent() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const { data: profile } = useUserProfile()
  const { data: preferences } = useUserPreferences()
  const updateProfile = useUpdateProfile()
  const updatePreferences = useUpdatePreferences()

  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    timezone: '',
  })

  const [preferencesData, setPreferencesData] = useState({
    warmth_alert_threshold: 50,
    analytics_opt_in: false,
    email_notifications: true,
    push_notifications: false,
    weekly_digest: true,
  })

  // Load profile data when available
  useEffect(() => {
    if (profile) {
      setProfileData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        timezone: profile.timezone || '',
      })
    }
  }, [profile])

  // Load preferences when available
  useEffect(() => {
    if (preferences) {
      setPreferencesData({
        warmth_alert_threshold: preferences.warmth_alert_threshold || 50,
        analytics_opt_in: preferences.analytics_opt_in || false,
        email_notifications: preferences.email_notifications !== false,
        push_notifications: preferences.push_notifications || false,
        weekly_digest: preferences.weekly_digest !== false,
      })
    }
  }, [preferences])

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(profileData)
      showToast('success', 'Profile updated successfully')
    } catch (error) {
      showToast('error', 'Failed to update profile')
    }
  }

  const handleSavePreferences = async () => {
    try {
      await updatePreferences.mutateAsync(preferencesData)
      showToast('success', 'Preferences updated successfully')
    } catch (error) {
      showToast('error', 'Failed to update preferences')
    }
  }

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: Zap },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'account' as SettingsTab, label: 'Account', icon: Lock },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
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
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <Input
                  label="Display Name"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  placeholder="Your name"
                />
                
                <Textarea
                  label="Bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={3}
                  placeholder="Tell us about yourself..."
                />

                <Input
                  label="Timezone"
                  value={profileData.timezone}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  placeholder="e.g., America/New_York"
                  helperText="Used for scheduling and date displays"
                />

                <div className="pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    isLoading={updateProfile.isPending}
                  >
                    Save Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">App Preferences</h2>
              <div className="space-y-4">
                <Input
                  label="Warmth Alert Threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={preferencesData.warmth_alert_threshold}
                  onChange={(e) => setPreferencesData({ ...preferencesData, warmth_alert_threshold: Number(e.target.value) })}
                  helperText="Get alerted when warmth score drops below this value"
                />

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesData.analytics_opt_in}
                    onChange={(e) => setPreferencesData({ ...preferencesData, analytics_opt_in: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Analytics Opt-in</div>
                    <div className="text-xs text-gray-500">Enable AI features like voice note transcription</div>
                  </div>
                </label>

                <div className="pt-4">
                  <Button
                    onClick={handleSavePreferences}
                    isLoading={updatePreferences.isPending}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Email Notifications</div>
                    <div className="text-xs text-gray-500 mt-1">Receive important updates via email</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesData.email_notifications}
                    onChange={(e) => setPreferencesData({ ...preferencesData, email_notifications: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Push Notifications</div>
                    <div className="text-xs text-gray-500 mt-1">Get notified on your device</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesData.push_notifications}
                    onChange={(e) => setPreferencesData({ ...preferencesData, push_notifications: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Weekly Digest</div>
                    <div className="text-xs text-gray-500 mt-1">Receive a weekly summary of your activity</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesData.weekly_digest}
                    onChange={(e) => setPreferencesData({ ...preferencesData, weekly_digest: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div className="pt-4">
                  <Button
                    onClick={handleSavePreferences}
                    isLoading={updatePreferences.isPending}
                  >
                    Save Notifications
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Email</div>
                  <div className="text-gray-900">{profile?.email || 'Not available'}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Member Since</div>
                  <div className="text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Not available'}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Danger Zone</h3>
                  <Button
                    variant="secondary"
                    onClick={() => showToast('info', 'Account deletion not yet implemented')}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Settings Tips</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Profile</strong>: Update your display name and bio</li>
          <li>• <strong>Preferences</strong>: Configure warmth alerts and analytics</li>
          <li>• <strong>Notifications</strong>: Control how you receive updates</li>
          <li>• <strong>Account</strong>: View account info and manage security</li>
        </ul>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsPageContent />
    </RequireAuth>
  )
}
