-- Check-Back Analytics, Sentiment, and Angle Matrix
-- Track post performance over time with sentiment analysis and angle intelligence

-- =============================================
-- 1. Post Metrics (Time-series check-backs)
-- =============================================
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  
  -- Check-back timing
  age_bucket TEXT NOT NULL, -- '15m', '1h', '6h', '24h', '72h', '7d', '14d', '28d'
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Core metrics
  metric_name TEXT NOT NULL, -- 'impressions', 'engagement_rate', 'depth_score', etc.
  value NUMERIC NOT NULL,
  
  -- Metadata
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'facebook', 'twitter'
  origin TEXT DEFAULT 'organic', -- 'organic', 'ad'
  
  -- Labels for filtering/grouping
  labels JSONB DEFAULT '{}', -- {campaign, adset, creative_id, format, follower_bracket}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_metrics_post ON post_metrics(post_id);
CREATE INDEX idx_post_metrics_age_bucket ON post_metrics(age_bucket);
CREATE INDEX idx_post_metrics_metric_name ON post_metrics(metric_name);
CREATE INDEX idx_post_metrics_checked ON post_metrics(checked_at DESC);
CREATE INDEX idx_post_metrics_labels ON post_metrics USING GIN(labels);

-- =============================================
-- 2. Comment Samples (Sentiment tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS comment_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID REFERENCES content_posts(id) ON DELETE CASCADE,
  
  -- Comment details
  platform TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  author_handle TEXT,
  published_at TIMESTAMPTZ,
  
  -- Sentiment analysis
  sentiment NUMERIC, -- -1 to +1
  toxicity BOOLEAN DEFAULT FALSE,
  
  -- Content (optional - can redact for privacy)
  text TEXT,
  
  labels JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_comment_samples_unique ON comment_samples(platform, comment_id);
CREATE INDEX idx_comment_samples_post ON comment_samples(post_id);
CREATE INDEX idx_comment_samples_sentiment ON comment_samples(sentiment);

-- =============================================
-- 3. Comment Rollups (Aggregated sentiment)
-- =============================================
CREATE TABLE IF NOT EXISTS comment_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  
  age_bucket TEXT NOT NULL, -- Matches post_metrics buckets
  
  -- Aggregated metrics
  avg_sentiment NUMERIC,
  p95_toxicity BOOLEAN DEFAULT FALSE, -- True if >95th percentile toxic
  volume INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, age_bucket)
);

CREATE INDEX idx_comment_rollups_post ON comment_rollups(post_id);
CREATE INDEX idx_comment_rollups_age ON comment_rollups(age_bucket);

-- =============================================
-- 4. Angle Taxonomy (Content strategy framework)
-- =============================================
CREATE TABLE IF NOT EXISTS angle_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  key TEXT NOT NULL, -- 'roi_breakdown', 'builder_energy', 'tutorial_60s'
  name TEXT NOT NULL,
  
  -- Brand pillar
  pillar TEXT, -- 'education', 'inspiration', 'entertainment', 'conversion'
  
  -- Patterns
  hook_patterns TEXT[], -- Common opening hooks
  cta_patterns TEXT[], -- Common CTAs
  personas TEXT[], -- Target audiences
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_angle_taxonomy_key ON angle_taxonomy(workspace_id, key);
CREATE INDEX idx_angle_taxonomy_pillar ON angle_taxonomy(pillar);

-- =============================================
-- 5. Post Angles (Map posts to angles)
-- =============================================
CREATE TABLE IF NOT EXISTS post_angles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  angle_id UUID NOT NULL REFERENCES angle_taxonomy(id) ON DELETE CASCADE,
  
  confidence NUMERIC DEFAULT 1.0, -- 0.0-1.0
  source TEXT DEFAULT 'manual', -- 'manual', 'ml', 'auto'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_angles_post ON post_angles(post_id);
CREATE INDEX idx_post_angles_angle ON post_angles(angle_id);
CREATE UNIQUE INDEX idx_post_angles_unique ON post_angles(post_id, angle_id);

-- =============================================
-- 6. Angle Performance (Aggregated by angle)
-- =============================================
CREATE TABLE IF NOT EXISTS angle_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  angle_id UUID NOT NULL REFERENCES angle_taxonomy(id) ON DELETE CASCADE,
  
  -- Dimensions
  platform TEXT,
  format TEXT, -- 'reel', 'post', 'story', 'short'
  season_id UUID REFERENCES content_collections(id) ON DELETE SET NULL,
  
  -- Metrics
  metric_name TEXT NOT NULL, -- 'engagement_rate', 'depth_score', 'click_rate'
  window TEXT NOT NULL, -- '1h', '24h', '7d', '28d'
  
  -- Values
  value NUMERIC,
  value_norm NUMERIC, -- Normalized/percentile
  sample_size INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_angle_performance_angle ON angle_performance(angle_id);
CREATE INDEX idx_angle_performance_platform ON angle_performance(platform);
CREATE INDEX idx_angle_performance_window ON angle_performance(window);
CREATE UNIQUE INDEX idx_angle_performance_unique ON angle_performance(
  angle_id, platform, COALESCE(format, ''), COALESCE(season_id::text, ''), metric_name, window
);

-- =============================================
-- 7. Brand Pillars (Strategy framework)
-- =============================================
CREATE TABLE IF NOT EXISTS brand_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  do_list TEXT[], -- Things to do
  dont_list TEXT[], -- Things to avoid
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_pillars_workspace ON brand_pillars(workspace_id);

-- =============================================
-- 8. Experiments (A/B testing framework)
-- =============================================
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  hypothesis TEXT NOT NULL,
  success_metric TEXT NOT NULL, -- 'engagement_rate', 'click_rate', etc.
  
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'cancelled'
  owner TEXT,
  
  results JSONB, -- Store final results
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiments_workspace ON experiments(workspace_id);
CREATE INDEX idx_experiments_status ON experiments(status);

-- =============================================
-- 9. Experiment Arms (Variants to test)
-- =============================================
CREATE TABLE IF NOT EXISTS experiment_arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  
  angle_id UUID REFERENCES angle_taxonomy(id) ON DELETE SET NULL,
  hook TEXT,
  cta TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiment_arms_experiment ON experiment_arms(experiment_id);

-- =============================================
-- 10. Experiment Assignments (Posts in experiments)
-- =============================================
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES experiment_arms(id) ON DELETE CASCADE,
  
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX idx_experiment_assignments_post ON experiment_assignments(post_id);
CREATE UNIQUE INDEX idx_experiment_assignments_unique ON experiment_assignments(post_id, experiment_id);

-- =============================================
-- 11. Check-Back Jobs (Scheduled analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS checkback_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  
  age_bucket TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_checkback_jobs_scheduled ON checkback_jobs(scheduled_at);
CREATE INDEX idx_checkback_jobs_status ON checkback_jobs(status);
CREATE INDEX idx_checkback_jobs_post ON checkback_jobs(post_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE angle_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE angle_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkback_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS post_metrics_workspace_isolation ON post_metrics;
DROP POLICY IF EXISTS comment_samples_workspace_isolation ON comment_samples;
DROP POLICY IF EXISTS comment_rollups_workspace_isolation ON comment_rollups;
DROP POLICY IF EXISTS angle_taxonomy_workspace_isolation ON angle_taxonomy;
DROP POLICY IF EXISTS post_angles_workspace_isolation ON post_angles;
DROP POLICY IF EXISTS angle_performance_workspace_isolation ON angle_performance;
DROP POLICY IF EXISTS brand_pillars_workspace_isolation ON brand_pillars;
DROP POLICY IF EXISTS experiments_workspace_isolation ON experiments;
DROP POLICY IF EXISTS experiment_arms_workspace_isolation ON experiment_arms;
DROP POLICY IF EXISTS experiment_assignments_workspace_isolation ON experiment_assignments;
DROP POLICY IF EXISTS checkback_jobs_workspace_isolation ON checkback_jobs;

-- Create RLS policies
CREATE POLICY post_metrics_workspace_isolation ON post_metrics
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY comment_samples_workspace_isolation ON comment_samples
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY comment_rollups_workspace_isolation ON comment_rollups
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY angle_taxonomy_workspace_isolation ON angle_taxonomy
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY post_angles_workspace_isolation ON post_angles
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY angle_performance_workspace_isolation ON angle_performance
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY brand_pillars_workspace_isolation ON brand_pillars
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY experiments_workspace_isolation ON experiments
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY experiment_arms_workspace_isolation ON experiment_arms
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY experiment_assignments_workspace_isolation ON experiment_assignments
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY checkback_jobs_workspace_isolation ON checkback_jobs
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

COMMENT ON TABLE post_metrics IS 'Time-series check-backs tracking post performance at 15m, 1h, 6h, 24h, 72h, 7d, 14d, 28d intervals';
COMMENT ON TABLE comment_samples IS 'Individual comments with sentiment analysis for tracking audience reactions';
COMMENT ON TABLE comment_rollups IS 'Aggregated comment sentiment by check-back window';
COMMENT ON TABLE angle_taxonomy IS 'Content strategy framework defining angles, hooks, and CTAs';
COMMENT ON TABLE post_angles IS 'Maps posts to content angles for performance tracking';
COMMENT ON TABLE angle_performance IS 'Aggregated performance metrics by angle, platform, and time window';
COMMENT ON TABLE experiments IS 'A/B testing framework for angles, hooks, and CTAs';
COMMENT ON TABLE checkback_jobs IS 'Scheduled jobs for fetching post metrics at specific time intervals';
