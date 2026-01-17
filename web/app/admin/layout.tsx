'use client'

import { ReactNode } from 'react'
import Link from 'link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Activity,
  Flag,
  FlaskConical,
  Mail,
  Users,
  AlertTriangle,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'API Monitoring', href: '/admin/api-monitoring', icon: Activity },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
  { name: 'Experiments', href: '/admin/experiments', icon: FlaskConical },
  { name: 'Marketing', href: '/admin/marketing', icon: Mail },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Errors', href: '/admin/errors', icon: AlertTriangle },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">EverReach</h1>
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              Admin
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700"
              onClick={() => {
                // TODO: Implement logout
                window.location.href = '/api/admin/auth/signout'
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="pl-64">
          {/* Header */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/admin" className="hover:text-gray-900">
                Admin
              </Link>
              {pathname !== '/admin' && pathname !== '/admin/dashboard' && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 font-medium">
                    {navigation.find((item) => item.href === pathname)?.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* User menu placeholder */}
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="p-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  )
}
