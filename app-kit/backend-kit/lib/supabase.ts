/**
 * APP-KIT: Supabase Service Client (Singleton)
 *
 * Use `getServiceClient()` in ALL server-side code instead of
 * calling `createClient()` directly. This ensures:
 * - Single client instance (no connection pool exhaustion)
 * - Consistent environment variable usage
 * - No accidental use of NEXT_PUBLIC_ vars on server
 *
 * ✅ KEEP: This pattern. Do not create additional Supabase clients.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;

/**
 * Returns the Supabase service-role client singleton.
 * Use this for all server-side database operations.
 *
 * NEVER use this on the client side — the service role key
 * bypasses RLS and has full database access.
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }

    serviceClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serviceClient;
}

/**
 * Verify a user's JWT token and return the user object.
 * Use this in API routes to authenticate requests.
 *
 * @example
 * ```ts
 * const user = await getUserFromToken(request);
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = getServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}
