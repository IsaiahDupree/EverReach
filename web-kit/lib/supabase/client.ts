import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Supabase client for browser usage
 *
 * This client is configured for client-side operations with:
 * - Session persistence in localStorage
 * - Automatic token refresh
 * - Session detection from URL (for OAuth callbacks)
 * - Full TypeScript type support for database schema
 *
 * Usage:
 * ```ts
 * import { supabase } from '@/lib/supabase/client';
 *
 * // Sign in
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 *
 * // Query data with full type safety
 * const { data: items } = await supabase
 *   .from('items')
 *   .select('*');
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
