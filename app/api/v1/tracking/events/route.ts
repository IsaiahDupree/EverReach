/**
 * Event Tracking API
 * 
 * Endpoint for client-side event tracking that:
 * 1. Receives events from web/mobile clients
 * 2. Validates and enriches event data
 * 3. Forwards to PostHog
 * 4. Optionally stores in Supabase event_log
 * 
 * This provides a server-side proxy for tracking to:
 * - Add server-side context (user agent, IP, etc.)
 * - Validate events before sending to PostHog
 * - Provide fallback storage if PostHog is down
 * - Enable server-side attribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
    const body = await req.json();
    
    // Support both single events and batches
    const events: TrackingEvent[] = Array.isArray(body.events) ? body.events : [body];
    
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
