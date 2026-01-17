-- =====================================================
-- AI-POWERED FEATURE BUCKETING SYSTEM
-- =====================================================
-- Extends feature_requests with AI clustering, gamification, and momentum tracking
-- Created: 2025-10-09
-- Requires: feature-requests-enhanced.sql (base tables)
-- =====================================================

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. FEATURE BUCKETS (AI-Generated Groups)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id UUID, -- For multi-tenant support (optional)
  
  -- Bucket details
  title TEXT NOT NULL, -- AI-suggested or admin-edited
  summary TEXT, -- AI-generated summary of what this bucket represents
  description TEXT, -- Longer explanation
  
  -- Status tracking (bucket-level)
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'planned', 'in_progress', 'shipped', 'declined')),
  priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- AI clustering
  centroid VECTOR(1536), -- Running mean of all request embeddings in this bucket
  similarity_threshold FLOAT DEFAULT 0.78, -- Threshold for auto-assignment
  
  -- Gamification
  goal_votes INT DEFAULT 100, -- Votes needed to "unlock" (configurable)
  momentum_7d INT DEFAULT 0, -- Cached: votes in last 7 days
  momentum_30d INT DEFAULT 0, -- Cached: votes in last 30 days
  
  -- Implementation tracking
  assigned_to UUID, -- Team member
  target_version TEXT,
  shipped_at TIMESTAMPTZ,
  declined_reason TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_buckets_org 
ON feature_buckets (org_id, status);

CREATE INDEX IF NOT EXISTS idx_feature_buckets_status 
ON feature_buckets (status, created_at DESC);

-- Vector index for similarity search (IVFFlat for speed)
CREATE INDEX IF NOT EXISTS idx_feature_buckets_centroid 
ON feature_buckets USING ivfflat (centroid vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE feature_buckets IS 'AI-generated clusters of similar feature requests';
COMMENT ON COLUMN feature_buckets.centroid IS 'Mean embedding vector of all requests in bucket';
COMMENT ON COLUMN feature_buckets.goal_votes IS 'Votes needed to unlock/ship this bucket';
COMMENT ON COLUMN feature_buckets.momentum_7d IS 'Cached vote count from last 7 days';

-- =====================================================
-- 2. FEATURE REQUEST EMBEDDINGS (Vector Store)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_request_embeddings (
  feature_id UUID PRIMARY KEY REFERENCES feature_requests(id) ON DELETE CASCADE,
  
  -- Vector (OpenAI text-embedding-3-small = 1536 dimensions)
  embedding VECTOR(1536) NOT NULL,
  
  -- Metadata
  model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_feature_embeddings_vector 
ON feature_request_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE feature_request_embeddings IS 'Vector embeddings for AI-powered clustering';

-- =====================================================
-- 3. ADD BUCKET_ID TO FEATURE_REQUESTS
-- =====================================================

-- Add bucket reference to existing feature_requests table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_requests' AND column_name = 'bucket_id'
  ) THEN
    ALTER TABLE feature_requests 
    ADD COLUMN bucket_id UUID REFERENCES feature_buckets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feature_requests_bucket 
ON feature_requests (bucket_id);

COMMENT ON COLUMN feature_requests.bucket_id IS 'AI-assigned bucket for clustering similar requests';

-- =====================================================
-- 4. FEATURE ACTIVITY LOG (Changelog Events)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  org_id UUID, -- Optional multi-tenant support
  bucket_id UUID REFERENCES feature_buckets(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE,
  
  -- Actor
  actor_user_id UUID, -- Who made the change
  
  -- Activity details
  type TEXT NOT NULL CHECK (type IN (
    'status_change', 
    'comment', 
    'shipped_note', 
    'bucket_created', 
    'bucket_merged',
    'request_assigned',
    'vote_milestone'
  )),
  
  -- Payload (flexible JSON)
  payload JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- { "old_status": "planned", "new_status": "shipped" }
  -- { "comment": "Will ship in v2.0" }
  -- { "milestone": "50_votes", "current_votes": 50 }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_activity_bucket 
ON feature_activity (bucket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_activity_feature 
ON feature_activity (feature_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_activity_type 
ON feature_activity (type, created_at DESC);

COMMENT ON TABLE feature_activity IS 'Activity log for changelog and notifications';

-- =====================================================
-- 5. USER GAMIFICATION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_user_stats (
  user_id UUID PRIMARY KEY,
  
  -- Gamification stats
  total_votes INT DEFAULT 0,
  total_requests INT DEFAULT 0,
  vote_streak_days INT DEFAULT 0, -- Consecutive days voted
  last_vote_date DATE,
  last_request_date DATE,
  
  -- Badges (JSONB array of badge IDs)
  badges JSONB DEFAULT '[]'::jsonb,
  -- Example: ["first_vote", "streak_5", "early_supporter"]
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE feature_user_stats IS 'User gamification stats and badges';

-- =====================================================
-- 6. BUCKET ROLLUPS (Materialized View)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS feature_bucket_rollups AS
SELECT
  b.id AS bucket_id,
  b.title,
  b.status,
  b.summary,
  b.goal_votes,
  b.momentum_7d,
  b.momentum_30d,
  b.priority,
  b.tags,
  
  -- Aggregated counts
  COUNT(DISTINCT r.id) AS request_count,
  COUNT(DISTINCT v.user_id) AS votes_count,
  
  -- Progress percentage
  ROUND((COUNT(DISTINCT v.user_id)::FLOAT / NULLIF(b.goal_votes, 0)) * 100, 1) AS progress_percent,
  
  -- Timestamps
  MAX(r.created_at) AS newest_request_at,
  MAX(r.updated_at) AS last_activity_at,
  b.created_at AS bucket_created_at,
  b.updated_at AS bucket_updated_at
  
FROM feature_buckets b
LEFT JOIN feature_requests r ON r.bucket_id = b.id
LEFT JOIN feature_votes v ON v.feature_id = r.id
GROUP BY 
  b.id, b.title, b.status, b.summary, b.goal_votes, 
  b.momentum_7d, b.momentum_30d, b.priority, b.tags,
  b.created_at, b.updated_at;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_bucket_rollups_id 
ON feature_bucket_rollups (bucket_id);

CREATE INDEX IF NOT EXISTS idx_bucket_rollups_votes 
ON feature_bucket_rollups (votes_count DESC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_bucket_rollups_momentum 
ON feature_bucket_rollups (momentum_7d DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_bucket_rollups_status 
ON feature_bucket_rollups (status, votes_count DESC);

COMMENT ON MATERIALIZED VIEW feature_bucket_rollups IS 'Pre-aggregated bucket stats for leaderboard';

-- =====================================================
-- 7. TRIGGERS & FUNCTIONS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to buckets
DROP TRIGGER IF EXISTS trg_feature_buckets_touch ON feature_buckets;
CREATE TRIGGER trg_feature_buckets_touch 
BEFORE UPDATE ON feature_buckets
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Auto-log bucket status changes
CREATE OR REPLACE FUNCTION log_bucket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO feature_activity (
      bucket_id,
      actor_user_id,
      type,
      payload
    ) VALUES (
      NEW.id,
      NULL, -- TODO: Get current user from context
      'status_change',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'bucket_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_bucket_status ON feature_buckets;
CREATE TRIGGER trg_log_bucket_status
AFTER UPDATE ON feature_buckets
FOR EACH ROW EXECUTE FUNCTION log_bucket_status_change();

-- Update user stats on vote
CREATE OR REPLACE FUNCTION update_user_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO feature_user_stats (user_id, total_votes, last_vote_date)
    VALUES (NEW.user_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      total_votes = feature_user_stats.total_votes + 1,
      last_vote_date = CURRENT_DATE,
      vote_streak_days = CASE
        WHEN feature_user_stats.last_vote_date = CURRENT_DATE - INTERVAL '1 day'
        THEN feature_user_stats.vote_streak_days + 1
        WHEN feature_user_stats.last_vote_date = CURRENT_DATE
        THEN feature_user_stats.vote_streak_days
        ELSE 1
      END,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_vote_stats ON feature_votes;
CREATE TRIGGER trg_update_user_vote_stats
AFTER INSERT ON feature_votes
FOR EACH ROW EXECUTE FUNCTION update_user_vote_stats();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate bucket centroid from its requests
CREATE OR REPLACE FUNCTION calculate_bucket_centroid(p_bucket_id UUID)
RETURNS VECTOR(1536) AS $$
DECLARE
  result VECTOR(1536);
BEGIN
  SELECT AVG(e.embedding)::VECTOR(1536) INTO result
  FROM feature_requests r
  JOIN feature_request_embeddings e ON e.feature_id = r.id
  WHERE r.bucket_id = p_bucket_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest bucket for a request
CREATE OR REPLACE FUNCTION find_nearest_bucket(
  p_embedding VECTOR(1536),
  p_org_id UUID DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.78
)
RETURNS TABLE (
  bucket_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    1 - (b.centroid <=> p_embedding) AS sim
  FROM feature_buckets b
  WHERE 
    (p_org_id IS NULL OR b.org_id = p_org_id)
    AND b.centroid IS NOT NULL
    AND (1 - (b.centroid <=> p_embedding)) >= p_similarity_threshold
  ORDER BY b.centroid <=> p_embedding
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh momentum stats (call from cron)
CREATE OR REPLACE FUNCTION refresh_bucket_momentum()
RETURNS void AS $$
BEGIN
  -- Update 7-day momentum
  UPDATE feature_buckets b
  SET momentum_7d = (
    SELECT COUNT(DISTINCT v.user_id)
    FROM feature_requests r
    JOIN feature_votes v ON v.feature_id = r.id
    WHERE r.bucket_id = b.id
      AND v.created_at > NOW() - INTERVAL '7 days'
  );
  
  -- Update 30-day momentum
  UPDATE feature_buckets b
  SET momentum_30d = (
    SELECT COUNT(DISTINCT v.user_id)
    FROM feature_requests r
    JOIN feature_votes v ON v.feature_id = r.id
    WHERE r.bucket_id = b.id
      AND v.created_at > NOW() - INTERVAL '30 days'
  );
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY feature_bucket_rollups;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE feature_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_user_stats ENABLE ROW LEVEL SECURITY;

-- Buckets: Anyone can read, authenticated can create/update
CREATE POLICY "Anyone can view buckets"
  ON feature_buckets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create buckets"
  ON feature_buckets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update buckets"
  ON feature_buckets FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Embeddings: Same access as parent request
CREATE POLICY "Anyone can view embeddings"
  ON feature_request_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feature_requests r 
      WHERE r.id = feature_id
    )
  );

CREATE POLICY "System can manage embeddings"
  ON feature_request_embeddings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Activity: Anyone can read, system can write
CREATE POLICY "Anyone can view activity"
  ON feature_activity FOR SELECT
  USING (true);

CREATE POLICY "System can log activity"
  ON feature_activity FOR INSERT
  WITH CHECK (true);

-- User stats: Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON feature_user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update user stats"
  ON feature_user_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW feature_bucket_rollups;

COMMENT ON SCHEMA public IS 'AI-powered feature bucketing system installed';
