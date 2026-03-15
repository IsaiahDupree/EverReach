/**
 * Meta Conversions API (CAPI) Proxy Endpoint
 *
 * Receives events from mobile app and forwards them to Meta Graph API server-side.
 * Also logs events to Supabase for debugging and analytics.
 *
 * Why proxy through backend:
 * 1. Keep Meta API access token secret (not in app bundle)
 * 2. Add server-side data enrichment (IP address, user agent)
 * 3. Persist events to database for debugging/auditing
 * 4. Handle failures and retries server-side
 *
 * Flow:
 * Client → POST /api/capi → Meta Graph API → meta_conversion_event table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { options } from '@/lib/cors';

export const runtime = 'edge';

export function OPTIONS(req: Request) {
  return options(req);
}

// Meta Conversions API configuration
const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN || '';
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;

interface ConversionEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  user_data?: {
    em?: string;      // hashed email (SHA-256)
    ph?: string;      // hashed phone (SHA-256)
    fn?: string;      // hashed first name (SHA-256)
    ln?: string;      // hashed last name (SHA-256)
    ct?: string;      // hashed city (SHA-256)
    st?: string;      // hashed state (SHA-256)
    zp?: string;      // hashed zip (SHA-256)
    country?: string; // hashed country (SHA-256)
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string;     // Facebook browser ID
    fbc?: string;     // Facebook click ID
  };
  custom_data?: Record<string, any>;
  event_source_url?: string;
  action_source?: 'app' | 'website';
  test_event_code?: string; // Only for testing
}

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      console.error('[CAPI] Missing EXPO_PUBLIC_META_PIXEL_ID or META_CONVERSIONS_API_TOKEN');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const events: ConversionEvent[] = Array.isArray(body) ? body : [body];

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No events provided' },
        { status: 400 }
      );
    }

    console.log(`[CAPI] Received ${events.length} event(s)`);

    // Enrich events with server-side data
    const enrichedEvents = events.map((event) => {
      const enriched = { ...event };

      // Add client IP address from request headers
      const clientIp =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        undefined;

      // Add client user agent
      const userAgent = req.headers.get('user-agent') || undefined;

      enriched.user_data = {
        ...enriched.user_data,
        client_ip_address: clientIp,
        client_user_agent: userAgent,
      };

      // Set action source to 'app' (mobile app events)
      enriched.action_source = 'app';

      return enriched;
    });

    // Forward to Meta Graph API
    const metaResponse = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: enrichedEvents,
        access_token: ACCESS_TOKEN,
        // test_event_code only if present in first event (development mode)
        ...(enrichedEvents[0]?.test_event_code && {
          test_event_code: enrichedEvents[0].test_event_code,
        }),
      }),
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('[CAPI] Meta API error:', metaData);
      return NextResponse.json(
        {
          error: 'Meta API error',
          details: metaData,
        },
        { status: metaResponse.status }
      );
    }

    console.log('[CAPI] Meta API response:', metaData);

    // Log events to Supabase for debugging
    try {
      const supabase = getServiceClient();

      const eventRecords = enrichedEvents.map((event) => ({
        event_name: event.event_name,
        event_time: new Date(event.event_time * 1000).toISOString(),
        event_id: event.event_id,
        user_data: event.user_data || {},
        custom_data: event.custom_data || {},
        event_source_url: event.event_source_url,
        action_source: event.action_source || 'app',
        test_event_code: event.test_event_code || null,
      }));

      const { error: insertError } = await supabase
        .from('meta_conversion_event')
        .insert(eventRecords);

      if (insertError) {
        console.error('[CAPI] Failed to log events to Supabase:', insertError);
        // Don't fail the request - Meta API succeeded
      } else {
        console.log(`[CAPI] Logged ${eventRecords.length} event(s) to Supabase`);
      }
    } catch (dbError) {
      console.error('[CAPI] Database logging error:', dbError);
      // Don't fail the request - Meta API succeeded
    }

    return NextResponse.json({
      success: true,
      events_received: events.length,
      meta_response: metaData,
    });
  } catch (error: any) {
    console.error('[CAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        // Never expose error.message in production
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      },
      { status: 500 }
    );
  }
}
