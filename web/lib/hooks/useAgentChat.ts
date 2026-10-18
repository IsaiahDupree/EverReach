import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getJsonArray } from '@/lib/api'
import { streamFromEndpoint, createStreamController, StreamChunk } from '@/lib/api/streaming'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  function_calls?: Array<{
    name: string
    arguments: string
    result?: string
  }>
  timestamp: string
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title?: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
}

/**
 * Hook for managing agent chat with streaming support
 */
export function useAgentChat(conversationId?: string) {
  const queryClient = useQueryClient()
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isStreaming: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageIdRef = useRef<string>('')

  // Load conversation messages
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null

      const response = await apiFetch(`/api/v1/agent/conversation/${conversationId}`, {
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to load conversation')
      }

      const data = await response.json()
      
      // Set initial messages from conversation
      if (data.messages) {
        setChatState(prev => ({
          ...prev,
          messages: data.messages.map((msg: any) => ({
            id: msg.id || crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            function_calls: msg.function_calls,
            timestamp: msg.timestamp || new Date().toISOString(),
          })),
        }))
      }

      return data
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Send message with streaming
  const sendMessage = useCallback(async (message: string, context?: any) => {
    if (!message.trim()) return

    // Add user message
    const userMessageId = crypto.randomUUID()
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      error: null,
    }))

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID()
    currentMessageIdRef.current = assistantMessageId
    
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
    }))

    // Create abort controller
    abortControllerRef.current = createStreamController()

    // Stream response
    try {
      await streamFromEndpoint(
        '/api/v1/agent/chat/stream',
        {
          conversationId: conversationId || undefined,
          message,
          context,
        },
        {
          onChunk: (chunk: StreamChunk) => {
            if (chunk.type === 'content' && chunk.content) {
              // Append content to assistant message
              setChatState(prev => ({
                ...prev,
                messages: prev.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + chunk.content }
                    : msg
                ),
              }))
            } else if (chunk.type === 'function_call' && chunk.function_call) {
              // Add function call to assistant message
              setChatState(prev => ({
                ...prev,
                messages: prev.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        function_calls: [
                          ...(msg.function_calls || []),
                          chunk.function_call!,
                        ],
                      }
                    : msg
                ),
              }))
            } else if (chunk.type === 'error') {
              setChatState(prev => ({
                ...prev,
                error: chunk.error || 'Unknown error',
                isStreaming: false,
              }))
            }
          },
          onError: (error) => {
            setChatState(prev => ({
              ...prev,
              error: error.message,
              isStreaming: false,
            }))
          },
          onComplete: () => {
            setChatState(prev => ({
              ...prev,
              isStreaming: false,
              messages: prev.messages.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              ),
            }))

            // Invalidate conversations list
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
          },
          signal: abortControllerRef.current.signal,
        }
      )
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isStreaming: false,
      }))
    }
  }, [conversationId, queryClient])

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setChatState(prev => ({
      ...prev,
      isStreaming: false,
      messages: prev.messages.map(msg => ({ ...msg, isStreaming: false })),
    }))
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setChatState({
      messages: [],
      isStreaming: false,
      error: null,
    })
  }, [])

  return {
    messages: chatState.messages,
    isStreaming: chatState.isStreaming,
    error: chatState.error,
    isLoading,
    conversation,
    sendMessage,
    stopStreaming,
    clearMessages,
  }
}

/**
 * Hook for managing conversations list
 */
export function useConversations() {
  const queryClient = useQueryClient()

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getJsonArray<Conversation>('/api/v1/agent/conversation', { requireAuth: true }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1, // Retry once on transient failures
  })

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiFetch(`/api/v1/agent/conversation/${conversationId}`, {
        method: 'DELETE',
        requireAuth: true,
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  return {
    conversations: conversations || [],
    isLoading,
    deleteConversation: deleteConversation.mutate,
    isDeleting: deleteConversation.isPending,
  }
}
