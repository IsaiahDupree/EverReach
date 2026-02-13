import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
// Force dynamic to allow reading request headers (Authorization) at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes

type PostHogEvent = {
  event: string;
  distinct_id: string;
  properties: Record<string, any>;
  timestamp: string;
};

// GET /api/cron/sync-posthog
// Runs every 15 minutes via Vercel Cron
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
    const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      console.warn('[PostHog Sync] Missing credentials, skipping');
      return NextResponse.json({ skipped: true, reason: 'missing_credentials' });
    }

    // Get last sync time
    const { data: lastSync } = await supabase
      .from('service_status')
      .select('last_success')
      .eq('service', 'posthog')
      .single();

    const since = lastSync?.last_success || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch events from PostHog
    const response = await fetch(
      `https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/events/?after=${since}`,
      {
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.statusText}`);
    }

    const data = await response.json();
    const events: PostHogEvent[] = data.results || [];

    // Aggregate events into metrics
    const metricsMap = new Map<string, { value: number; labels: any }>();

    events.forEach((event) => {
      const key = `${event.event}|${event.distinct_id}`;
      if (!metricsMap.has(key)) {
        metricsMap.set(key, {
          value: 0,
          labels: {
            event_name: event.event,
            user_id: event.distinct_id,
            ...event.properties
          }
        });
      }
      metricsMap.get(key)!.value += 1;
    });

    // Calculate DAU/WAU/MAU
    const uniqueUsers = new Set(events.map(e => e.distinct_id));
    const ts = new Date().toISOString();

    const metrics = [
      {
        metric_name: 'app.active_users',
        value: uniqueUsers.size,
        ts,
        labels: { source: 'posthog', period: 'sync' }
      },
      ...Array.from(metricsMap.entries()).map(([_, metric]) => ({
        metric_name: 'feature_used',
        value: metric.value,
        ts,
        labels: metric.labels
      }))
    ];

    // Insert metrics
    if (metrics.length > 0) {
      const { error } = await supabase.from('metrics_timeseries').insert(metrics);
      if (error) {
        console.error('[PostHog Sync] Error inserting metrics:', error);
      }
    }

    // Update service status
    await supabase.from('service_status').upsert({
      service: 'posthog',
      status: 'UP',
      last_success: new Date().toISOString(),
      message: `Synced ${events.length} events, ${uniqueUsers.size} active users`
    });

    return NextResponse.json({
      success: true,
      events_synced: events.length,
      active_users: uniqueUsers.size,
      metrics_created: metrics.length
    });
  } catch (error: any) {
    console.error('[PostHog Sync] Error:', error);

    // Update service status
    const supabase = getSupabaseServiceClient();
    await supabase.from('service_status').upsert({
      service: 'posthog',
      status: 'DOWN',
      message: error.message
    });

    return NextResponse.json(
      { error: 'PostHog sync failed', details: error.message },
      { status: 500 }
    );
  }
}
