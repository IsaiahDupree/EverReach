-- Audience Intelligence & ICP Mapping System
-- Tracks Meta engagement → Identity resolution → Profile enrichment → ICP classification

-- =============================================
-- 1. Social Engagements (Meta: IG/FB/WA)
-- =============================================
CREATE TABLE IF NOT EXISTS social_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  our_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- External identity
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'whatsapp'
  external_user_id TEXT, -- Platform's user ID
  handle TEXT, -- @username or phone number
  
  -- Engagement details
  thread_id TEXT, -- Conversation/post thread
  type TEXT NOT NULL, -- 'comment', 'dm', 'reaction', 'click', 'lead_form'
  content TEXT, -- Message or comment text
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Context
  labels JSONB DEFAULT '{}', -- {post_id, campaign, ad_id, utm_params}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_engagements_workspace ON social_engagements(workspace_id);
CREATE INDEX idx_social_engagements_platform ON social_engagements(platform, external_user_id);
CREATE INDEX idx_social_engagements_occurred ON social_engagements(occurred_at DESC);

-- =============================================
-- 2. Identity Claims (Privacy-safe PII storage)
-- =============================================
CREATE TABLE IF NOT EXISTS identity_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  person_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Claim details
  claim_type TEXT NOT NULL, -- 'phone', 'email', 'handle', 'facebook_id', 'instagram_id'
  claim_value_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  raw_encrypted TEXT, -- Encrypted actual value (KMS/Vault)
  
  -- Provenance
  source TEXT NOT NULL, -- 'whatsapp', 'lead_form', 'dm_handoff', 'checkout', 'profile_form'
  confidence NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_identity_claims_unique ON identity_claims(workspace_id, claim_type, claim_value_hash);
CREATE INDEX idx_identity_claims_person ON identity_claims(person_id);

-- =============================================
-- 3. Social Profiles (Enriched from RapidAPI)
-- =============================================
CREATE TABLE IF NOT EXISTS social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  person_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Platform details
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'
  handle TEXT NOT NULL,
  profile_url TEXT,
  display_name TEXT,
  bio TEXT,
  
  -- Stats
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  eng_rate NUMERIC(5,2) DEFAULT 0, -- Engagement rate %
  
  -- Enrichment metadata
  last_sync_at TIMESTAMPTZ,
  rapidapi_lookup_id TEXT, -- Reference to lookup job
  meta JSONB DEFAULT '{}', -- {verified, location, website, categories, etc.}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_social_profiles_unique ON social_profiles(workspace_id, platform, handle);
CREATE INDEX idx_social_profiles_person ON social_profiles(person_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles(platform);

-- =============================================
-- 4. Social Posts (For content analysis)
-- =============================================
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  social_profile_id UUID NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
  
  -- Post details
  external_post_id TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'post', -- 'post', 'reel', 'story', 'video'
  caption TEXT,
  url TEXT,
  
  -- Metrics
  metrics JSONB DEFAULT '{}', -- {likes, comments, views, saves, shares}
  
  -- AI Analysis
  embedding VECTOR(384), -- For semantic search
  topics TEXT[], -- Extracted topics/keywords
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  labels JSONB DEFAULT '{}', -- {hashtags, mentions, detected_topics}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_posts_profile ON social_posts(social_profile_id);
CREATE INDEX idx_social_posts_posted ON social_posts(posted_at DESC);

-- =============================================
-- 5. Audience Classification (ICP fit)
-- =============================================
CREATE TABLE IF NOT EXISTS audience_classification (
  person_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- ICP mapping
  icp_label TEXT, -- 'Creator–Short-form–Marketing Automation Curious'
  icp_segment TEXT, -- Broader category: 'creator', 'marketer', 'developer', 'founder'
  fit_score INTEGER DEFAULT 0, -- 0-100
  influence_score INTEGER DEFAULT 0, -- 0-100 (based on followers, engagement)
  
  -- Behavioral signals
  primary_topics TEXT[], -- Top 5 topics they post about
  posting_cadence TEXT, -- 'daily', 'weekly', 'sporadic', 'inactive'
  content_types TEXT[], -- ['reels', 'carousel', 'stories']
  risk_flags TEXT[], -- ['low_engagement', 'spam', 'competitor']
  
  -- Enrichment metadata
  last_analyzed_at TIMESTAMPTZ,
  confidence NUMERIC(3,2) DEFAULT 0.5, -- 0.0-1.0
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audience_classification_workspace ON audience_classification(workspace_id);
CREATE INDEX idx_audience_classification_icp ON audience_classification(icp_label);
CREATE INDEX idx_audience_classification_segment ON audience_classification(icp_segment);
CREATE INDEX idx_audience_classification_fit ON audience_classification(fit_score DESC);

-- =============================================
-- 6. Segments (Dynamic audience groups)
-- =============================================
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule definition (JSONB filter DSL)
  rule_json JSONB NOT NULL, -- {icp_segment: 'creator', fit_score: {gte: 70}, topics: {include: ['marketing']}}
  
  -- Stats
  member_count INTEGER DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  
  -- Activation
  meta_audience_id TEXT, -- Exported custom audience ID
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segments_workspace ON segments(workspace_id);
CREATE INDEX idx_segments_active ON segments(active);

-- =============================================
-- 7. Segment Members (Many-to-many)
-- =============================================
CREATE TABLE IF NOT EXISTS segment_members (
  segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (segment_id, person_id)
);

CREATE INDEX idx_segment_members_segment ON segment_members(segment_id);
CREATE INDEX idx_segment_members_person ON segment_members(person_id);

-- =============================================
-- 8. Enrichment Jobs (Track n8n processing)
-- =============================================
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  job_type TEXT NOT NULL, -- 'phone_lookup', 'profile_sync', 'post_analysis', 'icp_classification'
  status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  
  -- Input
  input_data JSONB NOT NULL, -- {phone: '+1234567890'} or {profile_id: 'uuid'}
  
  -- Output
  output_data JSONB, -- Results from RapidAPI/OpenAI
  error_message TEXT,
  
  -- n8n tracking
  n8n_execution_id TEXT,
  idempotency_key TEXT UNIQUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_enrichment_jobs_workspace ON enrichment_jobs(workspace_id);
CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX idx_enrichment_jobs_type ON enrichment_jobs(job_type);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE social_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS social_engagements_workspace_isolation ON social_engagements;
DROP POLICY IF EXISTS identity_claims_workspace_isolation ON identity_claims;
DROP POLICY IF EXISTS social_profiles_workspace_isolation ON social_profiles;
DROP POLICY IF EXISTS social_posts_workspace_isolation ON social_posts;
DROP POLICY IF EXISTS audience_classification_workspace_isolation ON audience_classification;
DROP POLICY IF EXISTS segments_workspace_isolation ON segments;
DROP POLICY IF EXISTS segment_members_workspace_isolation ON segment_members;
DROP POLICY IF EXISTS enrichment_jobs_workspace_isolation ON enrichment_jobs;

-- Create RLS policies
CREATE POLICY social_engagements_workspace_isolation ON social_engagements
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY identity_claims_workspace_isolation ON identity_claims
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY social_profiles_workspace_isolation ON social_profiles
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY social_posts_workspace_isolation ON social_posts
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY audience_classification_workspace_isolation ON audience_classification
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY segments_workspace_isolation ON segments
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY segment_members_workspace_isolation ON segment_members
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY enrichment_jobs_workspace_isolation ON enrichment_jobs
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

-- =============================================
-- Helper Functions
-- =============================================

-- Function to refresh segment members
CREATE OR REPLACE FUNCTION refresh_segment_members(p_segment_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_workspace_id UUID;
  v_rule_json JSONB;
  v_count INTEGER;
BEGIN
  -- Get segment details
  SELECT workspace_id, rule_json INTO v_workspace_id, v_rule_json
  FROM segments WHERE id = p_segment_id;
  
  -- Delete existing members
  DELETE FROM segment_members WHERE segment_id = p_segment_id;
  
  -- Insert new members based on rules (simplified - extend as needed)
  INSERT INTO segment_members (segment_id, person_id, workspace_id)
  SELECT p_segment_id, ac.person_id, v_workspace_id
  FROM audience_classification ac
  WHERE ac.workspace_id = v_workspace_id
    AND (v_rule_json->>'icp_segment' IS NULL OR ac.icp_segment = v_rule_json->>'icp_segment')
    AND (v_rule_json->'fit_score'->>'gte' IS NULL OR ac.fit_score >= (v_rule_json->'fit_score'->>'gte')::INTEGER);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Update segment stats
  UPDATE segments SET member_count = v_count, last_refreshed_at = NOW() WHERE id = p_segment_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE social_engagements IS 'Tracks Meta platform engagements (IG/FB/WA comments, DMs, reactions)';
COMMENT ON TABLE identity_claims IS 'Privacy-safe storage of PII with hashing and encryption';
COMMENT ON TABLE social_profiles IS 'Enriched social media profiles from RapidAPI lookups';
COMMENT ON TABLE social_posts IS 'Public posts for content analysis and ICP classification';
COMMENT ON TABLE audience_classification IS 'ICP fit scores and behavioral analysis';
COMMENT ON TABLE segments IS 'Dynamic audience groups for targeting';
COMMENT ON TABLE enrichment_jobs IS 'Track n8n enrichment job status';
