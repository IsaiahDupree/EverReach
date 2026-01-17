'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  isStreaming: boolean
  onStop: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  isStreaming,
  onStop,
  disabled = false,
  placeholder = 'Ask me anything...',
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!message.trim() || disabled || isStreaming) return

    onSend(message.trim())
    setMessage('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-3 items-end">
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'placeholder:text-gray-400'
          )}
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />

        {/* Send/Stop Button */}
        {isStreaming ? (
          <Button
            onClick={onStop}
            variant="secondary"
            size="lg"
            className="flex-shrink-0"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="lg"
            className="flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
