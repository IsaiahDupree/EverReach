import './globals.css'
import type { Metadata } from 'next'
import AuthFragmentHandler from '@/components/AuthFragmentHandler'
import { QueryProvider } from '@/lib/query-provider'
import { ToastProvider } from '@/components/ui/Toast'
import { PostHogProvider } from '@/app/providers/PostHogProvider'
import { LayoutClient } from '@/components/LayoutClient'

export const metadata: Metadata = {
  title: 'EverReach',
  description: 'EverReach Web',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-white text-gray-900">
        <PostHogProvider>
          <QueryProvider>
            <ToastProvider>
              <AuthFragmentHandler />
              <LayoutClient>{children}</LayoutClient>
            </ToastProvider>
          </QueryProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
