/**
 * Supabase Admin Client
 *
 * Server-side admin client with service role key for administrative operations.
 * This client bypasses Row Level Security (RLS) policies.
 *
 * ⚠️ WARNING: Only use this client in server-side code for administrative tasks.
 * Never expose the service role key to the client.
 *
 * Usage:
 * ```typescript
 * import { createAdminClient } from '@/lib/supabase/admin';
 *
 * const supabase = createAdminClient();
 * await supabase.from('subscriptions').update({...});
 * ```
 *
 * Feature: WEB-PAY-004 - Stripe Webhook API (dependency)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Create a Supabase admin client with service role key
 *
 * This client has full access to the database and bypasses RLS.
 * Only use in secure server-side contexts.
 *
 * @returns Supabase admin client instance
 * @throws Error if required environment variables are not set
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
