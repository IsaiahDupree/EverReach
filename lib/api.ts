import { supabase } from '@/lib/supabase';
import { FLAGS } from '@/constants/flags';
import { Platform } from 'react-native';

// Returns the configured backend base URL if provided.
// IMPORTANT: Falls back to production URL if env var is not set
// PLATFORM-AWARE: Uses localhost for web, 10.0.2.2 for Android emulator
export function backendBase(): string {
  // Try multiple environment variable names (prefer EXPO_PUBLIC_API_BASE_URL for consistency with docs)
  let base = 
    process.env.EXPO_PUBLIC_API_BASE_URL ||  // Preferred (matches remote paywalls docs)
    process.env.EXPO_PUBLIC_API_URL ||       // Legacy (for backward compatibility)
    process.env.EXPO_PUBLIC_BACKEND_BASE ||  // Alternative
    process.env.EXPO_PUBLIC_BACKEND_URL ||   // Alternative
    // HARDCODED FALLBACK - Production URL
    'https://ever-reach-be.vercel.app';
  
  // Platform-specific URL transformation for LOCAL development
  // Android emulator needs 10.0.2.2, web needs localhost
  if (Platform.OS === 'android' && base.includes('localhost')) {
    base = base.replace('localhost', '10.0.2.2');
    console.log('📱 [API/Android] Converted localhost to 10.0.2.2 for emulator');
  }
  
  const trimmed = base.replace(/\/$/, '');
  
  // Log once for debugging
  if (!backendBase.logged) {
    console.log('🔗 Backend Base URL:', trimmed);
    console.log('📱 Platform:', Platform.OS);
    const envSource = 
      process.env.EXPO_PUBLIC_API_BASE_URL ? 'EXPO_PUBLIC_API_BASE_URL' :
      process.env.EXPO_PUBLIC_API_URL ? 'EXPO_PUBLIC_API_URL (legacy)' :
      process.env.EXPO_PUBLIC_BACKEND_BASE ? 'EXPO_PUBLIC_BACKEND_BASE' :
      process.env.EXPO_PUBLIC_BACKEND_URL ? 'EXPO_PUBLIC_BACKEND_URL' :
      'HARDCODED FALLBACK';
    console.log('📝 From env var:', envSource);
    backendBase.logged = true;
  }
  
  if (!trimmed || !trimmed.startsWith('http')) {
    console.error('⚠️ WARNING: Backend base URL is invalid:', trimmed);
    console.error('⚠️ This will cause 404 errors! Check your .env file.');
  }
  
  return trimmed;
}
backendBase.logged = false;

// Token refresh lock to prevent multiple simultaneous refresh attempts
let tokenRefreshPromise: Promise<string | null> | null = null;
let lastSessionCheck = 0;
let cachedSession: any = null;
const SESSION_CACHE_MS = 5000; // Cache session for 5 seconds

// Returns Authorization header with the current Supabase access token, if available.
// Automatically refreshes expired tokens
export async function authHeader(): Promise<Record<string, string>> {
  try {
    if (!FLAGS.LOCAL_ONLY && supabase) {
      // Use cached session if recent (reduces getSession calls)
      const now = Date.now();
      let session = cachedSession;
      
      if (!session || (now - lastSessionCheck) > SESSION_CACHE_MS) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        cachedSession = session;
        lastSessionCheck = now;
      }
      
      if (!session) {
        console.log('⚠️ No session available');
        console.log('❌ Auth session missing!');
        return {};
      }
      
      // Check if token is expired or about to expire (within 2 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const isExpiringSoon = expiresAt - now < 120000; // 2 minutes buffer
      const isExpired = expiresAt <= now;
      
      if (isExpired) {
        console.log('❌ Token expired, refreshing immediately...');
      } else if (isExpiringSoon) {
        console.log('🔄 Token expiring soon, refreshing proactively...');
      }
      
      if (isExpired || isExpiringSoon) {
        // Use existing refresh promise if one is in progress
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = (async () => {
            try {
              console.log('🔄 Calling refreshSession...');
              const { data: refreshData, error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('❌ Token refresh failed:', error.message);
                console.error('❌ Token refresh failed: Auth session missing!');
                // Clear cache on error
                cachedSession = null;
                lastSessionCheck = 0;
                return null;
              }
              if (!refreshData?.session) {
                console.error('❌ Token refresh failed: Auth session missing!');
                cachedSession = null;
                lastSessionCheck = 0;
                return null;
              }
              console.log('✅ Token refreshed successfully');
              console.log('✅ New token expires at:', refreshData.session?.expires_at ? new Date(refreshData.session.expires_at * 1000).toISOString() : 'unknown');
              // Update cache with new session
              cachedSession = refreshData.session;
              lastSessionCheck = Date.now();
              return refreshData.session?.access_token || null;
            } finally {
              // Clear the promise after completion
              tokenRefreshPromise = null;
            }
          })();
        }
        
        const newToken = await tokenRefreshPromise;
        if (newToken) {
          return { Authorization: `Bearer ${newToken}` };
        } else {
          console.error('❌ Failed to get new token after refresh');
          return {};
        }
      }
      
      const token = session.access_token;
      if (token) {
        // Log token info for debugging
        const tokenAge = now - lastSessionCheck;
        const timeUntilExpiry = expiresAt - now;
        console.log('🎫 Using token (age:', tokenAge + 'ms, expires in:', Math.round(timeUntilExpiry / 1000) + 's)');
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (err) {
    console.error('⚠️ authHeader error:', err);
    // Clear cache on error
    cachedSession = null;
    lastSessionCheck = 0;
  }
  return {};
}

// Clear cached session (call this on sign out or auth errors)
export function clearSessionCache() {
  console.log('🗑️ Clearing session cache');
  cachedSession = null;
  lastSessionCheck = 0;
  tokenRefreshPromise = null;
}

export type ApiInit = RequestInit & { requireAuth?: boolean; baseOverride?: string; noDedupe?: boolean };

// Generic GET singleflight + TTL cache
const INFLIGHT_GET = new Map<string, Promise<Response>>();
const CACHE_GET = new Map<string, { ts: number; body: string; status: number }>();
const GET_TTL_MS = 3000;

// Fetch wrapper that prefixes the path with backend base if set, and attaches auth.
// Automatically retries on 401 with token refresh (handles expired tokens gracefully)
export async function apiFetch(path: string, init: ApiInit = {}, isRetry = false): Promise<Response> {
  const baseOverride = init.baseOverride?.replace(/\/$/, '');
  const base = baseOverride || backendBase();
  const url = base ? `${base}${path}` : path;
  const needsAuth = init.requireAuth === true;
  const method = (init.method || 'GET').toUpperCase();
  
  // Always get a fresh session (auto-refreshes if expired)
  const auth = needsAuth ? await authHeader() : {};
  
  // Don't set Content-Type for FormData (browser will set it with boundary)
  const isFormData = init.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData && { 'Content-Type': 'application/json' }), // Only set for non-FormData
    ...(init.headers || {}),
    ...auth,
  };
  if (needsAuth && !auth.Authorization) {
    console.warn('[apiFetch] No auth token available; skipping request');
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, statusText: 'Unauthorized', headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Log complete request details
  console.log('\n========== API REQUEST ==========');
  console.log('🌐 URL:', url);
  console.log('📤 Method:', init.method || 'GET');
  console.log('🔗 Base:', base);
  if (baseOverride) {
    console.log('🧭 Base Override: true');
  }
  console.log('📍 Path:', path);
  console.log('🔐 Needs Auth:', needsAuth);
  console.log('🎫 Has Token:', !!auth.Authorization);
  console.log('🔄 Is Retry:', isRetry);
  if (auth.Authorization) {
    // Show first 30 chars of token
    console.log('🎫 Token Preview:', auth.Authorization.substring(0, 30) + '...');
  }
  // Mask Authorization header in logs
  const headersForLog: Record<string, any> = { ...(headers as any) };
  if (headersForLog.Authorization) {
    const token: string = headersForLog.Authorization as string;
    const preview = token.startsWith('Bearer ')
      ? 'Bearer ' + token.slice(7, 13) + '…'
      : token.slice(0, 10) + '…';
    headersForLog.Authorization = preview;
  }
  console.log('📋 Headers:', JSON.stringify(headersForLog, null, 2));
  if (init.body) {
    console.log('📦 Body:', init.body);
    // Try to parse and pretty-print if JSON
    try {
      const parsed = JSON.parse(init.body as string);
      console.log('📦 Body (parsed):', JSON.stringify(parsed, null, 2));
    } catch {
      // Not JSON or already a string
    }
  }
  console.log('=================================\n');
  
  // GET cache/dedupe: serve from cache
  const getKey = `${method}:${url}`;
  if (method === 'GET' && !init.noDedupe) {
    const cached = CACHE_GET.get(getKey);
    if (cached && Date.now() - cached.ts < GET_TTL_MS) {
      console.log('🗄️  GET cache hit:', url);
      // Return a fresh Response each time so body can be read
      return new Response(cached.body, { 
        status: cached.status, 
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    const inflight = INFLIGHT_GET.get(getKey);
    if (inflight) {
      console.log('🔁 GET joined in-flight:', url);
      // Clone the response so each caller can read the body
      return inflight.then(res => res.clone());
    }
  }

  // Make the request and log response
  const requestStart = Date.now();
  
  // Add timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    console.log('🚀 [apiFetch] About to call fetch()...');
    let fetchPromise = fetch(url, { ...init, headers, signal: controller.signal });
    console.log('🚀 [apiFetch] fetch() called, promise created');
    
    // For GET requests, store promise in inflight map so others can join
    if (method === 'GET' && !init.noDedupe) {
      INFLIGHT_GET.set(getKey, fetchPromise);
    }
    
    console.log('⏳ [apiFetch] Waiting for response...');
    const response = await fetchPromise;
    console.log('✅ [apiFetch] Response received!');
    const duration = Date.now() - requestStart;
    
    console.log('\n========== API RESPONSE ==========');
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('✅ OK:', response.ok);
    console.log('🏷️  Status Code:', response.status);
    
    // Clone response to read body without consuming it
    const responseClone = response.clone();
    let responseText = '';
    try {
      responseText = await responseClone.text();
      if (responseText) {
        console.log('📥 Response Body:', responseText.substring(0, 500));
        try {
          const responseJson = JSON.parse(responseText);
          console.log('📥 Response (parsed):', JSON.stringify(responseJson, null, 2).substring(0, 500));
        } catch {
          // Not JSON
        }
      }
    } catch (e) {
      console.log('⚠️  Could not read response body:', e);
    }
    
    console.log('==================================\n');
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Populate GET cache after success
    if (method === 'GET' && !init.noDedupe && responseText) {
      CACHE_GET.set(getKey, { ts: Date.now(), body: responseText, status: response.status });
      INFLIGHT_GET.delete(getKey);
    }
    
    // Handle 401 with automatic retry (token refresh)
    if (response.status === 401 && needsAuth && !isRetry) {
      console.log('🔄 401 Unauthorized - Attempting token refresh and retry...');
      
      try {
        // Clear cached session on 401
        cachedSession = null;
        lastSessionCheck = 0;
        
        // Explicitly refresh the session using the shared lock
        if (!FLAGS.LOCAL_ONLY && supabase) {
          if (!tokenRefreshPromise) {
            tokenRefreshPromise = (async () => {
              try {
                console.log('🔄 Forcing session refresh after 401...');
                const { data: refreshData, error } = await supabase.auth.refreshSession();
                if (error) {
                  console.warn('Token refresh failed:', error.message);
                  console.warn('Token refresh failed: Auth session missing');
                  return null;
                }
                if (!refreshData?.session) {
                  console.warn('Token refresh failed: Auth session missing');
                  return null;
                }
                console.log('✅ Token refreshed successfully after 401');
                console.log('✅ New token expires at:', refreshData.session?.expires_at ? new Date(refreshData.session.expires_at * 1000).toISOString() : 'unknown');
                // Update cache
                cachedSession = refreshData.session;
                lastSessionCheck = Date.now();
                return refreshData.session?.access_token || null;
              } finally {
                tokenRefreshPromise = null;
              }
            })();
          }
          
          const newToken = await tokenRefreshPromise;
          if (newToken) {
            console.log('🔄 Retrying request with new token...');
            // Wait a bit to ensure token is propagated
            await new Promise(resolve => setTimeout(resolve, 200));
            return apiFetch(path, init, true);
          } else {
            console.warn('Failed to obtain new token, cannot retry');
          }
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Return the original 401 response
      }
    }
    
    return response;
  } catch (error: any) {
    console.error('💥 [apiFetch] CAUGHT ERROR in fetch!', error);
    const duration = Date.now() - requestStart;
    
    // Clear timeout on error
    clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error('\n========== API TIMEOUT ==========');
      console.error('⏱️  Duration:', duration + 'ms');
      console.error('❌ Request timeout after 30 seconds');
      console.error('=================================\n');
      throw new Error('Request timeout - please check your internet connection');
    }
    
    console.error('\n========== API ERROR ==========');
    console.error('⏱️  Duration:', duration + 'ms');
    // Safe logging: Don't log the full error object if it might be massive
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if ((error as any)?.code) console.error('🔢 Code:', (error as any).code);
    console.error('💥 Stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('🔍 Type:', error instanceof TypeError ? 'Network Error' : 'Unknown Error');
    console.error('===============================\n');
    
    // Clean up inflight on error
    if (method === 'GET' && !init.noDedupe) {
      INFLIGHT_GET.delete(getKey);
    }
    throw error;
  }
}

export async function apiGet<T = any>(endpoint: string, options?: ApiInit): Promise<T> {
  const response = await apiFetch(endpoint, { ...options, method: 'GET' });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return await response.json() as T;
}

export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options?: ApiInit
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return await response.json() as T;
}

export async function apiPatch<T = any>(
  endpoint: string,
  body?: any,
  options?: ApiInit
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return await response.json() as T;
}

export async function apiDelete<T = any>(endpoint: string, options?: ApiInit): Promise<T> {
  const response = await apiFetch(endpoint, { ...options, method: 'DELETE' });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return await response.json() as T;
}
