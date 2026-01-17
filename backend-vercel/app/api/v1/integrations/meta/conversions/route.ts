/**
 * Meta Conversions API - Server-Side Event Tracking
 * POST /api/v1/integrations/meta/conversions
 * 
 * Sends server-side events to Meta Pixel for attribution & optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth-utils';
import { createHash } from 'crypto';

const FB_GRAPH_API = 'https://graph.facebook.com/v24.0';
const PIXEL_ID = process.env.META_PIXEL_ID;

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getConversionsToken() {
  return process.env.META_CONVERSIONS_API_TOKEN;
}

// Hash PII data with SHA256
function hashData(data: string): string {
  return createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = getConversionsToken();
    if (!token || !PIXEL_ID) {
      return NextResponse.json(
        { error: 'Conversions API not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      event_name, // Required: 'Purchase', 'AddToCart', 'Lead', etc.
      event_source_url,
      action_source = 'website', // 'website', 'app', 'offline'
      email,
      phone,
      first_name,
      last_name,
      city,
      state,
      zip,
      country,
      client_ip_address,
      client_user_agent,
      fbp, // Facebook browser pixel cookie (_fbp)
      fbc, // Facebook click ID (_fbc)
      value,
      currency = 'USD',
      content_ids,
      content_type,
      content_name,
      custom_data = {},
      test_event_code, // For testing in Events Manager
    } = body;

    if (!event_name) {
      return NextResponse.json(
        { error: 'event_name is required' },
        { status: 400 }
      );
    }

    // Build event payload
    const eventTime = Math.floor(Date.now() / 1000);
    
    const userData: any = {};
    if (email) userData.em = [hashData(email)];
    if (phone) userData.ph = [hashData(phone)];
    if (first_name) userData.fn = [hashData(first_name)];
    if (last_name) userData.ln = [hashData(last_name)];
    if (city) userData.ct = [hashData(city)];
    if (state) userData.st = [hashData(state)];
    if (zip) userData.zp = [hashData(zip)];
    if (country) userData.country = [hashData(country)];
    if (client_ip_address) userData.client_ip_address = client_ip_address;
    if (client_user_agent) userData.client_user_agent = client_user_agent;
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const eventData: any = {
      event_name,
      event_time: eventTime,
      action_source,
      user_data: userData,
    };

    if (event_source_url) {
      eventData.event_source_url = event_source_url;
    }

    // Add custom data
    const customDataPayload: any = { ...custom_data };
    if (value !== undefined) customDataPayload.value = value;
    if (currency) customDataPayload.currency = currency;
    if (content_ids) customDataPayload.content_ids = content_ids;
    if (content_type) customDataPayload.content_type = content_type;
    if (content_name) customDataPayload.content_name = content_name;

    if (Object.keys(customDataPayload).length > 0) {
      eventData.custom_data = customDataPayload;
    }

    // Send to Meta Conversions API
    const payload: any = {
      data: [eventData],
    };

    if (test_event_code) {
      payload.test_event_code = test_event_code;
    }

    const response = await fetch(
      `${FB_GRAPH_API}/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          access_token: token,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Conversions API error: ${data.error?.message || 'Unknown error'}`
      );
    }

    // Store event in database
    await supabase
      .from('meta_conversion_event')
      .insert({
        pixel_id: PIXEL_ID,
        event_name,
        event_time: new Date(eventTime * 1000).toISOString(),
        action_source,
        event_source_url,
        user_id: auth.userId,
        hashed_email: email ? hashData(email) : null,
        hashed_phone: phone ? hashData(phone) : null,
        client_ip_address,
        client_user_agent,
        fbp,
        fbc,
        value,
        currency,
        custom_data: customDataPayload,
        test_event_code,
        response_data: data,
      });

    // Also log to user_event for unified analytics
    await supabase
      .from('user_event')
      .insert({
        user_id: auth.userId,
        etype: `meta_conversion_${event_name.toLowerCase()}`,
        occurred_at: new Date(eventTime * 1000).toISOString(),
        source: action_source,
        props: {
          event_name,
          value,
          currency,
          ...customDataPayload,
        },
      });

    return NextResponse.json({
      success: true,
      events_received: data.events_received || 1,
      fbtrace_id: data.fbtrace_id,
      pixel_id: PIXEL_ID,
      event_name,
      test_mode: !!test_event_code,
    });

  } catch (error) {
    console.error('Conversions API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send conversion event',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
