'use client'

import { useState, useEffect, useRef } from 'react'
import { useAgentChat } from '@/lib/hooks/useAgentChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { ConversationSidebar } from './ConversationSidebar'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui'

interface AgentChatInterfaceProps {
  initialConversationId?: string
  initialContext?: any // Context to pass to AI (e.g., contact info)
  onClose?: () => void
  showSidebar?: boolean
  className?: string
}

export function AgentChatInterface({
  initialConversationId,
  initialContext,
  onClose,
  showSidebar = true,
  className = '',
}: AgentChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isStreaming,
    error,
    isLoading,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useAgentChat(conversationId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = (message: string) => {
    sendMessage(message, initialContext)
  }

  const handleNewConversation = () => {
    setConversationId(undefined)
    clearMessages()
  }

  const handleSelectConversation = (id: string | undefined) => {
    setConversationId(id)
    clearMessages()
  }

  return (
    <div className={`flex h-full bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Sidebar */}
      {showSidebar && (
        <ConversationSidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">
                Ask me anything about your contacts and relationships
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 bg-gray-50"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  I can help you with contact management, relationship insights, message drafting, and more.
                </p>
                <div className="space-y-2 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase">Example prompts:</div>
                  <button
                    onClick={() => handleSendMessage('Show me contacts I haven\'t talked to in a while')}
                    className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    • Show me contacts I haven't talked to in a while
                  </button>
                  <button
                    onClick={() => handleSendMessage('Draft a re-engagement email for John')}
                    className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    • Draft a re-engagement email for John
                  </button>
                  <button
                    onClick={() => handleSendMessage('What\'s the warmth score for my VIP contacts?')}
                    className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    • What's the warmth score for my VIP contacts?
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <ThinkingIndicator />
              )}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          isStreaming={isStreaming}
          onStop={stopStreaming}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
