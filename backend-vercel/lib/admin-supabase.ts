/**
 * Build-safe Supabase client for admin routes
 * Uses lazy initialization to prevent build-time env access
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _adminSupabase: SupabaseClient | null = null;

/**
 * Get or create admin Supabase client (service role)
 * Lazy initialization prevents build-time env var access
 */
export function getAdminSupabase(): SupabaseClient {
  if (_adminSupabase) return _adminSupabase;
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  _adminSupabase = createClient(url, key, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
  
  return _adminSupabase;
}
