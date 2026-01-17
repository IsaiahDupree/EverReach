import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * POST /api/health/ping
 * Performs health checks on all critical services and updates service_status table
 * 
 * Checks:
 * - Supabase DB (RTT, pooler errors)
 * - Webhook endpoints (last received time, lag)
 * - External API tokens (expiry)
 * 
 * Should be called every 5-15 minutes via cron
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Verify cron/internal auth
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const now = new Date();
    const results: Record<string, any> = {};

    // Helper to update service status
    async function updateStatus(
      service: string,
      status: 'healthy' | 'degraded' | 'down' | 'unknown',
      latency_ms: number | null,
      message?: string,
      metadata?: Record<string, any>
    ) {
      const update: Record<string, any> = {
        service,
        status,
        latency_ms,
        last_check: now.toISOString(),
        message: message || null,
        metadata: metadata || {},
        updated_at: now.toISOString()
      };

      if (status === 'healthy') {
        update.last_success = now.toISOString();
        update.error_count = 0;
      } else {
        update.last_failure = now.toISOString();
      }

      await supabase.from('service_status').upsert(update, { onConflict: 'service' });
    }

    // 1. Check Supabase DB health
    try {
      const dbStart = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const rtt = Date.now() - dbStart;

      if (error) {
        await updateStatus('supabase_db', 'down', rtt, error.message);
        results.supabase_db = { status: 'down', rtt, error: error.message };
      } else {
        await updateStatus('supabase_db', 'healthy', rtt, 'Database responding normally');
        results.supabase_db = { status: 'healthy', rtt };
      }
    } catch (error: any) {
      await updateStatus('supabase_db', 'down', null, error.message);
      results.supabase_db = { status: 'down', error: error.message };
    }

    // 2. Check webhook lag (time since last webhook received)
    const webhookProviders = ['stripe', 'revenuecat', 'superwall', 'resend'];
    
    for (const provider of webhookProviders) {
      try {
        const { data: lastWebhook } = await supabase
          .from('webhook_log')
          .select('processed_at')
          .eq('provider', provider)
          .order('processed_at', { ascending: false })
          .limit(1)
          .single();

        if (lastWebhook) {
          const lagMs = now.getTime() - new Date(lastWebhook.processed_at).getTime();
          const lagMinutes = Math.floor(lagMs / 1000 / 60);
          
          // Flag as degraded if no webhook in 24 hours
          const status = lagMinutes > 1440 ? 'degraded' : 'healthy';
          const message = lagMinutes > 1440 
            ? `No webhook received in ${lagMinutes} minutes` 
            : 'Webhooks receiving normally';

          await updateStatus(
            `webhook_${provider}`,
            status,
            null,
            message,
            { lag_minutes: lagMinutes, last_received: lastWebhook.processed_at }
          );

          results[`webhook_${provider}`] = { status, lag_minutes: lagMinutes };
        } else {
          await updateStatus(
            `webhook_${provider}`,
            'unknown',
            null,
            'No webhooks received yet',
            { lag_minutes: null }
          );
          results[`webhook_${provider}`] = { status: 'unknown' };
        }
      } catch (error: any) {
        await updateStatus(`webhook_${provider}`, 'unknown', null, error.message);
        results[`webhook_${provider}`] = { status: 'unknown', error: error.message };
      }
    }

    // 3. Check external API health (optional - can ping actual APIs)
    // Example: Check if Stripe API is reachable
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeStart = Date.now();
        const response = await fetch('https://api.stripe.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          }
        });
        const rtt = Date.now() - stripeStart;

        if (response.ok) {
          await updateStatus('stripe_api', 'healthy', rtt, 'API responding');
          results.stripe_api = { status: 'healthy', rtt };
        } else {
          await updateStatus('stripe_api', 'degraded', rtt, `HTTP ${response.status}`);
          results.stripe_api = { status: 'degraded', http_status: response.status };
        }
      } catch (error: any) {
        await updateStatus('stripe_api', 'down', null, error.message);
        results.stripe_api = { status: 'down', error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      checked_at: now.toISOString(),
      results
    });

  } catch (error: any) {
    console.error('[health-ping] Error:', error);
    return NextResponse.json({
      error: 'Health check failed',
      details: error.message
    }, { status: 500 });
  }
}

// Health check for the health checker itself (meta!)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'health-ping',
    description: 'Service health monitoring endpoint',
    schedule: 'Call via cron every 5-15 minutes',
    timestamp: new Date().toISOString()
  });
}
