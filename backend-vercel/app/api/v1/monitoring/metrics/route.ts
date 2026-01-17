import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get user from auth token
async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user;
}

// GET /v1/monitoring/metrics - Get monitoring dashboard metrics
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const metricType = searchParams.get('type'); // webhook | rule | api | rate_limit | alerts

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Fetch different metrics based on type
    if (!metricType || metricType === 'all') {
      // Return all metrics
      const [webhooks, rules, alerts] = await Promise.all([
        getWebhookMetrics(supabase, profile.org_id),
        getRuleMetrics(supabase, profile.org_id),
        getAlerts(supabase, profile.org_id),
      ]);

      return NextResponse.json({
        org_id: profile.org_id,
        timestamp: new Date().toISOString(),
        webhooks,
        rules,
        alerts,
      });
    }

    if (metricType === 'webhook') {
      const metrics = await getWebhookMetrics(supabase, profile.org_id);
      return NextResponse.json({
        org_id: profile.org_id,
        type: 'webhook',
        data: metrics,
      });
    }

    if (metricType === 'rule') {
      const metrics = await getRuleMetrics(supabase, profile.org_id);
      return NextResponse.json({
        org_id: profile.org_id,
        type: 'rule',
        data: metrics,
      });
    }

    if (metricType === 'rate_limit') {
      const metrics = await getRateLimitMetrics(supabase, profile.org_id);
      return NextResponse.json({
        org_id: profile.org_id,
        type: 'rate_limit',
        data: metrics,
      });
    }

    if (metricType === 'alerts') {
      const alerts = await getAlerts(supabase, profile.org_id);
      return NextResponse.json({
        org_id: profile.org_id,
        type: 'alerts',
        data: alerts,
      });
    }

    return NextResponse.json(
      { error: 'Invalid metric type. Use: webhook, rule, rate_limit, alerts, or all' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Monitoring metrics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getWebhookMetrics(supabase: any, orgId: string) {
  const { data: metrics } = await supabase
    .from('mv_webhook_performance')
    .select('*')
    .eq('org_id', orgId);

  const summary = {
    total_webhooks: metrics?.length || 0,
    enabled_webhooks: metrics?.filter((w: any) => w.enabled).length || 0,
    total_deliveries: metrics?.reduce((sum: number, w: any) => sum + (w.total_deliveries || 0), 0) || 0,
    successful_deliveries: metrics?.reduce((sum: number, w: any) => sum + (w.successful_deliveries || 0), 0) || 0,
    failed_deliveries: metrics?.reduce((sum: number, w: any) => sum + (w.failed_deliveries || 0), 0) || 0,
    avg_success_rate: metrics?.length > 0
      ? metrics.reduce((sum: number, w: any) => sum + (w.success_rate_pct || 0), 0) / metrics.length
      : 0,
    webhooks_with_failures: metrics?.filter((w: any) => w.consecutive_failures > 0).length || 0,
    critical_webhooks: metrics?.filter((w: any) => w.consecutive_failures >= 10).length || 0,
  };

  return {
    summary,
    webhooks: metrics || [],
  };
}

async function getRuleMetrics(supabase: any, orgId: string) {
  const { data: metrics } = await supabase
    .from('mv_rule_performance')
    .select('*')
    .eq('org_id', orgId);

  const summary = {
    total_rules: metrics?.length || 0,
    enabled_rules: metrics?.filter((r: any) => r.enabled).length || 0,
    total_triggers: metrics?.reduce((sum: number, r: any) => sum + (r.trigger_count || 0), 0) || 0,
    triggers_24h: metrics?.reduce((sum: number, r: any) => sum + (r.executions_24h || 0), 0) || 0,
    triggers_7d: metrics?.reduce((sum: number, r: any) => sum + (r.executions_7d || 0), 0) || 0,
    rules_by_type: metrics?.reduce((acc: any, r: any) => {
      acc[r.rule_type] = (acc[r.rule_type] || 0) + 1;
      return acc;
    }, {}) || {},
  };

  return {
    summary,
    rules: metrics || [],
  };
}

async function getRateLimitMetrics(supabase: any, orgId: string) {
  const { data: metrics } = await supabase
    .from('v_rate_limit_utilization')
    .select('*')
    .eq('identifier', orgId)
    .limit(10);

  const summary = {
    current_utilization_pct: metrics?.[0]?.utilization_pct || 0,
    status: metrics?.[0]?.status || 'normal',
    limit_max: metrics?.[0]?.limit_max || 10000,
    request_count: metrics?.[0]?.request_count || 0,
    seconds_until_reset: metrics?.[0]?.seconds_until_reset || 0,
  };

  return {
    summary,
    windows: metrics || [],
  };
}

async function getAlerts(supabase: any, orgId: string) {
  // Get webhook-related alerts
  const { data: webhookAlerts } = await supabase
    .from('v_webhook_health')
    .select('*')
    .eq('org_id', orgId)
    .in('health_status', ['critical', 'warning']);

  const alerts = [];

  // Add webhook failure alerts
  if (webhookAlerts) {
    for (const webhook of webhookAlerts) {
      alerts.push({
        type: 'webhook_failure',
        severity: webhook.health_status === 'critical' ? 'critical' : 'warning',
        resource_id: webhook.webhook_id,
        resource_name: webhook.url,
        message: `Webhook has ${webhook.consecutive_failures} consecutive failures`,
        created_at: webhook.last_failure_at,
      });
    }
  }

  // Check rate limits
  const { data: rateLimitAlerts } = await supabase
    .from('v_rate_limit_utilization')
    .select('*')
    .eq('identifier', orgId)
    .eq('status', 'warning');

  if (rateLimitAlerts && rateLimitAlerts.length > 0) {
    for (const rl of rateLimitAlerts) {
      alerts.push({
        type: 'rate_limit',
        severity: 'warning',
        resource_id: rl.identifier,
        resource_name: `${rl.key_type} rate limit`,
        message: `Rate limit at ${rl.utilization_pct.toFixed(1)}% utilization`,
        created_at: new Date().toISOString(),
      });
    }
  }

  return {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    alerts,
  };
}
