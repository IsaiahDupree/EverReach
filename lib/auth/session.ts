import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export async function validateSession(): Promise<Session | null> {
  if (!supabase) return null;
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Session] Validation error:', error);
      return null;
    }
    
    if (!session) {
      console.log('[Session] No active session');
      return null;
    }
    
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.log('[Session] Session expired');
      return null;
    }
    
    console.log('[Session] Valid session found, expires:', new Date(expiresAt! * 1000).toISOString());
    return session;
  } catch (error) {
    console.error('[Session] Validation failed:', error);
    return null;
  }
}

export async function refreshSession(): Promise<Session | null> {
  if (!supabase) return null;
  
  try {
    console.log('[Session] Refreshing session...');
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[Session] Refresh error:', error);
      return null;
    }
    
    if (session) {
      console.log('[Session] Session refreshed successfully');
    }
    
    return session;
  } catch (error) {
    console.error('[Session] Refresh failed:', error);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (!supabase) return;
  
  try {
    await supabase.auth.signOut();
    console.log('[Session] Session cleared');
  } catch (error) {
    console.error('[Session] Clear failed:', error);
  }
}

export function isSessionExpiringSoon(session: Session | null): boolean {
  if (!session || !session.expires_at) return false;
  
  const expiresAt = session.expires_at * 1000;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expiresAt - now < fiveMinutes;
}
