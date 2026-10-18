'use client'

import { User, Bot, Copy, Check } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/lib/hooks/useAgentChat'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="rounded-lg bg-gray-100 px-4 py-2 text-xs text-gray-600">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-gray-700" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex justify-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3 relative group',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          {/* Text Content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>

          {/* Function Calls */}
          {message.function_calls && message.function_calls.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.function_calls.map((call, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'text-xs rounded p-2 border',
                    isUser
                      ? 'bg-blue-700 border-blue-500'
                      : 'bg-gray-200 border-gray-300'
                  )}
                >
                  <div className="font-medium mb-1">
                    🔧 {call.name}
                  </div>
                  {call.result && (
                    <div className="opacity-75 text-[10px] mt-1">
                      {call.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Copy Button */}
          {!isUser && !message.isStreaming && (
            <button
              onClick={handleCopy}
              className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}

          {/* Timestamp */}
          <div
            className={cn(
              'text-[10px] mt-2 opacity-70',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
