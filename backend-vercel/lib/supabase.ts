import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client configured for RLS using the caller's Bearer token.
 * - Uses the anon key so RLS is enforced
 * - If a Bearer token is present, it will be forwarded in the Authorization header
 */
export function createRlsClientFromRequest(req: Request): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const [scheme, token] = auth.split(' ');
  const bearer = scheme?.toLowerCase() === 'bearer' && token ? token : undefined;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    db: {
      schema: 'public'
    },
    global: bearer
      ? { headers: { Authorization: `Bearer ${bearer}` } }
      : undefined,
  });
  return client;
}

export function getClientOrThrow(req: Request): SupabaseClient {
  const client = createRlsClientFromRequest(req);
  if (!client) throw new Error('Server is misconfigured: missing SUPABASE_URL or SUPABASE_ANON_KEY');
  return client;
}

/**
 * Service-role client (bypasses RLS). Use only for admin/cron operations.
 */
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    db: {
      schema: 'public'
    }
  });
}

/**
 * Build-safe service client getter. Returns a lazy function that creates
 * the Supabase client only when actually invoked at runtime.
 * This prevents build-time errors during Next.js page collection.
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // During build time, env vars might not be available. Return a dummy client.
  // This will fail if actually called, but won't crash the build.
  if (!url || !key) {
    // Create a minimal valid URL to satisfy Supabase's validation
    // This won't work at runtime, but prevents build-time errors
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false, detectSessionInUrl: false },
    });
  }

  return createClient(url, key, {
    auth: { persistSession: false, detectSessionInUrl: false },
    db: {
      schema: 'public'
    }
  });
}
