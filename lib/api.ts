import { supabase } from '@/lib/supabase';
import { FLAGS } from '@/constants/flags';

// Returns the configured backend base URL if provided.
// IMPORTANT: Falls back to production URL if env var is not set
export function backendBase(): string {
  // Try multiple environment variable names
  const base = 
    process.env.EXPO_PUBLIC_API_URL || 
    process.env.EXPO_PUBLIC_BACKEND_BASE || 
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    // HARDCODED FALLBACK - Production URL
    'https://ever-reach-be.vercel.app';
  
  const trimmed = base.replace(/\/$/, '');
  
  // Log once for debugging
  if (!backendBase.logged) {
    console.log('🔗 Backend Base URL:', trimmed);
    console.log('📝 From env var:', process.env.EXPO_PUBLIC_API_URL ? 'EXPO_PUBLIC_API_URL' : 'HARDCODED FALLBACK');
    backendBase.logged = true;
  }
  
  if (!trimmed || !trimmed.startsWith('http')) {
    console.error('⚠️ WARNING: Backend base URL is invalid:', trimmed);
    console.error('⚠️ This will cause 404 errors! Check your .env file.');
  }
  
  return trimmed;
}
backendBase.logged = false;

// Returns Authorization header with the current Supabase access token, if available.
export async function authHeader(): Promise<Record<string, string>> {
  try {
    if (!FLAGS.LOCAL_ONLY && supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // ignore
  }
  return {};
}

export type ApiInit = RequestInit & { requireAuth?: boolean };

// Fetch wrapper that prefixes the path with backend base if set, and attaches auth.
// Automatically retries on 401 with token refresh (handles expired tokens gracefully)
export async function apiFetch(path: string, init: ApiInit = {}, isRetry = false): Promise<Response> {
  const base = backendBase();
  const url = base ? `${base}${path}` : path;
  const needsAuth = init.requireAuth === true;
  
  // Always get a fresh session (auto-refreshes if expired)
  const auth = needsAuth ? await authHeader() : {};
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...auth,
  };
  
  // Log complete request details
  console.log('\n========== API REQUEST ==========');
  console.log('🌐 URL:', url);
  console.log('📤 Method:', init.method || 'GET');
  console.log('🔗 Base:', base);
  console.log('📍 Path:', path);
  console.log('🔐 Needs Auth:', needsAuth);
  console.log('🎫 Has Token:', !!auth.Authorization);
  console.log('🔄 Is Retry:', isRetry);
  if (auth.Authorization) {
    // Show first 30 chars of token
    console.log('🎫 Token Preview:', auth.Authorization.substring(0, 30) + '...');
  }
  console.log('📋 Headers:', JSON.stringify(headers, null, 2));
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
  
  // Make the request and log response
  const requestStart = Date.now();
  
  try {
    const response = await fetch(url, { ...init, headers });
    const duration = Date.now() - requestStart;
    
    console.log('\n========== API RESPONSE ==========');
    console.log('⏱️  Duration:', duration + 'ms');
    console.log('📊 Status:', response.status, response.statusText);
    console.log('✅ OK:', response.ok);
    console.log('🏷️  Status Code:', response.status);
    
    // Clone response to read body without consuming it
    const responseClone = response.clone();
    try {
      const responseText = await responseClone.text();
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
    
    // Handle 401 with automatic retry (token refresh)
    if (response.status === 401 && needsAuth && !isRetry) {
      console.log('🔄 401 Unauthorized - Attempting token refresh and retry...');
      
      try {
        // Explicitly refresh the session
        if (!FLAGS.LOCAL_ONLY && supabase) {
          await supabase.auth.refreshSession();
          console.log('✅ Token refreshed successfully');
          
          // Retry the request with the new token
          return apiFetch(path, init, true);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Return the original 401 response
      }
    }
    
    return response;
  } catch (error) {
    const duration = Date.now() - requestStart;
    
    console.error('\n========== API ERROR ==========');
    console.error('⏱️  Duration:', duration + 'ms');
    console.error('❌ Error:', error);
    console.error('💥 Message:', error instanceof Error ? error.message : String(error));
    console.error('🔍 Type:', error instanceof TypeError ? 'Network Error' : 'Unknown Error');
    console.error('===============================\n');
    
    throw error;
  }
}
