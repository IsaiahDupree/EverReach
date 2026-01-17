-- Alert History Table
-- Stores all triggered alerts for auditing and dashboard display

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert details
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID, -- References user who acknowledged
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_unresolved ON alert_history(triggered_at DESC) WHERE resolved_at IS NULL;

COMMENT ON TABLE alert_history IS 'Log of all triggered alerts for monitoring churn spikes, service outages, cost anomalies, etc.';
COMMENT ON COLUMN alert_history.severity IS 'Alert severity: critical (immediate action), warning (investigate soon), info (FYI)';
COMMENT ON COLUMN alert_history.metadata IS 'Additional context like metric values, thresholds, affected services';
