/**
 * Event storage and database operations
 */

import { supabase } from '../db/supabase';
import { Event, BatchEventPayload } from '../types/event';

export interface StorageResult {
  success: boolean;
  error?: string;
  count?: number;
}

/**
 * Store a single event in the database
 */
export async function storeEvent(event: Event): Promise<StorageResult> {
  try {
    const { data, error } = await supabase.from('events').insert([
      {
        event: event.event,
        timestamp: event.timestamp,
        user_id: event.userId || null,
        session_id: event.sessionId || null,
        anonymous_id: event.anonymousId,
        url: event.url || null,
        page_title: event.pageTitle || null,
        referrer: event.referrer || null,
        user_agent: event.userAgent || null,
        screen_width: event.screenWidth || null,
        screen_height: event.screenHeight || null,
        device_type: event.deviceType || null,
        utm_source: event.utmSource || null,
        utm_medium: event.utmMedium || null,
        utm_campaign: event.utmCampaign || null,
        utm_term: event.utmTerm || null,
        utm_content: event.utmContent || null,
        click_id: event.clickId || null,
        properties: event.properties || {},
        idempotency_key: event.idempotencyKey || null,
        source: event.source || 'web',
      },
    ]);

    if (error) {
      console.error('Error storing event:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      count: 1,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown storage error');
    console.error('Event storage exception:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Store a batch of events
 */
export async function storeBatch(batch: BatchEventPayload): Promise<StorageResult> {
  if (batch.events.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const records = batch.events.map((event) => ({
      event: event.event || 'custom',
      timestamp: event.timestamp || Date.now(),
      user_id: event.userId || null,
      session_id: event.sessionId || null,
      anonymous_id: event.anonymousId,
      url: event.url || null,
      page_title: event.pageTitle || null,
      referrer: event.referrer || null,
      user_agent: event.userAgent || null,
      screen_width: event.screenWidth || null,
      screen_height: event.screenHeight || null,
      device_type: event.deviceType || null,
      utm_source: event.utmSource || null,
      utm_medium: event.utmMedium || null,
      utm_campaign: event.utmCampaign || null,
      utm_term: event.utmTerm || null,
      utm_content: event.utmContent || null,
      click_id: event.clickId || null,
      properties: event.properties || {},
      idempotency_key: event.idempotencyKey || null,
      source: event.source || 'web',
    }));

    const { error, status } = await supabase
      .from('events')
      .insert(records)
      .select('id');

    if (error) {
      console.error('Error storing batch:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: status === 201,
      count: batch.events.length,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown batch storage error');
    console.error('Batch storage exception:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Query events within a time range
 */
export async function queryEventsByTimeRange(
  startTime: number,
  endTime: number,
  limit: number = 1000
): Promise<{ events: Event[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('timestamp', startTime)
      .lte('timestamp', endTime)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        events: [],
        error: error.message,
      };
    }

    return {
      events: (data || []).map(mapEventRow),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown query error');
    return {
      events: [],
      error: err.message,
    };
  }
}

/**
 * Query events by user ID
 */
export async function queryEventsByUserId(userId: string, limit: number = 1000): Promise<{ events: Event[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        events: [],
        error: error.message,
      };
    }

    return {
      events: (data || []).map(mapEventRow),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown query error');
    return {
      events: [],
      error: err.message,
    };
  }
}

/**
 * Query events by session ID
 */
export async function queryEventsBySessionId(sessionId: string): Promise<{ events: Event[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) {
      return {
        events: [],
        error: error.message,
      };
    }

    return {
      events: (data || []).map(mapEventRow),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown query error');
    return {
      events: [],
      error: err.message,
    };
  }
}

/**
 * Count events in time range
 */
export async function countEvents(startTime: number, endTime: number): Promise<{ count: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('timestamp', startTime)
      .lte('timestamp', endTime);

    if (error) {
      return {
        count: 0,
        error: error.message,
      };
    }

    return {
      count: count || 0,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown count error');
    return {
      count: 0,
      error: err.message,
    };
  }
}

/**
 * Map database row to Event type
 */
function mapEventRow(row: any): Event {
  return {
    event: row.event,
    timestamp: row.timestamp,
    userId: row.user_id,
    sessionId: row.session_id,
    anonymousId: row.anonymous_id,
    url: row.url,
    pageTitle: row.page_title,
    referrer: row.referrer,
    userAgent: row.user_agent,
    screenWidth: row.screen_width,
    screenHeight: row.screen_height,
    deviceType: row.device_type,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmTerm: row.utm_term,
    utmContent: row.utm_content,
    clickId: row.click_id,
    properties: row.properties,
    idempotencyKey: row.idempotency_key,
    source: row.source,
  };
}
