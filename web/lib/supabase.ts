import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // We implement an explicit OAuth code exchange at /auth/callback
    // to avoid conflicts with fragment (#access_token) handling.
    detectSessionInUrl: false,
  },
})

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token ?? null
}
