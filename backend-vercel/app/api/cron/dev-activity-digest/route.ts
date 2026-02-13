import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Developer Activity Digest (Cron Job)
 * 
 * Runs daily to send developers a summary of app usage
 * Configured in vercel.json: daily at 9 AM
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    // Verify cron secret (fail-closed)
    const { verifyCron } = await import('@/lib/cron-auth');
    const authError = verifyCron(req);
    if (authError) return authError;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch yesterday's activity
    const { data: events, error } = await supabase
      .from('event_log')
      .select('event_name, ts, user_id, properties')
      .gte('ts', yesterday.toISOString())
      .order('ts', { ascending: false });

    if (error) throw error;

    // Calculate metrics
    const metrics = {
      total_events: events.length,
      unique_users: new Set(events.map(e => e.user_id)).size,
      new_signups: events.filter(e => e.event_name === 'signup_completed').length,
      sessions: events.filter(e => e.event_name === 'session_started').length,
      interactions_logged: events.filter(e => e.event_name === 'interaction_logged').length,
      purchases: events.filter(e => e.event_name === 'purchase_started').length,
      feature_requests: events.filter(e => e.event_name === 'feature_request_submitted').length,
    };

    // Get top active users
    const userActivity = events.reduce((acc, e) => {
      acc[e.user_id] = (acc[e.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([user_id, count]) => ({ user_id, event_count: count }));

    // Send email digest
    const emailHtml = `
      <h1>EverReach Daily Activity Digest</h1>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      
      <h2>📊 Key Metrics (Last 24h)</h2>
      <ul>
        <li><strong>Total Events:</strong> ${metrics.total_events}</li>
        <li><strong>Unique Users:</strong> ${metrics.unique_users}</li>
        <li><strong>New Signups:</strong> ${metrics.new_signups}</li>
        <li><strong>Active Sessions:</strong> ${metrics.sessions}</li>
        <li><strong>Interactions Logged:</strong> ${metrics.interactions_logged}</li>
        <li><strong>Purchase Attempts:</strong> ${metrics.purchases}</li>
        <li><strong>Feature Requests:</strong> ${metrics.feature_requests}</li>
      </ul>

      <h2>👥 Top 5 Active Users</h2>
      <ol>
        ${topUsers.map(u => `<li>User ${u.user_id.substring(0, 8)}... (${u.event_count} events)</li>`).join('')}
      </ol>

      <p><a href="https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/editor">View in Supabase Dashboard</a></p>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'EverReach Alerts <alerts@everreach.app>',
      to: ['isaiahdupree33@gmail.com'], // Developer email
      subject: `📊 EverReach Activity: ${metrics.unique_users} users, ${metrics.total_events} events`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
    }

    return NextResponse.json({
      success: true,
      metrics,
      top_users: topUsers,
      email_sent: !emailError,
      digest_date: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Dev activity digest error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
