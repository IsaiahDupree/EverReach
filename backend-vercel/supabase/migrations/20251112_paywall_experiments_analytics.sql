-- =====================================================
-- Paywall Experiments & Analytics System
-- Mission Control for Monetization
-- Date: 2025-11-12
-- =====================================================

-- 1. PAYWALL EXPERIMENTS
-- Track A/B tests and config experiments
CREATE TABLE IF NOT EXISTS paywall_experiments (
  id TEXT PRIMARY KEY, -- e.g. PW-2025-11-12-01
  name TEXT NOT NULL,
  description TEXT,
  
  -- Config snapshot
  strategy_id TEXT NOT NULL REFERENCES paywall_strategies(id),
  presentation_id TEXT NOT NULL REFERENCES paywall_presentations(id),
  trial_type_id TEXT NOT NULL REFERENCES trial_types(id),
  
  -- Targeting
  platform TEXT CHECK (platform IN ('ios', 'android', 'web', 'all')),
  target_countries TEXT[], -- ['US', 'CA', 'GB']
  target_cohorts TEXT[], -- ['new_users', 'returning', 'churned']
  acquisition_channels TEXT[], -- ['organic', 'paid', 'referral']
  
  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'completed', 'archived')) DEFAULT 'draft',
  environment TEXT NOT NULL CHECK (environment IN ('production', 'staging')) DEFAULT 'staging',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notes
  notes TEXT
);

-- 2. PAYWALL CONFIG CHANGE HISTORY
-- Audit log of all paywall config changes
CREATE TABLE IF NOT EXISTS paywall_config_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  change_type TEXT NOT NULL, -- 'strategy', 'presentation', 'trial', 'review_timing', 'full_config'
  platform TEXT NOT NULL,
  
  -- Before/After snapshots
  old_config JSONB NOT NULL,
  new_config JSONB NOT NULL,
  
  -- Link to experiment
  experiment_id TEXT REFERENCES paywall_experiments(id),
  
  -- Who & when
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'staging')) DEFAULT 'production',
  
  -- Notes
  notes TEXT,
  
  -- Computed summary fields for quick display
  summary_old TEXT, -- e.g. "HARD_AFTER_7D + STATIC + 7DAY"
  summary_new TEXT  -- e.g. "SOFT_AFTER_7D + VIDEO + 7DAY"
);

-- 3. PAYWALL ANALYTICS EVENTS
-- Core events for tracking paywall performance
CREATE TABLE IF NOT EXISTS paywall_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event info
  event_type TEXT NOT NULL CHECK (event_type IN (
    'paywall_impression',
    'paywall_cta_click',
    'paywall_dismissed',
    'paywall_skipped',
    'checkout_started',
    'checkout_completed',
    'checkout_failed',
    'subscription_activated',
    'trial_started',
    'trial_ended',
    'trial_converted',
    'review_prompt_shown',
    'review_prompt_interacted',
    'review_prompt_snoozed',
    'review_prompt_dismissed'
  )),
  
  -- User & session
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  anonymous_id TEXT, -- For pre-signup tracking
  
  -- Context
  platform TEXT NOT NULL, -- ios, android, web
  country_code TEXT, -- US, CA, GB
  acquisition_channel TEXT, -- organic, paid, referral
  user_cohort TEXT, -- new_user, returning, churned
  
  -- Config snapshot (what paywall config was active)
  config_snapshot JSONB NOT NULL, -- Full config at time of event
  experiment_id TEXT REFERENCES paywall_experiments(id),
  
  -- Event metadata
  metadata JSONB, -- Additional event-specific data
  
  -- Timing
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for fast querying
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYWALL CONVERSION FUNNEL (Materialized View)
-- Pre-computed funnel metrics per experiment/date
CREATE MATERIALIZED VIEW IF NOT EXISTS paywall_conversion_funnel AS
SELECT
  experiment_id,
  platform,
  DATE(occurred_at) as event_date,
  
  -- Funnel metrics
  COUNT(*) FILTER (WHERE event_type = 'paywall_impression') as impressions,
  COUNT(*) FILTER (WHERE event_type = 'paywall_cta_click') as cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'checkout_started') as checkouts_started,
  COUNT(*) FILTER (WHERE event_type = 'subscription_activated') as subscriptions,
  COUNT(*) FILTER (WHERE event_type = 'paywall_dismissed') as dismissals,
  COUNT(*) FILTER (WHERE event_type = 'paywall_skipped') as skips,
  
  -- Conversion rates
  CASE WHEN COUNT(*) FILTER (WHERE event_type = 'paywall_impression') > 0
    THEN (COUNT(*) FILTER (WHERE event_type = 'subscription_activated')::float / 
          COUNT(*) FILTER (WHERE event_type = 'paywall_impression')) * 100
    ELSE 0 
  END as conversion_rate,
  
  CASE WHEN COUNT(*) FILTER (WHERE event_type = 'checkout_started') > 0
    THEN ((COUNT(*) FILTER (WHERE event_type = 'checkout_started') - 
           COUNT(*) FILTER (WHERE event_type = 'subscription_activated'))::float /
          COUNT(*) FILTER (WHERE event_type = 'checkout_started')) * 100
    ELSE 0
  END as checkout_drop_off_rate
  
FROM paywall_analytics_events
WHERE experiment_id IS NOT NULL
GROUP BY experiment_id, platform, DATE(occurred_at);

-- 5. REVIEW PROMPT PERFORMANCE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS review_prompt_performance AS
SELECT
  platform,
  DATE(occurred_at) as event_date,
  (config_snapshot->>'review_prompt_strategy')::TEXT as strategy,
  
  COUNT(*) FILTER (WHERE event_type = 'review_prompt_shown') as impressions,
  COUNT(*) FILTER (WHERE event_type = 'review_prompt_interacted') as interactions,
  COUNT(*) FILTER (WHERE event_type = 'review_prompt_snoozed') as snoozed,
  COUNT(*) FILTER (WHERE event_type = 'review_prompt_dismissed') as dismissed,
  
  -- Engagement rate
  CASE WHEN COUNT(*) FILTER (WHERE event_type = 'review_prompt_shown') > 0
    THEN (COUNT(*) FILTER (WHERE event_type = 'review_prompt_interacted')::float /
          COUNT(*) FILTER (WHERE event_type = 'review_prompt_shown')) * 100
    ELSE 0
  END as engagement_rate
  
FROM paywall_analytics_events
WHERE event_type LIKE 'review_prompt%'
GROUP BY platform, DATE(occurred_at), (config_snapshot->>'review_prompt_strategy')::TEXT;

-- 6. EXPERIMENT RESULTS (Aggregated View)
CREATE VIEW paywall_experiment_results AS
SELECT
  e.id as experiment_id,
  e.name,
  e.strategy_id,
  e.presentation_id,
  e.trial_type_id,
  e.platform,
  e.status,
  e.start_date,
  e.end_date,
  
  -- Metrics from funnel
  COALESCE(SUM(f.impressions), 0) as total_impressions,
  COALESCE(SUM(f.subscriptions), 0) as total_subscriptions,
  COALESCE(AVG(f.conversion_rate), 0) as avg_conversion_rate,
  COALESCE(AVG(f.checkout_drop_off_rate), 0) as avg_drop_off_rate,
  
  -- Date range
  MIN(f.event_date) as first_event_date,
  MAX(f.event_date) as last_event_date
  
FROM paywall_experiments e
LEFT JOIN paywall_conversion_funnel f ON f.experiment_id = e.id
GROUP BY e.id, e.name, e.strategy_id, e.presentation_id, e.trial_type_id, 
         e.platform, e.status, e.start_date, e.end_date;

-- 7. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_experiments_status ON paywall_experiments(status, environment);
CREATE INDEX IF NOT EXISTS idx_experiments_dates ON paywall_experiments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_config_changes_platform ON paywall_config_changes(platform, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_config_changes_experiment ON paywall_config_changes(experiment_id);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON paywall_analytics_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_experiment ON paywall_analytics_events(experiment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON paywall_analytics_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_platform ON paywall_analytics_events(platform, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON paywall_analytics_events(DATE(occurred_at));

-- 8. HELPER FUNCTIONS

-- Function to create a config change audit entry
CREATE OR REPLACE FUNCTION log_paywall_config_change(
  p_platform TEXT,
  p_old_config JSONB,
  p_new_config JSONB,
  p_changed_by UUID,
  p_experiment_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_change_id UUID;
  v_change_type TEXT;
  v_summary_old TEXT;
  v_summary_new TEXT;
BEGIN
  -- Determine change type
  IF (p_old_config->>'strategy_id') != (p_new_config->>'strategy_id') THEN
    v_change_type := 'strategy';
  ELSIF (p_old_config->>'presentation_id') != (p_new_config->>'presentation_id') THEN
    v_change_type := 'presentation';
  ELSIF (p_old_config->>'trial_type_id') != (p_new_config->>'trial_type_id') THEN
    v_change_type := 'trial';
  ELSE
    v_change_type := 'full_config';
  END IF;
  
  -- Build summaries
  v_summary_old := CONCAT(
    p_old_config->>'strategy_id', ' + ',
    p_old_config->>'presentation_id', ' + ',
    p_old_config->>'trial_type_id'
  );
  
  v_summary_new := CONCAT(
    p_new_config->>'strategy_id', ' + ',
    p_new_config->>'presentation_id', ' + ',
    p_new_config->>'trial_type_id'
  );
  
  -- Insert change record
  INSERT INTO paywall_config_changes (
    change_type,
    platform,
    old_config,
    new_config,
    experiment_id,
    changed_by,
    notes,
    summary_old,
    summary_new
  ) VALUES (
    v_change_type,
    p_platform,
    p_old_config,
    p_new_config,
    p_experiment_id,
    p_changed_by,
    p_notes,
    v_summary_old,
    v_summary_new
  ) RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track analytics event
CREATE OR REPLACE FUNCTION track_paywall_event(
  p_event_type TEXT,
  p_user_id UUID,
  p_platform TEXT,
  p_config_snapshot JSONB,
  p_experiment_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO paywall_analytics_events (
    event_type,
    user_id,
    platform,
    config_snapshot,
    experiment_id,
    metadata,
    session_id,
    country_code
  ) VALUES (
    p_event_type,
    p_user_id,
    p_platform,
    p_config_snapshot,
    p_experiment_id,
    p_metadata,
    p_session_id,
    p_country_code
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- 9. COMMENTS
COMMENT ON TABLE paywall_experiments IS 'A/B tests and paywall configuration experiments';
COMMENT ON TABLE paywall_config_changes IS 'Audit log of all paywall configuration changes';
COMMENT ON TABLE paywall_analytics_events IS 'Core analytics events for paywall performance tracking';
COMMENT ON MATERIALIZED VIEW paywall_conversion_funnel IS 'Pre-computed conversion funnel metrics per experiment';
COMMENT ON MATERIALIZED VIEW review_prompt_performance IS 'Review prompt engagement metrics';

COMMIT;
