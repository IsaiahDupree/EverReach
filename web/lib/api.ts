import { supabase, getAccessToken } from '@/lib/supabase'

export function backendBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://ever-reach-be.vercel.app'
  return base.replace(/\/$/, '')
}

export type ApiInit = RequestInit & { requireAuth?: boolean }

export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(path: string, init: ApiInit = {}, isRetry = false): Promise<Response> {
  const base = backendBase()
  const url = `${base}${path}`
  const needsAuth = init.requireAuth === true
  const auth = needsAuth ? await authHeader() : {}
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...auth,
  }

  const resp = await fetch(url, { ...init, headers })

  if (resp.status === 401 && needsAuth && !isRetry) {
    try {
      await supabase.auth.refreshSession()
      return apiFetch(path, init, true)
    } catch {
      // fall through
    }
  }

  return resp
}

/**
 * Safely parse JSON response and unwrap common API shapes
 * Handles: {data: ...}, {items: ...}, or raw response
 */
async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  
  // Unwrap common response shapes
  if (data && typeof data === 'object') {
    // Handle {success: true, data: [...]} shape
    if ('data' in data) return data.data as T
    // Handle {items: [...]} shape  
    if ('items' in data) return data.items as T
    // Handle {templates: [...]} shape
    if ('templates' in data) return data.templates as T
  }
  
  return data as T
}

/**
 * Fetch and parse JSON response as typed object
 */
export async function getJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  return parseJson<T>(response)
}

/**
 * Fetch and parse JSON response as typed array
 * Always returns an array, even if backend returns non-array, null, or error
 * NEVER throws - returns empty array on any error
 */
export async function getJsonArray<T>(path: string, init: ApiInit = {}): Promise<T[]> {
  try {
    const response = await apiFetch(path, init)
    const data = await parseJson<T[] | T>(response)
    
    // Ensure we always return an array
    if (Array.isArray(data)) return data
    if (data === null || data === undefined) return []
    
    // If we got a single object, wrap it
    return [data as T]
  } catch (error) {
    // On ANY error (network, 500, parse failure), return empty array
    // This prevents crashes - hooks can display "no data" UI
    console.warn(`getJsonArray failed for ${path}:`, error)
    return []
  }
}
