/**
 * Metrics collection for monitoring dashboards
 * Tracks webhook deliveries, automation rule executions, API usage, etc.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface WebhookMetrics {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  avg_duration_ms: number;
  consecutive_failures: number;
  last_success_at?: string;
  last_failure_at?: string;
}

export interface RuleMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  last_triggered_at?: string;
  affected_contacts_count: number;
}

export interface APIMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_response_time_ms: number;
  requests_by_endpoint: Record<string, number>;
  errors_by_code: Record<string, number>;
}

/**
 * Track webhook delivery metrics
 */
export async function trackWebhookDelivery(
  webhookId: string,
  status: 'sent' | 'failed',
  durationMs: number,
  error?: string
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update webhook stats
    if (status === 'sent') {
      await supabase
        .from('webhooks')
        .update({
          last_success_at: new Date().toISOString(),
          consecutive_failures: 0,
        })
        .eq('id', webhookId);

      logger.metric('webhook.delivery.success', 1, {
        webhookId,
        durationMs,
      });
    } else {
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('consecutive_failures')
        .eq('id', webhookId)
        .single();

      await supabase
        .from('webhooks')
        .update({
          last_failure_at: new Date().toISOString(),
          consecutive_failures: (webhook?.consecutive_failures || 0) + 1,
        })
        .eq('id', webhookId);

      logger.metric('webhook.delivery.failure', 1, {
        webhookId,
        durationMs,
        error,
      });
    }

    // Log duration for monitoring
    logger.metric('webhook.delivery.duration_ms', durationMs, {
      webhookId,
      status,
    });
  } catch (error) {
    logger.error('Failed to track webhook delivery metrics', error as Error, {
      webhookId,
      status,
    });
  }
}

/**
 * Get webhook metrics for a specific webhook
 */
export async function getWebhookMetrics(webhookId: string): Promise<WebhookMetrics> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('status, duration_ms, sent_at')
    .eq('webhook_id', webhookId);

  if (!deliveries || deliveries.length === 0) {
    return {
      total_deliveries: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
      success_rate: 0,
      avg_duration_ms: 0,
      consecutive_failures: 0,
    };
  }

  const successful = deliveries.filter(d => d.status === 'sent');
  const failed = deliveries.filter(d => d.status === 'failed');

  const totalDuration = deliveries.reduce((sum, d) => sum + (d.duration_ms || 0), 0);
  const avgDuration = totalDuration / deliveries.length;

  const lastSuccess = successful.length > 0
    ? successful.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0].sent_at
    : undefined;

  const lastFailure = failed.length > 0
    ? failed.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0].sent_at
    : undefined;

  // Calculate consecutive failures
  const sortedByDate = [...deliveries].sort((a, b) => 
    new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
  
  let consecutiveFailures = 0;
  for (const delivery of sortedByDate) {
    if (delivery.status === 'failed') {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return {
    total_deliveries: deliveries.length,
    successful_deliveries: successful.length,
    failed_deliveries: failed.length,
    success_rate: (successful.length / deliveries.length) * 100,
    avg_duration_ms: Math.round(avgDuration),
    consecutive_failures: consecutiveFailures,
    last_success_at: lastSuccess,
    last_failure_at: lastFailure,
  };
}

/**
 * Track automation rule execution
 */
export async function trackRuleExecution(
  ruleId: string,
  status: 'success' | 'failed',
  durationMs: number,
  affectedContacts: number,
  error?: string
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update rule stats
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('trigger_count')
      .eq('id', ruleId)
      .single();

    await supabase
      .from('automation_rules')
      .update({
        trigger_count: (rule?.trigger_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    logger.metric(`rule.execution.${status}`, 1, {
      ruleId,
      durationMs,
      affectedContacts,
      error,
    });

    logger.metric('rule.execution.duration_ms', durationMs, {
      ruleId,
      status,
    });

    logger.metric('rule.execution.affected_contacts', affectedContacts, {
      ruleId,
    });
  } catch (error) {
    logger.error('Failed to track rule execution metrics', error as Error, {
      ruleId,
      status,
    });
  }
}

/**
 * Track API request metrics
 */
export async function trackAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  orgId?: string,
  apiKeyId?: string
): Promise<void> {
  try {
    const isSuccess = statusCode < 400;

    logger.metric('api.request', 1, {
      method,
      path,
      statusCode,
      durationMs,
      orgId,
      apiKeyId,
      success: isSuccess,
    });

    logger.metric('api.request.duration_ms', durationMs, {
      method,
      path,
      statusCode,
    });

    if (!isSuccess) {
      logger.metric('api.request.error', 1, {
        method,
        path,
        statusCode,
        orgId,
      });
    }
  } catch (error) {
    logger.error('Failed to track API request metrics', error as Error);
  }
}

/**
 * Get rate limit metrics for monitoring
 */
export async function getRateLimitMetrics(orgId: string): Promise<{
  requests_per_minute: number;
  requests_per_hour: number;
  limit_per_minute: number;
  limit_per_hour: number;
  utilization_pct: number;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get recent rate limit windows
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { data: windows } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('key_type', 'org')
    .eq('key_value', orgId)
    .gte('window_start', oneHourAgo);

  if (!windows || windows.length === 0) {
    return {
      requests_per_minute: 0,
      requests_per_hour: 0,
      limit_per_minute: 600,
      limit_per_hour: 10000,
      utilization_pct: 0,
    };
  }

  const recentMinuteWindows = windows.filter(w => w.window_start >= oneMinuteAgo);
  const requestsPerMinute = recentMinuteWindows.reduce((sum, w) => sum + w.request_count, 0);
  const requestsPerHour = windows.reduce((sum, w) => sum + w.request_count, 0);

  return {
    requests_per_minute: requestsPerMinute,
    requests_per_hour: requestsPerHour,
    limit_per_minute: 600,
    limit_per_hour: 10000,
    utilization_pct: (requestsPerHour / 10000) * 100,
  };
}

/**
 * Alert on critical metrics
 */
export async function checkAlerts(orgId: string): Promise<{
  alerts: Array<{ severity: 'warning' | 'critical'; message: string }>;
}> {
  const alerts: Array<{ severity: 'warning' | 'critical'; message: string }> = [];

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check for webhooks with high consecutive failures
  const { data: failingWebhooks } = await supabase
    .from('webhooks')
    .select('id, url, consecutive_failures')
    .eq('org_id', orgId)
    .gt('consecutive_failures', 3);

  if (failingWebhooks && failingWebhooks.length > 0) {
    for (const webhook of failingWebhooks) {
      alerts.push({
        severity: webhook.consecutive_failures > 10 ? 'critical' : 'warning',
        message: `Webhook ${webhook.url} has ${webhook.consecutive_failures} consecutive failures`,
      });
    }
  }

  // Check rate limit utilization
  const rateLimitMetrics = await getRateLimitMetrics(orgId);
  if (rateLimitMetrics.utilization_pct > 90) {
    alerts.push({
      severity: 'warning',
      message: `Rate limit utilization at ${rateLimitMetrics.utilization_pct.toFixed(1)}%`,
    });
  }

  return { alerts };
}
