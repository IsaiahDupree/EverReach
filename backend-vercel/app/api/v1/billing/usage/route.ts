/**
 * Billing Usage Endpoint
 * GET /api/v1/billing/usage
 * 
 * Returns user's usage vs limits
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

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total contacts
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get AI messages this month (from events or estimate from interactions)
    const { data: aiEvents } = await supabase
      .from('app_events')
      .select('event_name')
      .eq('user_id', userId)
      .eq('event_name', 'ai_message_generated')
      .gte('occurred_at', monthStart.toISOString());

    // Get screenshots this month
    const { data: screenshotEvents } = await supabase
      .from('app_events')
      .select('event_name')
      .eq('user_id', userId)
      .eq('event_name', 'screenshot_analyzed')
      .gte('occurred_at', monthStart.toISOString());

    // Get team members (for team plan)
    const { count: teamMembersCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userId); // Simplified - in real app, use proper org structure

    const usage = {
      contacts: contactsCount || 0,
      ai_messages: aiEvents?.length || 0,
      screenshots: screenshotEvents?.length || 0,
      team_members: (teamMembersCount || 0) + 1, // +1 for owner
      period_start: monthStart.toISOString(),
      period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    };

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('[Billing Usage] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
