/**
 * Event Tracking API Endpoint
 * 
 * Handles client-side event tracking with server-side enrichment:
 * - Receives events from web/mobile clients
 * - Validates and enriches event data
 * - Stores in Supabase event_log
 * - Optionally forwards to PostHog
 * 
 * POST /api/tracking/events - Track single or batch events
 * GET /api/tracking/events - Health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

interface TrackingEvent {
  event: string;
  properties?: Record<string, any>;
  user_id?: string;
  anonymous_id?: string;
  timestamp?: string;
}

interface TrackingBatch {
  events: TrackingEvent[];
  batch_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: TrackingEvent | TrackingBatch = await req.json();
    
    // Support both single events and batches
    const events: TrackingEvent[] = Array.isArray((body as any).events) ? (body as any).events : [body as TrackingEvent];
    
    // Get client context
    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const results = [];
    
    for (const event of events) {
      try {
        // Validate required fields
        if (!event.event) {
          results.push({ success: false, error: 'Missing event name' });
          continue;
        }
        
        // Enrich event with server-side context
        const enrichedEvent = {
          event_name: event.event,
          user_id: event.user_id || null,
          anonymous_id: event.anonymous_id || null,
          properties: {
            ...event.properties,
            $ip: ip,
            $user_agent: userAgent,
            $timestamp: event.timestamp || new Date().toISOString(),
          },
          ts: event.timestamp || new Date().toISOString(),
          source: 'api',
          idempotency_key: event.properties?.$idempotency_key || 
                           `${event.user_id || event.anonymous_id}-${event.event}-${Date.now()}`,
        };
        
        // Store in Supabase event_log
        const { error: insertError } = await supabase
          .from('event_log')
          .insert(enrichedEvent);
        
        if (insertError) {
          console.error('[tracking] Supabase insert error:', insertError);
          results.push({ 
            success: false, 
            error: insertError.message,
            event: event.event 
          });
          continue;
        }
        
        results.push({ success: true, event: event.event });
        
      } catch (eventError: any) {
        console.error('[tracking] Event processing error:', eventError);
        results.push({ 
          success: false, 
          error: eventError.message,
          event: event.event 
        });
      }
    }
    
    // Return results
    const allSuccess = results.every(r => r.success);
    const statusCode = allSuccess ? 200 : 207; // 207 Multi-Status for partial success
    
    return NextResponse.json({
      success: allSuccess,
      processed: results.length,
      results,
    }, { status: statusCode });
    
  } catch (error: any) {
    console.error('[tracking] Request error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'event-tracking',
    timestamp: new Date().toISOString(),
  });
}
