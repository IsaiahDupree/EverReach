'use client'

import { MessageSquare, Trash2, Plus } from 'lucide-react'
import { useConversations } from '@/lib/hooks/useAgentChat'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ConversationSidebarProps {
  currentConversationId?: string
  onSelectConversation: (conversationId: string | undefined) => void
  onNewConversation: () => void
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const { conversations, isLoading, deleteConversation } = useConversations()

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      deleteConversation(conversationId)
      if (currentConversationId === conversationId) {
        onSelectConversation(undefined)
      }
    }
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={onNewConversation}
          variant="primary"
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 rounded animate-pulse"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No conversations yet
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2 transition-colors',
                  'hover:bg-white hover:shadow-sm',
                  'group relative',
                  currentConversationId === conversation.id
                    ? 'bg-white shadow-sm ring-2 ring-blue-500'
                    : 'bg-transparent'
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title || 'New Conversation'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
                      {' · '}
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conversation.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        AI Assistant powered by GPT-4
      </div>
    </div>
  )
}
