'use client'

import { Bot } from 'lucide-react'

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <Bot className="h-5 w-5 text-gray-700" />
      </div>

      {/* Thinking Animation */}
      <div className="flex-1">
        <div className="rounded-lg bg-gray-100 text-gray-900 px-4 py-3 inline-block">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
