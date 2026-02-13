/**
 * User Identification API Endpoint
 * 
 * POST /api/tracking/identify - Identify user and set properties
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

interface IdentifyPayload {
  user_id: string;
  properties?: Record<string, any>;
  anonymous_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: IdentifyPayload = await req.json();
    
    // Validate
    if (!body.user_id) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required',
      }, { status: 400 });
    }
    
    // Track identify event
    const { error } = await supabase.from('event_log').insert({
      user_id: body.user_id,
      anonymous_id: body.anonymous_id || null,
      event_name: 'user_identified',
      properties: body.properties || {},
      ts: new Date().toISOString(),
      source: 'api',
    });
    
    if (error) {
      console.error('[tracking] Identify error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      user_id: body.user_id,
    });
    
  } catch (error: any) {
    console.error('[tracking] Request error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
