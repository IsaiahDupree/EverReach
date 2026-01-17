/**
 * Attribution Analytics API
 * GET /api/v1/marketing/attribution
 * 
 * Returns last-touch attribution data showing which channels/campaigns drove conversions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const source = searchParams.get('source');
    const medium = searchParams.get('medium');
    const campaign = searchParams.get('campaign');

    // Build query for last-touch attribution
    let query = supabase
      .from('vw_last_touch_before_conversion')
      .select('*');

    // Apply filters
    if (startDate) {
      query = query.gte('conv_time', startDate);
    }
    if (endDate) {
      query = query.lte('conv_time', endDate);
    }
    if (source) {
      query = query.eq('source', source);
    }
    // Note: utm_medium and utm_campaign are stored in props JSONB, 
    // filtering on those would require custom queries

    const { data: attribution, error } = await query
      .order('conv_time', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Attribution query failed: ${error.message}`);
    }

    // Aggregate by source (source is the channel from user_event)
    const bySource: Record<string, number> = {};
    const byEventType: Record<string, number> = {};

    attribution?.forEach((record: any) => {
      const source = record.source || 'direct';
      const eventType = record.last_touch_type || 'unknown';

      bySource[source] = (bySource[source] || 0) + 1;
      byEventType[eventType] = (byEventType[eventType] || 0) + 1;
    });

    return NextResponse.json({
      attribution: attribution || [],
      summary: {
        total_conversions: attribution?.length || 0,
        by_source: bySource,
        by_event_type: byEventType,
      },
      filters: {
        start_date: startDate,
        end_date: endDate,
        source,
      },
    });

  } catch (error) {
    console.error('Attribution API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribution data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
