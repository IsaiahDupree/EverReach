import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
 * Creates a Supabase client for server-side operations
 *
 * This client is configured for server-side operations with:
 * - Cookie-based session management
 * - Automatic session handling in Server Components
 * - Type-safe database operations
 * - Works with Next.js App Router
 *
 * Usage in Server Components:
 * ```ts
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function Page() {
 *   const supabase = createClient();
 *
 *   // Get authenticated user
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   // Query data with full type safety
 *   const { data: items } = await supabase
 *     .from('items')
 *     .select('*')
 *     .eq('user_id', user.id);
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * Usage in API Routes:
 * ```ts
 * import { createClient } from '@/lib/supabase/server';
 * import { NextResponse } from 'next/server';
 *
 * export async function GET() {
 *   const supabase = createClient();
 *   const { data, error } = await supabase
 *     .from('items')
 *     .select('*');
 *
 *   return NextResponse.json({ data, error });
 * }
 * ```
 *
 * @returns Supabase client instance with cookie handling
 */
export function createClient() {
  const cookieStore = cookies();

  return createSupabaseServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      /**
       * Get a cookie value by name
       */
      get(name: string) {
        const cookie = cookieStore.get(name);
        return cookie?.value;
      },

      /**
       * Set a cookie with name, value, and options
       */
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },

      /**
       * Remove a cookie by name
       */
      remove(name: string, options: any) {
        try {
          // To remove a cookie, set it with maxAge: 0
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        } catch (error) {
          // The `remove` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
