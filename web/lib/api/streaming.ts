import { getAccessToken } from '@/lib/supabase'
import { backendBase } from '@/lib/api'

export interface StreamChunk {
  type: 'content' | 'function_call' | 'error' | 'done'
  content?: string
  function_call?: {
    name: string
    arguments: string
  }
  error?: string
}

export interface StreamOptions {
  onChunk: (chunk: StreamChunk) => void
  onError: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
}

/**
 * Stream data from a Server-Sent Events endpoint
 */
export async function streamFromEndpoint(
  path: string,
  body: any,
  options: StreamOptions
): Promise<void> {
  const { onChunk, onError, onComplete, signal } = options

  try {
    const token = await getAccessToken()
    const url = `${backendBase()}${path}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Read the stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onComplete?.()
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines from buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) {
          // Skip empty lines and comments
          continue
        }

        if (line.startsWith('data: ')) {
          const data = line.slice(6) // Remove 'data: ' prefix

          if (data === '[DONE]') {
            onComplete?.()
            return
          }

          try {
            const chunk: StreamChunk = JSON.parse(data)
            onChunk(chunk)
          } catch (err) {
            console.error('Failed to parse SSE data:', data, err)
            // Continue processing other chunks
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // Stream was intentionally aborted
        return
      }
      onError(error)
    } else {
      onError(new Error('Unknown streaming error'))
    }
  }
}

/**
 * Create an AbortController for canceling streams
 */
export function createStreamController(): AbortController {
  return new AbortController()
}
