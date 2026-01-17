'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Menu, X } from 'lucide-react'
import { GlobalSearchModal } from './Search/GlobalSearchModal'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="border-b">
        <nav className="mx-auto max-w-5xl flex items-center justify-between p-4">
          <Link href="/" className="font-semibold">EverReach</Link>
          
          <div className="flex items-center gap-4">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Desktop Nav Links - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/contacts" className="text-sm hover:underline">Contacts</Link>
              <Link href="/pipelines" className="text-sm hover:underline">Pipelines</Link>
              <Link href="/goals" className="text-sm hover:underline">Goals</Link>
              <Link href="/analytics" className="text-sm hover:underline">Analytics</Link>
              <Link href="/automation" className="text-sm hover:underline">Automation</Link>
              <Link href="/files" className="text-sm hover:underline">Files</Link>
              <Link href="/team" className="text-sm hover:underline">Team</Link>
              <Link href="/integrations" className="text-sm hover:underline">Integrations</Link>
              <Link href="/admin" className="text-sm hover:underline">Admin</Link>
              <Link href="/chat" className="text-sm hover:underline">AI Chat</Link>
              <Link href="/templates" className="text-sm hover:underline">Templates</Link>
              <Link href="/alerts" className="text-sm hover:underline">Alerts</Link>
              <Link href="/custom-fields" className="text-sm hover:underline">Custom Fields</Link>
              <Link href="/voice-notes" className="text-sm hover:underline">Voice Notes</Link>
              <Link href="/settings" className="text-sm hover:underline">Settings</Link>
              <Link href="/login" className="text-sm hover:underline">Login</Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl overflow-y-auto">
            <div className="p-6 space-y-2">
              <Link 
                href="/contacts" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contacts
              </Link>
              <Link 
                href="/pipelines" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pipelines
              </Link>
              <Link 
                href="/goals" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Goals
              </Link>
              <Link 
                href="/analytics" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analytics
              </Link>
              <Link 
                href="/automation" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Automation
              </Link>
              <Link 
                href="/files" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Files
              </Link>
              <Link 
                href="/team" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Team
              </Link>
              <Link 
                href="/integrations" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Integrations
              </Link>
              <Link 
                href="/admin" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
              <Link 
                href="/chat" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                AI Chat
              </Link>
              <Link 
                href="/templates" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Templates
              </Link>
              <Link 
                href="/alerts" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Alerts
              </Link>
              <Link 
                href="/custom-fields" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Custom Fields
              </Link>
              <Link 
                href="/voice-notes" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Voice Notes
              </Link>
              <Link 
                href="/settings" 
                className="block py-3 px-4 text-base hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        {children}
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
