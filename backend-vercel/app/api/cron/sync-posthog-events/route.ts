/**
 * PostHog Event Sync Cron Job
 * GET/POST /api/cron/sync-posthog-events
 * 
 * Scheduled: Every 15 minutes
 * Purpose: Pull events from PostHog API and aggregate into cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const POSTHOG_PROJECT_KEY = process.env.POSTHOG_PROJECT_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Verify cron secret
function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    return handleSync(req, supabase);
  } catch (error) {
    console.error('[PostHog Sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  return handleSync(req, supabase);
}

async function handleSync(req: NextRequest, supabase: ReturnType<typeof getSupabase>) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!POSTHOG_PERSONAL_API_KEY) {
      console.log('[PostHog Sync] Skipping: No API key configured');
      return NextResponse.json({
        success: true,
        message: 'No PostHog API key configured',
      });
    }

    // Calculate time range (last 1 hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    console.log('[PostHog Sync] Fetching events from', oneHourAgo.toISOString(), 'to', now.toISOString());

    // Fetch events from PostHog
    // Note: Using the events export API
    const posthogUrl = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_KEY}/events?after=${oneHourAgo.toISOString()}&before=${now.toISOString()}`;
    
    const response = await fetch(posthogUrl, {
      headers: {
        'Authorization': `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.results || [];

    console.log('[PostHog Sync] Fetched', events.length, 'events');

    // Aggregate events by hour and event name
    const aggregated = new Map<string, any>();

    for (const event of events) {
      const eventTime = new Date(event.timestamp);
      const date = eventTime.toISOString().split('T')[0];
      const hour = eventTime.getHours();
      const eventName = event.event;
      
      const key = `${date}-${hour}-${eventName}`;
      
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          date,
          hour,
          event_name: eventName,
          event_count: 0,
          unique_users: new Set(),
          properties: {},
        });
      }

      const agg = aggregated.get(key);
      agg.event_count++;
      
      if (event.distinct_id) {
        agg.unique_users.add(event.distinct_id);
      }
    }

    // Upsert aggregated events into cache
    const upsertPromises = Array.from(aggregated.values()).map(async (agg) => {
      const { data, error } = await supabase
        .from('posthog_events_cache')
        .upsert({
          date: agg.date,
          hour: agg.hour,
          event_name: agg.event_name,
          event_count: agg.event_count,
          unique_users: agg.unique_users.size,
          properties: agg.properties,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'date,hour,event_name',
        });

      if (error) {
        console.error('[PostHog Sync] Upsert error:', error);
      }

      return { success: !error };
    });

    await Promise.all(upsertPromises);

    console.log('[PostHog Sync] Upserted', aggregated.size, 'aggregated events');

    return NextResponse.json({
      success: true,
      events_fetched: events.length,
      aggregated_count: aggregated.size,
      time_range: {
        start: oneHourAgo.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('[PostHog Sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
