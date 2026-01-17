import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../backend/lib/supabase';
import { FLAGS } from '@/constants/flags';

const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      
      try {
        JSON.parse(value);
        return value;
      } catch {
        console.error(`[SafeStorage] Corrupted data for key ${key}, removing...`);
        await AsyncStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      console.error(`[SafeStorage] Failed to get ${key}:`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      JSON.parse(value);
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[SafeStorage] Failed to set ${key}:`, error);
      throw error;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[SafeStorage] Failed to remove ${key}:`, error);
    }
  },
};

// Real Supabase client (kept for later)
const createRealClient = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;
  
  console.log('[Supabase] Initializing client with URL:', supabaseUrl);
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: safeAsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
};

// Create the client - use null when LOCAL_ONLY is true
const realClient = FLAGS.LOCAL_ONLY ? null : createRealClient();
export const supabase = realClient as any;

// Set up auth state change listener for token refresh events
if (realClient) {
  realClient.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log(' [Supabase Auth] Token automatically refreshed');
      console.log(' New token expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
    } else if (event === 'SIGNED_IN') {
      console.log(' [Supabase Auth] User signed in');
    } else if (event === 'SIGNED_OUT') {
      console.log(' [Supabase Auth] User signed out');
    } else if (event === 'USER_UPDATED') {
      console.log(' [Supabase Auth] User data updated');
    }
  });
}

// Helper functions for client-side operations
export async function getCurrentUser() {
  if (FLAGS.LOCAL_ONLY || !supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signInAnonymously() {
  if (FLAGS.LOCAL_ONLY || !supabase) return null;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (FLAGS.LOCAL_ONLY || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Client-side queries (with RLS protection)
export async function getMyPeople(options: {
  warmthFilter?: 'hot' | 'warm' | 'cool' | 'cold';
  limit?: number;
} = {}) {
  if (FLAGS.LOCAL_ONLY || !supabase) return [];
  
  let query = supabase
    .from('people')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.warmthFilter) {
    const warmthRanges = {
      hot: [60, 100],
      warm: [30, 59],
      cool: [10, 29],
      cold: [0, 9]
    };
    const [min, max] = warmthRanges[options.warmthFilter];
    query = query.gte('warmth', min).lte('warmth', max);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPersonById(personId: string) {
  if (FLAGS.LOCAL_ONLY || !supabase) return null;
  
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', personId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getMyPendingInsights() {
  if (FLAGS.LOCAL_ONLY || !supabase) return [];
  
  const { data, error } = await supabase
    .from('insights')
    .select(`
      *,
      people!inner(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getMyInteractions(personId?: string) {
  if (FLAGS.LOCAL_ONLY || !supabase) return [];
  
  let query = supabase
    .from('interactions')
    .select('*')
    .order('occurred_at', { ascending: false });

  if (personId) {
    query = query.eq('person_id', personId);
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data || [];
}

// Real-time subscriptions
export function subscribeToInsights(callback: (payload: any) => void) {
  if (FLAGS.LOCAL_ONLY || !supabase) return { unsubscribe: () => {} };
  
  return supabase
    .channel('insights')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'insights' }, 
      callback
    )
    .subscribe();
}

export function subscribeToPeople(callback: (payload: any) => void) {
  if (FLAGS.LOCAL_ONLY || !supabase) return { unsubscribe: () => {} };
  
  return supabase
    .channel('people')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'people' }, 
      callback
    )
    .subscribe();
}

// Re-export warmth utilities from pure utils file
export { calculateWarmth, getWarmthColor, getWarmthLabel } from './warmth-utils';