/**
 * Analytics Summary Endpoint
 * GET /api/v1/analytics/summary
 * 
 * Returns user's personal analytics summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth-utils';

function getSupabase() { return getServiceClient(); }

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

    // Get total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get contacts created in period
    const { count: contactsCreated } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    // Get total interactions
    const { count: totalInteractions } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get interactions in period
    const { count: interactionsLogged } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('occurred_at', startDate.toISOString());

    // Get messages sent (from interactions)
    const { count: messagesSent } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .gte('occurred_at', startDate.toISOString());

    // Get average warmth score
    const { data: warmthData } = await supabase
      .from('contacts')
      .select('warmth_score')
      .eq('user_id', userId)
      .not('warmth_score', 'is', null);

    const avgWarmth = warmthData && warmthData.length > 0
      ? warmthData.reduce((sum, c) => sum + (c.warmth_score || 0), 0) / warmthData.length
      : 0;

    // Get warmth distribution
    const { data: contacts } = await supabase
      .from('contacts')
      .select('warmth_score, warmth_band')
      .eq('user_id', userId);

    const warmthDistribution = {
      hot: contacts?.filter(c => c.warmth_band === 'hot').length || 0,
      warm: contacts?.filter(c => c.warmth_band === 'warm').length || 0,
      cooling: contacts?.filter(c => c.warmth_band === 'cooling').length || 0,
      cold: contacts?.filter(c => c.warmth_band === 'cold').length || 0,
    };

    // Get AI usage from app_events (if available)
    const { data: aiEvents } = await supabase
      .from('app_events')
      .select('event_name')
      .eq('user_id', userId)
      .in('event_name', ['ai_message_generated', 'ai_contact_analyzed', 'screenshot_analyzed'])
      .gte('occurred_at', startDate.toISOString());

    const aiUsage = {
      messages_generated: aiEvents?.filter(e => e.event_name === 'ai_message_generated').length || 0,
      contacts_analyzed: aiEvents?.filter(e => e.event_name === 'ai_contact_analyzed').length || 0,
      screenshots_analyzed: aiEvents?.filter(e => e.event_name === 'screenshot_analyzed').length || 0,
    };

    return NextResponse.json({
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      contacts: {
        total: totalContacts || 0,
        created_this_period: contactsCreated || 0,
        avg_warmth: Math.round(avgWarmth * 10) / 10,
        warmth_distribution: warmthDistribution,
      },
      interactions: {
        total: totalInteractions || 0,
        logged_this_period: interactionsLogged || 0,
        messages_sent: messagesSent || 0,
      },
      ai_usage: aiUsage,
    });
  } catch (error) {
    console.error('[Analytics Summary] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
