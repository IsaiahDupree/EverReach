/**
 * Analytics Activity Endpoint
 * GET /api/v1/analytics/activity
 * 
 * Returns user's activity timeline
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
    const userId = auth.userId;

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily interaction counts
    const { data: interactions } = await supabase
      .from('interactions')
      .select('created_at, channel, type')
      .eq('user_id', userId)
      .gte('occurred_at', startDate.toISOString())
      .order('occurred_at', { ascending: true });

    // Group by day
    const dailyActivity: Record<string, number> = {};
    interactions?.forEach(interaction => {
      const date = (interaction.created_at || (interaction as any).occurred_at).split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    // Convert to array
    const activityTimeline = Object.entries(dailyActivity).map(([date, count]) => ({
      date,
      count,
    }));

    // Get contact creation timeline
    const { data: contacts } = await supabase
      .from('contacts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const dailyContacts: Record<string, number> = {};
    contacts?.forEach(contact => {
      const date = contact.created_at.split('T')[0];
      dailyContacts[date] = (dailyContacts[date] || 0) + 1;
    });

    const contactsTimeline = Object.entries(dailyContacts).map(([date, count]) => ({
      date,
      count,
    }));

    // Get most active days
    const sortedDays = Object.entries(dailyActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      activity_timeline: activityTimeline,
      contacts_timeline: contactsTimeline,
      most_active_days: sortedDays,
      total_active_days: Object.keys(dailyActivity).length,
    });
  } catch (error) {
    console.error('[Analytics Activity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
