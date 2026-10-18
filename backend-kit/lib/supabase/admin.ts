/**
 * Supabase Admin Client
 *
 * This module provides an admin Supabase client that uses the service role key
 * and bypasses Row Level Security (RLS) policies.
 *
 * ⚠️ WARNING: Use with extreme caution!
 * The admin client has full access to all data and bypasses RLS.
 * Only use for administrative operations that genuinely need elevated privileges.
 *
 * Usage in API routes:
 * ```typescript
 * import { createAdminClient, adminClient } from '@/lib/supabase/admin';
 *
 * // Option 1: Create a new instance
 * const admin = createAdminClient();
 * const { data, error } = await admin
 *   .from('users')
 *   .select('*'); // Bypasses RLS
 *
 * // Option 2: Use the singleton
 * const { data, error } = await adminClient
 *   .from('users')
 *   .select('*');
 * ```
 *
 * Common use cases:
 * - Webhook handlers (when there's no user session)
 * - Admin operations (user management, bulk operations)
 * - Background jobs and cron tasks
 * - System-level data modifications
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './server';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
    'This key is required for admin operations and should NEVER be exposed to the client.'
  );
}

/**
 * Creates a Supabase admin client with service role access
 *
 * This client bypasses Row Level Security (RLS) and has full database access.
 * Use responsibly and only when necessary.
 *
 * @returns A configured Supabase admin client instance
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Singleton admin client instance
 *
 * This is a pre-configured admin client that can be imported directly.
 * Useful when you don't need to create a new instance for each operation.
 */
export const adminClient = createAdminClient();
