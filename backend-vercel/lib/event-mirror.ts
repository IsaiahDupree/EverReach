/**
 * Event Mirror Service
 * 
 * Mirrors critical analytics events to Supabase for:
 * - Product analytics (joins with CRM data)
 * - Backup in case PostHog is down
 * - SQL-based analysis
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Mirror an event to Supabase app_events table
 */
export async function mirrorEventToSupabase(
  eventName: string,
  userId: string | null,
  anonymousId: string | null,
  properties: Record<string, any>,
  context: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_events')
      .insert({
        event_name: eventName,
        user_id: userId,
        anonymous_id: anonymousId,
        properties,
        context,
        occurred_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    console.log('[EventMirror] Successfully mirrored event:', {
      event: eventName,
      user_id: userId,
    });
  } catch (error) {
    // Log but don't throw - mirroring is best-effort
    console.error('[EventMirror] Failed to mirror event:', {
      event: eventName,
      user_id: userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Query events from Supabase for analytics
 */
export async function queryEvents(filters: {
  eventName?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  try {
    let query = supabase
      .from('app_events')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (filters.eventName) {
      query = query.eq('event_name', filters.eventName);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.startDate) {
      query = query.gte('occurred_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('occurred_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[EventMirror] Failed to query events:', error);
    return [];
  }
}

/**
 * Get event counts by name for a user
 */
export async function getEventCounts(userId: string, eventNames: string[]) {
  try {
    const { data, error } = await supabase
      .from('app_events')
      .select('event_name')
      .eq('user_id', userId)
      .in('event_name', eventNames);

    if (error) {
      throw error;
    }

    // Count occurrences
    const counts: Record<string, number> = {};
    eventNames.forEach(name => counts[name] = 0);

    data.forEach(row => {
      if (row.event_name in counts) {
        counts[row.event_name]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('[EventMirror] Failed to get event counts:', error);
    return {};
  }
}

/**
 * Get user's last event of a specific type
 */
export async function getLastEvent(userId: string, eventName: string) {
  try {
    const { data, error } = await supabase
      .from('app_events')
      .select('*')
      .eq('user_id', userId)
      .eq('event_name', eventName)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[EventMirror] Failed to get last event:', error);
    return null;
  }
}

/**
 * Delete all events for a user (GDPR compliance)
 */
export async function deleteUserEvents(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_events')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    console.log('[EventMirror] Deleted all events for user:', userId);
    return true;
  } catch (error) {
    console.error('[EventMirror] Failed to delete user events:', error);
    return false;
  }
}

export default {
  mirrorEventToSupabase,
  queryEvents,
  getEventCounts,
  getLastEvent,
  deleteUserEvents,
};
