-- Content Library & Seasonal Orchestrator
-- Google Drive → Dashboard → n8n workflow for content management

-- =============================================
-- 1. Assets (Drive-synced content)
-- =============================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Drive sync
  drive_file_id TEXT UNIQUE,
  drive_etag TEXT,
  path TEXT,
  
  -- Metadata
  title TEXT NOT NULL,
  topic TEXT[],
  angle TEXT[],
  platform_targets TEXT[], -- ['instagram', 'tiktok', 'youtube', 'facebook']
  aspect_ratio TEXT, -- '9:16', '1:1', '16:9'
  duration_sec INTEGER,
  
  -- Organization
  season_id UUID REFERENCES content_collections(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES content_collections(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'unpublished', -- 'unpublished', 'published', 'archived'
  
  -- URLs
  thumbnail_url TEXT,
  transcript_url TEXT,
  
  -- Additional metadata
  labels JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_drive_file ON assets(drive_file_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_season ON assets(season_id);
CREATE INDEX idx_assets_campaign ON assets(campaign_id);
CREATE INDEX idx_assets_platform_targets ON assets USING GIN(platform_targets);

-- =============================================
-- 2. Content Collections (Seasons & Campaigns)
-- =============================================
CREATE TABLE IF NOT EXISTS content_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'season', 'campaign'
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  
  starts_on DATE,
  ends_on DATE,
  
  labels JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_content_collections_slug ON content_collections(workspace_id, slug);
CREATE INDEX idx_content_collections_type ON content_collections(type);
CREATE INDEX idx_content_collections_dates ON content_collections(starts_on, ends_on);

-- =============================================
-- 3. Asset Versions (Crops, edits, AI variants)
-- =============================================
CREATE TABLE IF NOT EXISTS asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  variant_type TEXT NOT NULL, -- 'crop', 'caption', 'cta', 'model_gen'
  
  -- Generation details
  generator TEXT, -- 'elevenlabs-vid', 'kapwing', 'model_x'
  prompt TEXT,
  seed TEXT,
  
  -- Output
  output_url TEXT,
  platform TEXT, -- Target platform for this variant
  status TEXT DEFAULT 'ready', -- 'ready', 'failed', 'publishing'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_versions_asset ON asset_versions(asset_id);
CREATE INDEX idx_asset_versions_platform ON asset_versions(platform);
CREATE INDEX idx_asset_versions_status ON asset_versions(status);

-- =============================================
-- 4. Content Posts (Per-platform publish intent)
-- =============================================
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_version_id UUID REFERENCES asset_versions(id) ON DELETE SET NULL,
  
  -- Platform details
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'facebook', 'twitter'
  account_id TEXT, -- Reference to social_accounts if applicable
  
  -- Post content
  caption TEXT,
  first_comment TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'publishing', 'published', 'failed'
  
  -- External reference
  external_post_id TEXT,
  
  labels JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_posts_workspace ON content_posts(workspace_id);
CREATE INDEX idx_content_posts_asset_version ON content_posts(asset_version_id);
CREATE INDEX idx_content_posts_platform ON content_posts(platform);
CREATE INDEX idx_content_posts_status ON content_posts(status);
CREATE INDEX idx_content_posts_scheduled ON content_posts(scheduled_at);

-- =============================================
-- 5. Trend Topics (Meta/TikTok/Google trends)
-- =============================================
CREATE TABLE IF NOT EXISTS trend_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  source TEXT NOT NULL, -- 'meta', 'tiktok', 'google', 'reviews'
  name TEXT NOT NULL,
  score NUMERIC(5,2) DEFAULT 0, -- 0-100
  window TEXT DEFAULT 'today', -- 'today', '7d', '28d'
  
  -- For semantic matching
  embedding VECTOR(384),
  
  meta JSONB DEFAULT '{}',
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trend_topics_workspace ON trend_topics(workspace_id);
CREATE INDEX idx_trend_topics_source ON trend_topics(source);
CREATE INDEX idx_trend_topics_score ON trend_topics(score DESC);
CREATE INDEX idx_trend_topics_detected ON trend_topics(detected_at DESC);

-- =============================================
-- 6. Content Suggestions (AI-generated ideas)
-- =============================================
CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES trend_topics(id) ON DELETE SET NULL,
  
  source TEXT NOT NULL, -- 'trend', 'audience', 'reviews', 'performance'
  angle TEXT,
  outline TEXT,
  priority INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'new', -- 'new', 'accepted', 'rejected', 'queued', 'shipped'
  
  labels JSONB DEFAULT '{}', -- {persona, ICP, platform}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_suggestions_workspace ON content_suggestions(workspace_id);
CREATE INDEX idx_content_suggestions_topic ON content_suggestions(topic_id);
CREATE INDEX idx_content_suggestions_status ON content_suggestions(status);
CREATE INDEX idx_content_suggestions_priority ON content_suggestions(priority DESC);

-- =============================================
-- 7. Dashboard Layouts (Per-user customization)
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT DEFAULT 'Default Layout',
  page_key TEXT NOT NULL, -- 'overview', 'revenue', 'acquisition', etc.
  
  -- react-grid-layout configuration
  layout_config JSONB NOT NULL, -- [{i: 'kpi.mrr', x: 0, y: 0, w: 6, h: 2, ...}]
  
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_layouts_workspace ON dashboard_layouts(workspace_id);
CREATE INDEX idx_dashboard_layouts_user ON dashboard_layouts(user_id);
CREATE INDEX idx_dashboard_layouts_page ON dashboard_layouts(page_key);
CREATE UNIQUE INDEX idx_dashboard_layouts_default ON dashboard_layouts(workspace_id, user_id, page_key) WHERE is_default = TRUE;

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_workspace_isolation ON assets;
DROP POLICY IF EXISTS content_collections_workspace_isolation ON content_collections;
DROP POLICY IF EXISTS asset_versions_workspace_isolation ON asset_versions;
DROP POLICY IF EXISTS content_posts_workspace_isolation ON content_posts;
DROP POLICY IF EXISTS trend_topics_workspace_isolation ON trend_topics;
DROP POLICY IF EXISTS content_suggestions_workspace_isolation ON content_suggestions;
DROP POLICY IF EXISTS dashboard_layouts_workspace_isolation ON dashboard_layouts;

CREATE POLICY assets_workspace_isolation ON assets
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY content_collections_workspace_isolation ON content_collections
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY asset_versions_workspace_isolation ON asset_versions
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY content_posts_workspace_isolation ON content_posts
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY trend_topics_workspace_isolation ON trend_topics
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY content_suggestions_workspace_isolation ON content_suggestions
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

CREATE POLICY dashboard_layouts_workspace_isolation ON dashboard_layouts
  USING (workspace_id::text = current_setting('app.current_workspace_id', TRUE));

COMMENT ON TABLE assets IS 'Drive-synced content with metadata, seasons, and campaigns';
COMMENT ON TABLE content_collections IS 'Seasons and campaigns for organizing content';
COMMENT ON TABLE asset_versions IS 'Crops, edits, and AI-generated variants';
COMMENT ON TABLE content_posts IS 'Per-platform publishing schedule and status';
COMMENT ON TABLE trend_topics IS 'Trending topics from Meta, TikTok, Google for content ideas';
COMMENT ON TABLE content_suggestions IS 'AI-generated content suggestions based on trends';
COMMENT ON TABLE dashboard_layouts IS 'Per-user dashboard customization with react-grid-layout';
