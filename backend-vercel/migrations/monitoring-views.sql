-- Monitoring & Observability Views
-- Dashboard-ready queries for webhook success rates, rule execution metrics, API usage

-- ======================================================================================
-- 1. Webhook Performance Materialized View
-- ======================================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_webhook_performance AS
SELECT
  w.id AS webhook_id,
  w.org_id,
  w.url,
  w.enabled,
  w.consecutive_failures,
  w.last_success_at,
  w.last_failure_at,
  w.created_at,
  -- Delivery metrics
  COUNT(wd.id) AS total_deliveries,
  COUNT(wd.id) FILTER (WHERE wd.status = 'sent') AS successful_deliveries,
  COUNT(wd.id) FILTER (WHERE wd.status = 'failed') AS failed_deliveries,
  COUNT(wd.id) FILTER (WHERE wd.status = 'pending') AS pending_deliveries,
  -- Success rate
  CASE 
    WHEN COUNT(wd.id) > 0 THEN 
      (COUNT(wd.id) FILTER (WHERE wd.status = 'sent')::FLOAT / COUNT(wd.id) * 100)
    ELSE 0
  END AS success_rate_pct,
  -- Performance metrics
  AVG(wd.duration_ms) FILTER (WHERE wd.duration_ms IS NOT NULL) AS avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wd.duration_ms) FILTER (WHERE wd.duration_ms IS NOT NULL) AS p95_duration_ms,
  MAX(wd.duration_ms) AS max_duration_ms,
  -- Recent activity (last 24 hours)
  COUNT(wd.id) FILTER (WHERE wd.sent_at >= NOW() - INTERVAL '24 hours') AS deliveries_24h,
  COUNT(wd.id) FILTER (WHERE wd.sent_at >= NOW() - INTERVAL '24 hours' AND wd.status = 'failed') AS failures_24h,
  -- Recent activity (last 7 days)
  COUNT(wd.id) FILTER (WHERE wd.sent_at >= NOW() - INTERVAL '7 days') AS deliveries_7d,
  COUNT(wd.id) FILTER (WHERE wd.sent_at >= NOW() - INTERVAL '7 days' AND wd.status = 'failed') AS failures_7d
FROM webhooks w
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
GROUP BY w.id, w.org_id, w.url, w.enabled, w.consecutive_failures, w.last_success_at, w.last_failure_at, w.created_at;

-- Index for fast org-level queries
CREATE INDEX IF NOT EXISTS idx_mv_webhook_performance_org ON mv_webhook_performance(org_id);
CREATE INDEX IF NOT EXISTS idx_mv_webhook_performance_success_rate ON mv_webhook_performance(success_rate_pct);

-- ======================================================================================
-- 2. Automation Rule Performance Materialized View
-- ======================================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_rule_performance AS
SELECT
  ar.id AS rule_id,
  ar.org_id,
  ar.name AS rule_name,
  ar.type AS rule_type,
  ar.enabled,
  ar.trigger_count,
  ar.last_triggered_at,
  ar.created_at,
  -- Segment info (if applicable)
  ar.segment_id,
  s.name AS segment_name,
  s.member_count AS segment_member_count,
  -- Execution metrics (placeholder - requires rule_executions table)
  -- In production, join with rule_executions table when implemented
  0 AS total_executions,
  0 AS successful_executions,
  0 AS failed_executions,
  0 AS success_rate_pct,
  0 AS avg_duration_ms,
  0 AS total_affected_contacts,
  -- Recent activity estimates based on trigger_count
  -- This is a placeholder until rule_executions table exists
  CASE 
    WHEN ar.last_triggered_at >= NOW() - INTERVAL '24 hours' THEN 1
    ELSE 0
  END AS executions_24h,
  CASE 
    WHEN ar.last_triggered_at >= NOW() - INTERVAL '7 days' THEN ar.trigger_count
    ELSE 0
  END AS executions_7d
FROM automation_rules ar
LEFT JOIN segments s ON ar.segment_id = s.id;

-- Index for fast org-level queries
CREATE INDEX IF NOT EXISTS idx_mv_rule_performance_org ON mv_rule_performance(org_id);
CREATE INDEX IF NOT EXISTS idx_mv_rule_performance_type ON mv_rule_performance(rule_type);
CREATE INDEX IF NOT EXISTS idx_mv_rule_performance_enabled ON mv_rule_performance(enabled);

-- ======================================================================================
-- 3. API Usage Metrics View (from audit logs)
-- ======================================================================================

CREATE OR REPLACE VIEW v_api_usage_metrics AS
SELECT
  org_id,
  DATE_TRUNC('hour', created_at) AS hour,
  -- Request counts
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status_code < 400) AS successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
  -- Success rate
  CASE 
    WHEN COUNT(*) > 0 THEN 
      (COUNT(*) FILTER (WHERE status_code < 400)::FLOAT / COUNT(*) * 100)
    ELSE 0
  END AS success_rate_pct,
  -- Performance metrics
  AVG(response_time_ms) AS avg_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_response_time_ms,
  MAX(response_time_ms) AS max_response_time_ms,
  -- Breakdown by endpoint
  jsonb_object_agg(
    COALESCE(resource_type, 'unknown'), 
    COUNT(*) FILTER (WHERE resource_type IS NOT NULL)
  ) AS requests_by_resource,
  -- Error breakdown
  jsonb_object_agg(
    status_code::TEXT, 
    COUNT(*) FILTER (WHERE status_code >= 400)
  ) FILTER (WHERE status_code >= 400) AS errors_by_status_code
FROM api_audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY org_id, DATE_TRUNC('hour', created_at);

-- ======================================================================================
-- 4. Rate Limit Utilization View
-- ======================================================================================

CREATE OR REPLACE VIEW v_rate_limit_utilization AS
SELECT
  key_type,
  key_value AS identifier,
  window_start,
  request_count,
  limit_max,
  -- Utilization percentage
  (request_count::FLOAT / limit_max * 100) AS utilization_pct,
  -- Time until window resets
  EXTRACT(EPOCH FROM (window_start + INTERVAL '1 minute' - NOW())) AS seconds_until_reset,
  -- Status
  CASE
    WHEN request_count >= limit_max THEN 'throttled'
    WHEN request_count >= (limit_max * 0.9) THEN 'warning'
    ELSE 'normal'
  END AS status
FROM api_rate_limits
WHERE window_start >= NOW() - INTERVAL '1 hour'
ORDER BY utilization_pct DESC;

-- ======================================================================================
-- 5. Webhook Health Check View
-- ======================================================================================

CREATE OR REPLACE VIEW v_webhook_health AS
SELECT
  w.id AS webhook_id,
  w.org_id,
  w.url,
  w.enabled,
  w.consecutive_failures,
  w.last_success_at,
  w.last_failure_at,
  -- Health status
  CASE
    WHEN NOT w.enabled THEN 'disabled'
    WHEN w.consecutive_failures >= 10 THEN 'critical'
    WHEN w.consecutive_failures >= 5 THEN 'warning'
    WHEN w.last_success_at IS NULL THEN 'untested'
    WHEN w.last_success_at < NOW() - INTERVAL '7 days' THEN 'inactive'
    ELSE 'healthy'
  END AS health_status,
  -- Recent failure rate (last 24h)
  (
    SELECT COUNT(*) FILTER (WHERE wd.status = 'failed')::FLOAT / NULLIF(COUNT(*), 0) * 100
    FROM webhook_deliveries wd
    WHERE wd.webhook_id = w.id
      AND wd.sent_at >= NOW() - INTERVAL '24 hours'
  ) AS failure_rate_24h,
  -- Days since last success
  EXTRACT(DAY FROM NOW() - w.last_success_at) AS days_since_last_success
FROM webhooks w;

-- ======================================================================================
-- 6. Alert Thresholds View
-- ======================================================================================

CREATE OR REPLACE VIEW v_alert_conditions AS
SELECT
  'webhook_failures' AS alert_type,
  webhook_id AS resource_id,
  url AS resource_name,
  'critical' AS severity,
  'Webhook has ' || consecutive_failures || ' consecutive failures' AS message
FROM webhooks
WHERE consecutive_failures >= 10 AND enabled = true

UNION ALL

SELECT
  'webhook_failures' AS alert_type,
  webhook_id AS resource_id,
  url AS resource_name,
  'warning' AS severity,
  'Webhook has ' || consecutive_failures || ' consecutive failures' AS message
FROM webhooks
WHERE consecutive_failures >= 5 AND consecutive_failures < 10 AND enabled = true

UNION ALL

SELECT
  'rate_limit' AS alert_type,
  key_value AS resource_id,
  key_type || ' rate limit' AS resource_name,
  'warning' AS severity,
  'Rate limit at ' || ROUND((request_count::FLOAT / limit_max * 100), 1) || '% utilization' AS message
FROM api_rate_limits
WHERE (request_count::FLOAT / limit_max) >= 0.9
  AND window_start >= NOW() - INTERVAL '5 minutes';

-- ======================================================================================
-- 7. Refresh Functions
-- ======================================================================================

-- Function to refresh all monitoring views
CREATE OR REPLACE FUNCTION refresh_monitoring_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_webhook_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_rule_performance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================================
-- 8. Comments for Documentation
-- ======================================================================================

COMMENT ON MATERIALIZED VIEW mv_webhook_performance IS 'Webhook delivery metrics for monitoring dashboards';
COMMENT ON MATERIALIZED VIEW mv_rule_performance IS 'Automation rule execution metrics for monitoring dashboards';
COMMENT ON VIEW v_api_usage_metrics IS 'Hourly API usage aggregated from audit logs';
COMMENT ON VIEW v_rate_limit_utilization IS 'Current rate limit status across all keys';
COMMENT ON VIEW v_webhook_health IS 'Real-time webhook health status for alerting';
COMMENT ON VIEW v_alert_conditions IS 'Active alert conditions requiring attention';

-- ======================================================================================
-- 9. RLS Policies (if not already set on base tables)
-- ======================================================================================

-- Note: RLS policies should be inherited from base tables (webhooks, automation_rules, etc.)
-- Materialized views will respect the RLS policies of their source tables when queried

-- ======================================================================================
-- 10. Grant Permissions
-- ======================================================================================

-- Grant SELECT to authenticated users (adjust as needed)
GRANT SELECT ON mv_webhook_performance TO authenticated;
GRANT SELECT ON mv_rule_performance TO authenticated;
GRANT SELECT ON v_api_usage_metrics TO authenticated;
GRANT SELECT ON v_rate_limit_utilization TO authenticated;
GRANT SELECT ON v_webhook_health TO authenticated;
GRANT SELECT ON v_alert_conditions TO authenticated;

-- Grant EXECUTE on refresh function to service role
GRANT EXECUTE ON FUNCTION refresh_monitoring_views() TO service_role;
