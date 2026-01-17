'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import RequireAuth from '@/components/RequireAuth'
import { SettingsLayout } from '@/components/Settings/SettingsLayout'
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react'

export default function AccountSettingsPage() {
  const { showToast } = useToast()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error: any) {
      showToast('error', error.message)
      setSigningOut(false)
    }
  }

  async function handleDeleteAccount() {
    // This would need a backend endpoint to properly handle account deletion
    showToast('info', 'Account deletion will be available soon. Please contact support.')
    setShowDeleteConfirm(false)
  }

  return (
    <RequireAuth>
      <SettingsLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account and data.
            </p>
          </div>

          {/* Sign Out */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Sign out of your account on this device.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleSignOut}
                isLoading={signingOut}
                disabled={signingOut}
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                <p className="text-sm text-red-700 mt-1 mb-4">
                  Irreversible actions that permanently affect your account.
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white rounded-md p-4 border border-red-300">
                      <p className="text-sm text-gray-900 font-semibold mb-2">
                        Are you absolutely sure?
                      </p>
                      <p className="text-sm text-gray-700">
                        This will permanently delete your account and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                      >
                        Yes, delete my account
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Export (Future) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50">
            <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Download all your data in a portable format.
            </p>
            <Button variant="secondary" disabled>
              Export Data (Coming Soon)
            </Button>
          </div>
        </div>
      </SettingsLayout>
    </RequireAuth>
  )
}
