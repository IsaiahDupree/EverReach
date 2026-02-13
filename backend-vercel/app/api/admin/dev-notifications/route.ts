import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function getSupabase() { return getServiceClient(); }

/**
 * Developer Notifications - Real-time App Usage Alerts
 * 
 * GET /api/admin/dev-notifications - Fetch recent activity
 * POST /api/admin/dev-notifications/subscribe - Subscribe to alerts (email/Slack)
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const searchParams = req.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24');
    const eventTypes = searchParams.get('events')?.split(',') || [
      'signup_completed',
      'session_started',
      'purchase_started',
      'interaction_logged',
    ];

    // Get recent activity
    const { data: events, error } = await supabase
      .from('event_log')
      .select('event_name, ts, user_id, properties')
      .in('event_name', eventTypes)
      .gte('ts', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('ts', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Aggregate stats
    const stats = {
      total_events: events.length,
      by_type: eventTypes.reduce((acc, type) => {
        acc[type] = events.filter(e => e.event_name === type).length;
        return acc;
      }, {} as Record<string, number>),
      unique_users: new Set(events.map(e => e.user_id)).size,
      recent_events: events.slice(0, 10),
    };

    return NextResponse.json({
      success: true,
      hours,
      stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Dev notifications error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_channel, destination, events } = body;

    // Validate
    if (!notification_channel || !destination) {
      return NextResponse.json(
        { success: false, error: 'notification_channel and destination required' },
        { status: 400 }
      );
    }

    // Store subscription (you can extend this with a dev_notification_subscriptions table)
    const subscription = {
      id: crypto.randomUUID(),
      channel: notification_channel, // 'email' | 'slack' | 'discord'
      destination,
      events: events || ['signup_completed', 'purchase_started'],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Subscription created (demo mode)',
      subscription,
      next_steps: [
        'Set up webhook in Supabase for real-time notifications',
        'Configure email service (Resend) or Slack webhook',
        'Enable cron job to send digest emails',
      ],
    });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
