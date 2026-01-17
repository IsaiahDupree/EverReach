'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { User, Bell, Shield, Lock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/settings/profile' as const, label: 'Profile', icon: User },
  { href: '/settings/notifications' as const, label: 'Notifications', icon: Bell },
  { href: '/settings/account' as const, label: 'Account', icon: Shield },
]

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-8">
      {/* Sidebar Navigation */}
      <nav className="w-64 flex-shrink-0">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl">
        {children}
      </div>
    </div>
  )
}
