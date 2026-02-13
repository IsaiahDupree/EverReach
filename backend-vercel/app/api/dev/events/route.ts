import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'edge';

// POST - Track event from frontend/mobile
export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();

    const body = await req.json();
    const {
      event_name,
      user_id,
      anonymous_id,
      context = {},
      properties = {}
    } = body;

    if (!event_name) {
      return NextResponse.json(
        { error: 'event_name is required' },
        { status: 400 }
      );
    }

    // Insert event
    const { data, error } = await supabase
      .from('app_events')
      .insert({
        event_name,
        user_id: user_id || null,
        anonymous_id: anonymous_id || null,
        occurred_at: new Date().toISOString(),
        context,
        properties
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert event:', error);
      return NextResponse.json(
        { error: 'Failed to insert event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  } catch (error: any) {
    console.error('Event tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch recent events for dashboard
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const event_name = searchParams.get('event_name');
    const user_id = searchParams.get('user_id');

    let query = supabase
      .from('app_events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (event_name) {
      query = query.eq('event_name', event_name);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: events, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Get unique event names for filter
    const { data: eventNames } = await supabase
      .from('app_events')
      .select('event_name')
      .order('event_name');

    const uniqueEventNames = [...new Set(eventNames?.map(e => e.event_name) || [])];

    // Get event counts by name (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: countData } = await supabase
      .from('app_events')
      .select('event_name')
      .gte('occurred_at', twentyFourHoursAgo);

    const eventCounts: Record<string, number> = {};
    countData?.forEach(e => {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    });

    return NextResponse.json({
      events,
      meta: {
        total: events?.length || 0,
        uniqueEventNames,
        eventCounts,
        filters: { event_name, user_id, limit }
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
