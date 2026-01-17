import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/alerts/check
 * Checks for alert conditions and sends notifications
 * 
 * Alert Rules:
 * 1. Churn spike: churned_subscriptions > 3σ over 7-day mean
 * 2. Webhook lag: Any integration lag > 15 minutes
 * 3. Service down: Any service status = 'down'
 * 4. Spend without trials: Campaign spend > $100 with 0 trials in 24h
 * 5. Cost spike: OpenAI costs > 2x daily average
 * 6. Email deliverability: Bounce rate > 5%
 * 
 * Should be called every 15 minutes via cron
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
    const ALERT_EMAIL = process.env.ALERT_EMAIL;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const now = new Date();
    const alertsTriggered: any[] = [];

    // Helper to send notification
    async function sendAlert(
      severity: 'critical' | 'warning' | 'info',
      title: string,
      message: string,
      metadata: Record<string, any> = {}
    ) {
      console.log(`[alert] ${severity.toUpperCase()}: ${title}`);

      // Log to database
      await supabase.from('alert_history').insert({
        severity,
        title,
        message,
        metadata,
        triggered_at: now.toISOString()
      });

      alertsTriggered.push({ severity, title, message, metadata });

      // Send to Slack
      if (SLACK_WEBHOOK_URL) {
        const color = severity === 'critical' ? '#FF0000' : severity === 'warning' ? '#FFA500' : '#00FF00';
        const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
        
        await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachments: [{
              color,
              title: `${emoji} ${title}`,
              text: message,
              fields: Object.entries(metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true
              })),
              footer: 'EverReach Monitoring',
              ts: Math.floor(now.getTime() / 1000)
            }]
          })
        });
      }

      // Send email (using Resend or other email service)
      // Omitted for brevity - would use Resend API
    }

    // =============================================
    // Alert 1: Churn Spike Detection
    // =============================================
    try {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: churnData } = await supabase
        .from('metrics_timeseries')
        .select('value')
        .eq('metric_name', 'stripe.churned_subscriptions')
        .gte('ts', sevenDaysAgo.toISOString())
        .order('ts', { ascending: false });

      if (churnData && churnData.length >= 7) {
        const values = churnData.map(d => Number(d.value));
        const todayChurn = values[0];
        const historicalValues = values.slice(1);
        
        const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
        const stdDev = Math.sqrt(
          historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
        );

        const threshold = mean + (3 * stdDev); // 3 sigma

        if (todayChurn > threshold) {
          await sendAlert(
            'critical',
            'Churn Spike Detected',
            `Today's churn (${todayChurn}) is ${(todayChurn / mean).toFixed(1)}x the 7-day average`,
            {
              today_churn: todayChurn,
              avg_churn: mean.toFixed(1),
              threshold: threshold.toFixed(1),
              stddev: stdDev.toFixed(1)
            }
          );
        }
      }
    } catch (error) {
      console.error('[alert] Churn spike check failed:', error);
    }

    // =============================================
    // Alert 2: Webhook Lag Detection
    // =============================================
    try {
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      
      const { data: services } = await supabase
        .from('service_status')
        .select('service, last_check, metadata')
        .like('service', 'webhook_%');

      for (const service of services || []) {
        const lastCheck = new Date(service.last_check);
        const lagMinutes = Math.floor((now.getTime() - lastCheck.getTime()) / 60000);

        if (lagMinutes > 15) {
          await sendAlert(
            'warning',
            `Webhook Lag: ${service.service}`,
            `No webhook received in ${lagMinutes} minutes`,
            {
              service: service.service,
              last_webhook: service.last_check,
              lag_minutes: lagMinutes
            }
          );
        }
      }
    } catch (error) {
      console.error('[alert] Webhook lag check failed:', error);
    }

    // =============================================
    // Alert 3: Service Down Detection
    // =============================================
    try {
      const { data: downServices } = await supabase
        .from('service_status')
        .select('service, status, message, last_failure')
        .eq('status', 'down');

      for (const service of downServices || []) {
        await sendAlert(
          'critical',
          `Service Down: ${service.service}`,
          service.message || 'Service is not responding',
          {
            service: service.service,
            status: service.status,
            last_failure: service.last_failure
          }
        );
      }
    } catch (error) {
      console.error('[alert] Service down check failed:', error);
    }

    // =============================================
    // Alert 4: Spend Without Trials
    // =============================================
    try {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Get ad spend from yesterday
      const { data: spendData } = await supabase
        .from('metrics_timeseries')
        .select('value, labels')
        .in('metric_name', ['meta.spend_usd', 'asa.spend_usd', 'play.paid_spend_usd'])
        .gte('ts', yesterday.toISOString())
        .lt('ts', now.toISOString());

      // Get trials started from yesterday
      const { data: trialData } = await supabase
        .from('metrics_timeseries')
        .select('value')
        .eq('metric_name', 'revenuecat.trial_started')
        .gte('ts', yesterday.toISOString())
        .lt('ts', now.toISOString());

      const totalSpend = spendData?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
      const totalTrials = trialData?.reduce((sum, d) => sum + Number(d.value), 0) || 0;

      if (totalSpend > 100 && totalTrials === 0) {
        await sendAlert(
          'warning',
          'High Spend, Zero Trials',
          `Spent $${totalSpend.toFixed(2)} yesterday with 0 trial starts`,
          {
            spend_usd: totalSpend.toFixed(2),
            trials: totalTrials,
            cpa: 'N/A'
          }
        );
      }
    } catch (error) {
      console.error('[alert] Spend check failed:', error);
    }

    // =============================================
    // Alert 5: OpenAI Cost Spike
    // =============================================
    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: costData } = await supabase
        .from('metrics_timeseries')
        .select('value, ts')
        .eq('metric_name', 'openai.total_cost_usd')
        .gte('ts', thirtyDaysAgo.toISOString())
        .order('ts', { ascending: false });

      if (costData && costData.length > 1) {
        const todayCost = Number(costData[0].value);
        const historicalCosts = costData.slice(1).map(d => Number(d.value));
        const avgCost = historicalCosts.reduce((a, b) => a + b, 0) / historicalCosts.length;

        if (todayCost > avgCost * 2) {
          await sendAlert(
            'warning',
            'OpenAI Cost Spike',
            `Today's AI costs ($${todayCost.toFixed(2)}) are ${(todayCost / avgCost).toFixed(1)}x the 30-day average`,
            {
              today_cost: `$${todayCost.toFixed(2)}`,
              avg_cost: `$${avgCost.toFixed(2)}`,
              multiplier: `${(todayCost / avgCost).toFixed(1)}x`
            }
          );
        }
      }
    } catch (error) {
      console.error('[alert] OpenAI cost check failed:', error);
    }

    // =============================================
    // Alert 6: Email Deliverability Issues
    // =============================================
    try {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const { data: emailData } = await supabase
        .from('metrics_timeseries')
        .select('metric_name, value')
        .in('metric_name', ['resend.sent', 'resend.bounced'])
        .gte('ts', yesterday.toISOString())
        .lt('ts', now.toISOString());

      const sent = emailData?.find(d => d.metric_name === 'resend.sent')?.value || 0;
      const bounced = emailData?.find(d => d.metric_name === 'resend.bounced')?.value || 0;

      if (sent > 0) {
        const bounceRate = (Number(bounced) / Number(sent)) * 100;

        if (bounceRate > 5) {
          await sendAlert(
            'warning',
            'High Email Bounce Rate',
            `Bounce rate is ${bounceRate.toFixed(1)}% (threshold: 5%)`,
            {
              sent: Number(sent),
              bounced: Number(bounced),
              bounce_rate: `${bounceRate.toFixed(1)}%`
            }
          );
        }
      }
    } catch (error) {
      console.error('[alert] Email deliverability check failed:', error);
    }

    return NextResponse.json({
      success: true,
      checked_at: now.toISOString(),
      alerts_triggered: alertsTriggered.length,
      alerts: alertsTriggered
    });

  } catch (error: any) {
    console.error('[alerts] Error checking alerts:', error);
    return NextResponse.json({
      error: 'Alert check failed',
      details: error.message
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'alerts-check',
    description: 'Alert monitoring and notification system',
    schedule: 'Call via cron every 15 minutes',
    timestamp: new Date().toISOString()
  });
}
