-- Feature Flags & A/B Testing System
-- Comprehensive experimentation platform with sticky bucketing and analytics

BEGIN;

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

-- Feature flag definitions
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL, -- Unique identifier (e.g., 'new_dashboard_ui')
  name VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Flag state
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Targeting
  target_user_ids TEXT[], -- Specific user IDs
  target_segments TEXT[], -- User segments (e.g., ['pro_users', 'early_adopters'])
  target_platforms TEXT[], -- web, ios, android
  
  -- Scheduling
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  
  -- Metadata
  owner_email VARCHAR(255), -- Who owns this flag
  tags TEXT[],
  environment VARCHAR(50) DEFAULT 'production', -- production, staging, development
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_rollout_percentage CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  CONSTRAINT valid_environment CHECK (environment IN ('production', 'staging', 'development'))
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment);

-- Feature flag evaluations log
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_key VARCHAR(255) NOT NULL,
  user_id UUID,
  anonymous_id VARCHAR(255),
  
  -- Evaluation result
  is_enabled BOOLEAN NOT NULL,
  reason VARCHAR(100), -- rollout_percentage, user_targeting, segment, override, disabled
  
  -- Context
  platform VARCHAR(50),
  app_version VARCHAR(50),
  user_segment VARCHAR(100),
  
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flag_evaluations_flag_key ON feature_flag_evaluations(flag_key);
CREATE INDEX idx_feature_flag_evaluations_user_id ON feature_flag_evaluations(user_id);
CREATE INDEX idx_feature_flag_evaluations_evaluated_at ON feature_flag_evaluations(evaluated_at DESC);

-- ============================================================================
-- A/B TESTING & EXPERIMENTS
-- ============================================================================

-- Experiment definitions
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  hypothesis TEXT,
  
  -- Experiment state
  status VARCHAR(50) DEFAULT 'draft', -- draft, running, paused, completed, archived
  
  -- Variants
  control_variant JSONB NOT NULL, -- { "key": "control", "name": "Control", "weight": 50 }
  treatment_variants JSONB NOT NULL, -- Array of variants with weights
  
  -- Traffic allocation
  traffic_allocation INTEGER DEFAULT 100, -- % of users to include in experiment
  
  -- Targeting (same as feature flags)
  target_user_ids TEXT[],
  target_segments TEXT[],
  target_platforms TEXT[],
  
  -- Metrics
  primary_metric VARCHAR(255), -- event name to track
  secondary_metrics TEXT[], -- additional metrics
  
  -- Statistical settings
  minimum_sample_size INTEGER DEFAULT 1000,
  confidence_level NUMERIC(3, 2) DEFAULT 0.95, -- 95%
  minimum_detectable_effect NUMERIC(5, 4) DEFAULT 0.05, -- 5%
  
  -- Scheduling
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Results
  winning_variant VARCHAR(100),
  statistical_significance BOOLEAN,
  results JSONB, -- Detailed results for each variant
  
  -- Metadata
  owner_email VARCHAR(255),
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  CONSTRAINT valid_traffic_allocation CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100)
);

CREATE INDEX idx_experiments_key ON experiments(key);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_started_at ON experiments(started_at DESC);

-- Experiment assignments (sticky bucketing)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_key VARCHAR(255) NOT NULL,
  user_id UUID,
  anonymous_id VARCHAR(255),
  
  -- Assignment
  variant_key VARCHAR(100) NOT NULL,
  variant_name VARCHAR(255),
  
  -- Context at assignment time
  platform VARCHAR(50),
  app_version VARCHAR(50),
  user_segment VARCHAR(100),
  
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(experiment_key, user_id),
  UNIQUE(experiment_key, anonymous_id)
);

CREATE INDEX idx_experiment_assignments_experiment_key ON experiment_assignments(experiment_key);
CREATE INDEX idx_experiment_assignments_user_id ON experiment_assignments(user_id);
CREATE INDEX idx_experiment_assignments_variant_key ON experiment_assignments(variant_key);

-- Experiment metric events
CREATE TABLE IF NOT EXISTS experiment_metric_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_key VARCHAR(255) NOT NULL,
  variant_key VARCHAR(100) NOT NULL,
  user_id UUID,
  anonymous_id VARCHAR(255),
  
  -- Metric
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC(12, 4), -- For numeric metrics
  
  -- Context
  platform VARCHAR(50),
  
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiment_metric_events_experiment_key ON experiment_metric_events(experiment_key);
CREATE INDEX idx_experiment_metric_events_variant_key ON experiment_metric_events(variant_key);
CREATE INDEX idx_experiment_metric_events_metric_name ON experiment_metric_events(metric_name);
CREATE INDEX idx_experiment_metric_events_occurred_at ON experiment_metric_events(occurred_at DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Feature flag usage summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_feature_flag_usage AS
SELECT
  flag_key,
  DATE(evaluated_at) as date,
  COUNT(*) as total_evaluations,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT anonymous_id) as unique_anonymous,
  SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled_count,
  ROUND(SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as enabled_percentage
FROM feature_flag_evaluations
GROUP BY flag_key, DATE(evaluated_at)
ORDER BY date DESC, flag_key;

CREATE UNIQUE INDEX ON mv_feature_flag_usage(flag_key, date);

-- Experiment results summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_experiment_results AS
SELECT
  e.key as experiment_key,
  e.name as experiment_name,
  e.status,
  ea.variant_key,
  COUNT(DISTINCT ea.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN eme.metric_name = e.primary_metric THEN ea.user_id END) as converted_users,
  ROUND(
    COUNT(DISTINCT CASE WHEN eme.metric_name = e.primary_metric THEN ea.user_id END)::numeric / 
    NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100,
    2
  ) as conversion_rate,
  AVG(eme.metric_value) as avg_metric_value,
  SUM(eme.metric_value) as total_metric_value
FROM experiments e
LEFT JOIN experiment_assignments ea ON e.key = ea.experiment_key
LEFT JOIN experiment_metric_events eme ON e.key = eme.experiment_key AND ea.variant_key = eme.variant_key
WHERE e.status IN ('running', 'completed')
GROUP BY e.key, e.name, e.status, ea.variant_key
ORDER BY e.started_at DESC, ea.variant_key;

CREATE INDEX ON mv_experiment_results(experiment_key, variant_key);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Evaluate feature flag for a user
CREATE OR REPLACE FUNCTION evaluate_feature_flag(
  p_flag_key VARCHAR(255),
  p_user_id UUID DEFAULT NULL,
  p_anonymous_id VARCHAR(255) DEFAULT NULL,
  p_platform VARCHAR(50) DEFAULT NULL,
  p_user_segment VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  is_enabled BOOLEAN,
  reason VARCHAR(100)
) AS $$
DECLARE
  v_flag RECORD;
  v_user_hash INTEGER;
  v_is_enabled BOOLEAN;
  v_reason VARCHAR(100);
BEGIN
  -- Get flag
  SELECT * INTO v_flag FROM feature_flags WHERE key = p_flag_key LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'flag_not_found';
    RETURN;
  END IF;
  
  -- Check if flag is globally disabled
  IF NOT v_flag.is_enabled THEN
    RETURN QUERY SELECT FALSE, 'disabled';
    RETURN;
  END IF;
  
  -- Check user targeting
  IF v_flag.target_user_ids IS NOT NULL AND p_user_id IS NOT NULL THEN
    IF p_user_id::TEXT = ANY(v_flag.target_user_ids) THEN
      RETURN QUERY SELECT TRUE, 'user_targeting';
      RETURN;
    END IF;
  END IF;
  
  -- Check segment targeting
  IF v_flag.target_segments IS NOT NULL AND p_user_segment IS NOT NULL THEN
    IF p_user_segment = ANY(v_flag.target_segments) THEN
      RETURN QUERY SELECT TRUE, 'segment_targeting';
      RETURN;
    END IF;
  END IF;
  
  -- Check platform targeting
  IF v_flag.target_platforms IS NOT NULL AND p_platform IS NOT NULL THEN
    IF p_platform NOT IN (SELECT UNNEST(v_flag.target_platforms)) THEN
      RETURN QUERY SELECT FALSE, 'platform_excluded';
      RETURN;
    END IF;
  END IF;
  
  -- Rollout percentage (deterministic hash)
  IF v_flag.rollout_percentage < 100 THEN
    -- Use user_id or anonymous_id for consistent hashing
    v_user_hash := ABS(HASHTEXT(COALESCE(p_user_id::TEXT, p_anonymous_id, 'unknown')));
    
    IF (v_user_hash % 100) < v_flag.rollout_percentage THEN
      RETURN QUERY SELECT TRUE, 'rollout_percentage';
      RETURN;
    ELSE
      RETURN QUERY SELECT FALSE, 'rollout_percentage';
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'enabled';
END;
$$ LANGUAGE plpgsql;

-- Function: Assign user to experiment variant (sticky bucketing)
CREATE OR REPLACE FUNCTION assign_experiment_variant(
  p_experiment_key VARCHAR(255),
  p_user_id UUID DEFAULT NULL,
  p_anonymous_id VARCHAR(255) DEFAULT NULL,
  p_platform VARCHAR(50) DEFAULT NULL,
  p_user_segment VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
  variant_key VARCHAR(100),
  variant_name VARCHAR(255),
  is_new_assignment BOOLEAN
) AS $$
DECLARE
  v_experiment RECORD;
  v_existing_assignment RECORD;
  v_user_hash INTEGER;
  v_bucket INTEGER;
  v_cumulative_weight INTEGER := 0;
  v_variant JSONB;
  v_variant_key VARCHAR(100);
  v_variant_name VARCHAR(255);
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- Check for existing assignment
  SELECT * INTO v_existing_assignment
  FROM experiment_assignments
  WHERE experiment_key = p_experiment_key
    AND (
      (user_id IS NOT NULL AND user_id = p_user_id) OR
      (anonymous_id IS NOT NULL AND anonymous_id = p_anonymous_id)
    )
  LIMIT 1;
  
  IF FOUND THEN
    -- Return existing assignment
    RETURN QUERY SELECT 
      v_existing_assignment.variant_key,
      v_existing_assignment.variant_name,
      FALSE;
    RETURN;
  END IF;
  
  -- Get experiment
  SELECT * INTO v_experiment FROM experiments WHERE key = p_experiment_key LIMIT 1;
  
  IF NOT FOUND OR v_experiment.status != 'running' THEN
    RETURN;
  END IF;
  
  -- Calculate user hash for consistent bucketing
  v_user_hash := ABS(HASHTEXT(COALESCE(p_user_id::TEXT, p_anonymous_id, 'unknown')));
  v_bucket := v_user_hash % 100;
  
  -- Select variant based on weights
  -- Control variant
  v_cumulative_weight := (v_experiment.control_variant->>'weight')::INTEGER;
  IF v_bucket < v_cumulative_weight THEN
    v_variant_key := v_experiment.control_variant->>'key';
    v_variant_name := v_experiment.control_variant->>'name';
  ELSE
    -- Treatment variants
    FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.treatment_variants)
    LOOP
      v_cumulative_weight := v_cumulative_weight + (v_variant->>'weight')::INTEGER;
      IF v_bucket < v_cumulative_weight THEN
        v_variant_key := v_variant->>'key';
        v_variant_name := v_variant->>'name';
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Create assignment
  INSERT INTO experiment_assignments (
    experiment_key,
    user_id,
    anonymous_id,
    variant_key,
    variant_name,
    platform,
    user_segment
  ) VALUES (
    p_experiment_key,
    p_user_id,
    p_anonymous_id,
    v_variant_key,
    v_variant_name,
    p_platform,
    p_user_segment
  );
  
  v_is_new := TRUE;
  
  RETURN QUERY SELECT v_variant_key, v_variant_name, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- Function: Refresh experiment analytics views
CREATE OR REPLACE FUNCTION refresh_experiment_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feature_flag_usage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_experiment_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_flags IS 'Feature flag definitions with targeting and rollout';
COMMENT ON TABLE feature_flag_evaluations IS 'Log of all feature flag evaluations';
COMMENT ON TABLE experiments IS 'A/B test experiment definitions';
COMMENT ON TABLE experiment_assignments IS 'Sticky user-to-variant assignments';
COMMENT ON TABLE experiment_metric_events IS 'Metric events for experiment analysis';

COMMIT;
