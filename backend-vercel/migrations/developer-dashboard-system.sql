-- Developer Dashboard System
-- Comprehensive analytics tracking for app performance, marketing, and business metrics
-- Data sources: PostHog events + Supabase logs + Email providers + Social APIs + Meta Ads

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ADMIN AUTHENTICATION
-- ============================================================================

-- Admin users table (separate from regular auth.users)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin, analyst
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('admin', 'super_admin', 'analyst', 'viewer'))
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_reset_token ON admin_users(reset_token) WHERE reset_token IS NOT NULL;

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ============================================================================
-- APP PERFORMANCE TRACKING
-- ============================================================================

-- API endpoint metrics (aggregated from PostHog + logs)
CREATE TABLE IF NOT EXISTS api_endpoint_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER, -- 0-23, null for daily aggregation
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL, -- GET, POST, PATCH, DELETE
  
  -- Performance metrics
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms NUMERIC(10, 2),
  p50_response_time_ms NUMERIC(10, 2),
  p95_response_time_ms NUMERIC(10, 2),
  p99_response_time_ms NUMERIC(10, 2),
  
  -- Error breakdown
  error_4xx_count INTEGER DEFAULT 0,
  error_5xx_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, hour, endpoint, method)
);

CREATE INDEX idx_api_endpoint_metrics_date ON api_endpoint_metrics(date DESC);
CREATE INDEX idx_api_endpoint_metrics_endpoint ON api_endpoint_metrics(endpoint);

-- Feature adoption tracking
CREATE TABLE IF NOT EXISTS feature_adoption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  
  -- Usage metrics
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0, -- First time using this feature
  active_users INTEGER DEFAULT 0, -- Used in last 7 days
  event_count INTEGER DEFAULT 0,
  
  -- Engagement
  avg_events_per_user NUMERIC(10, 2),
  retention_rate NUMERIC(5, 2), -- % returning after first use
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, feature_name)
);

CREATE INDEX idx_feature_adoption_date ON feature_adoption(date DESC);
CREATE INDEX idx_feature_adoption_feature_name ON feature_adoption(feature_name);

-- ============================================================================
-- INBOUND MARKETING (Content & SEO)
-- ============================================================================

-- Blog posts/content performance
CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id VARCHAR(255) UNIQUE NOT NULL, -- slug or ID
  title VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  author VARCHAR(255),
  category VARCHAR(100),
  tags TEXT[],
  
  -- SEO metrics
  meta_title VARCHAR(255),
  meta_description TEXT,
  target_keywords TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_performance_content_id ON content_performance(content_id);
CREATE INDEX idx_content_performance_published_at ON content_performance(published_at DESC);
CREATE INDEX idx_content_performance_category ON content_performance(category);

-- Daily content metrics
CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  content_id VARCHAR(255) NOT NULL REFERENCES content_performance(content_id) ON DELETE CASCADE,
  
  -- Traffic metrics
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page NUMERIC(10, 2), -- seconds
  bounce_rate NUMERIC(5, 2), -- percentage
  
  -- Engagement metrics
  scroll_depth NUMERIC(5, 2), -- average % scrolled
  cta_clicks INTEGER DEFAULT 0,
  social_shares INTEGER DEFAULT 0,
  
  -- Conversion metrics
  signups_attributed INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2),
  
  -- SEO metrics
  organic_traffic INTEGER DEFAULT 0,
  avg_search_position NUMERIC(5, 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, content_id)
);

CREATE INDEX idx_content_metrics_date ON content_metrics(date DESC);
CREATE INDEX idx_content_metrics_content_id ON content_metrics(content_id);

-- ============================================================================
-- OUTBOUND MARKETING - EMAIL CAMPAIGNS
-- ============================================================================

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id VARCHAR(255) UNIQUE NOT NULL, -- External provider ID
  name VARCHAR(500) NOT NULL,
  subject VARCHAR(500),
  preview_text TEXT,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  
  -- Campaign details
  campaign_type VARCHAR(50), -- newsletter, promotional, transactional, drip
  segment_name VARCHAR(255), -- Target audience
  template_id VARCHAR(255),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status VARCHAR(50), -- draft, scheduled, sending, sent, cancelled
  
  -- A/B testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_variant VARCHAR(10), -- A, B, control
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_campaign_type CHECK (campaign_type IN ('newsletter', 'promotional', 'transactional', 'drip', 'welcome', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'))
);

CREATE INDEX idx_email_campaigns_campaign_id ON email_campaigns(campaign_id);
CREATE INDEX idx_email_campaigns_sent_at ON email_campaigns(sent_at DESC);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);

-- Email campaign metrics
CREATE TABLE IF NOT EXISTS email_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id VARCHAR(255) NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Delivery metrics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  hard_bounce_count INTEGER DEFAULT 0,
  soft_bounce_count INTEGER DEFAULT 0,
  
  -- Engagement metrics
  open_count INTEGER DEFAULT 0,
  unique_open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribe_count INTEGER DEFAULT 0,
  spam_complaint_count INTEGER DEFAULT 0,
  
  -- Calculated rates
  delivery_rate NUMERIC(5, 2),
  open_rate NUMERIC(5, 2),
  click_rate NUMERIC(5, 2),
  click_to_open_rate NUMERIC(5, 2),
  unsubscribe_rate NUMERIC(5, 2),
  
  -- Revenue (if applicable)
  revenue NUMERIC(12, 2),
  revenue_per_email NUMERIC(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, date)
);

CREATE INDEX idx_email_campaign_metrics_campaign_id ON email_campaign_metrics(campaign_id);
CREATE INDEX idx_email_campaign_metrics_date ON email_campaign_metrics(date DESC);

-- ============================================================================
-- OUTBOUND MARKETING - SOCIAL MEDIA (Organic)
-- ============================================================================

-- Social media posts
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id VARCHAR(255) UNIQUE NOT NULL, -- Platform-specific ID
  platform VARCHAR(50) NOT NULL, -- twitter, linkedin, facebook, instagram, tiktok
  post_url TEXT,
  
  -- Content
  content TEXT,
  media_urls TEXT[],
  media_type VARCHAR(50), -- image, video, carousel, link
  
  -- Publishing
  published_at TIMESTAMPTZ,
  status VARCHAR(50), -- draft, scheduled, published, deleted
  
  -- Context
  campaign_name VARCHAR(255),
  tags TEXT[],
  author VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_platform CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'threads')),
  CONSTRAINT valid_post_status CHECK (status IN ('draft', 'scheduled', 'published', 'deleted'))
);

CREATE INDEX idx_social_posts_post_id ON social_posts(post_id);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_published_at ON social_posts(published_at DESC);

-- Social media metrics
CREATE TABLE IF NOT EXISTS social_post_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id VARCHAR(255) NOT NULL REFERENCES social_posts(post_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Reach metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0, -- Unique viewers
  
  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0, -- Instagram/TikTok
  
  -- Click metrics
  link_clicks INTEGER DEFAULT 0,
  profile_clicks INTEGER DEFAULT 0,
  
  -- Video metrics (if applicable)
  video_views INTEGER DEFAULT 0,
  video_completion_rate NUMERIC(5, 2),
  avg_watch_time NUMERIC(10, 2), -- seconds
  
  -- Calculated
  engagement_rate NUMERIC(5, 2), -- (likes + comments + shares) / reach
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, date)
);

CREATE INDEX idx_social_post_metrics_post_id ON social_post_metrics(post_id);
CREATE INDEX idx_social_post_metrics_date ON social_post_metrics(date DESC);

-- ============================================================================
-- OUTBOUND MARKETING - META ADS (Facebook/Instagram)
-- ============================================================================

-- Meta ad campaigns
CREATE TABLE IF NOT EXISTS meta_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id VARCHAR(255) UNIQUE NOT NULL, -- Meta campaign ID
  account_id VARCHAR(255), -- Meta ad account ID
  
  -- Campaign details
  name VARCHAR(500) NOT NULL,
  objective VARCHAR(100), -- AWARENESS, TRAFFIC, ENGAGEMENT, LEADS, SALES, etc.
  status VARCHAR(50), -- ACTIVE, PAUSED, DELETED, ARCHIVED
  
  -- Budget
  budget_type VARCHAR(50), -- daily, lifetime
  daily_budget NUMERIC(12, 2),
  lifetime_budget NUMERIC(12, 2),
  
  -- Scheduling
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_ad_campaigns_campaign_id ON meta_ad_campaigns(campaign_id);
CREATE INDEX idx_meta_ad_campaigns_status ON meta_ad_campaigns(status);

-- Meta ad sets
CREATE TABLE IF NOT EXISTS meta_ad_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_set_id VARCHAR(255) UNIQUE NOT NULL, -- Meta ad set ID
  campaign_id VARCHAR(255) REFERENCES meta_ad_campaigns(campaign_id) ON DELETE CASCADE,
  
  -- Ad set details
  name VARCHAR(500) NOT NULL,
  status VARCHAR(50), -- ACTIVE, PAUSED, DELETED, ARCHIVED
  
  -- Targeting
  targeting_description TEXT,
  min_age INTEGER,
  max_age INTEGER,
  genders TEXT[], -- male, female, all
  locations TEXT[], -- Countries, regions, cities
  interests TEXT[],
  
  -- Budget & bidding
  budget NUMERIC(12, 2),
  bid_strategy VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_ad_sets_ad_set_id ON meta_ad_sets(ad_set_id);
CREATE INDEX idx_meta_ad_sets_campaign_id ON meta_ad_sets(campaign_id);

-- Meta ads
CREATE TABLE IF NOT EXISTS meta_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id VARCHAR(255) UNIQUE NOT NULL, -- Meta ad ID
  ad_set_id VARCHAR(255) REFERENCES meta_ad_sets(ad_set_id) ON DELETE CASCADE,
  
  -- Ad details
  name VARCHAR(500) NOT NULL,
  status VARCHAR(50), -- ACTIVE, PAUSED, DELETED, ARCHIVED
  
  -- Creative
  headline VARCHAR(500),
  description TEXT,
  call_to_action VARCHAR(100),
  image_url TEXT,
  video_url TEXT,
  destination_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meta_ads_ad_id ON meta_ads(ad_id);
CREATE INDEX idx_meta_ads_ad_set_id ON meta_ads(ad_set_id);

-- Meta ad metrics (daily aggregation)
CREATE TABLE IF NOT EXISTS meta_ad_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  ad_id VARCHAR(255) NOT NULL REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
  
  -- Delivery metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC(5, 2), -- impressions / reach
  
  -- Engagement metrics
  clicks INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  post_engagements INTEGER DEFAULT 0,
  post_reactions INTEGER DEFAULT 0,
  post_comments INTEGER DEFAULT 0,
  post_shares INTEGER DEFAULT 0,
  
  -- Video metrics (if video ad)
  video_views INTEGER DEFAULT 0,
  video_view_rate NUMERIC(5, 2),
  video_avg_watch_time NUMERIC(10, 2),
  
  -- Conversion metrics
  conversions INTEGER DEFAULT 0,
  conversion_value NUMERIC(12, 2),
  
  -- Cost metrics
  spend NUMERIC(12, 2),
  cpc NUMERIC(10, 4), -- Cost per click
  cpm NUMERIC(10, 4), -- Cost per 1000 impressions
  ctr NUMERIC(5, 4), -- Click-through rate
  
  -- ROI metrics
  roas NUMERIC(10, 2), -- Return on ad spend
  cost_per_conversion NUMERIC(10, 4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, ad_id)
);

CREATE INDEX idx_meta_ad_metrics_date ON meta_ad_metrics(date DESC);
CREATE INDEX idx_meta_ad_metrics_ad_id ON meta_ad_metrics(ad_id);

-- ============================================================================
-- POSTHOG INTEGRATION
-- ============================================================================

-- PostHog event cache (for faster dashboard queries)
CREATE TABLE IF NOT EXISTS posthog_events_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER, -- 0-23, null for daily aggregation
  event_name VARCHAR(255) NOT NULL,
  
  -- Aggregated metrics
  event_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  -- Custom properties (aggregated)
  properties JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, hour, event_name)
);

CREATE INDEX idx_posthog_events_cache_date ON posthog_events_cache(date DESC);
CREATE INDEX idx_posthog_events_cache_event_name ON posthog_events_cache(event_name);

-- ============================================================================
-- MATERIALIZED VIEWS FOR DASHBOARD
-- ============================================================================

-- Overall app health summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_app_health_summary AS
SELECT
  date,
  SUM(request_count) as total_requests,
  SUM(success_count) as total_success,
  SUM(error_count) as total_errors,
  ROUND(AVG(avg_response_time_ms), 2) as avg_response_time,
  ROUND(AVG(p95_response_time_ms), 2) as p95_response_time,
  ROUND((SUM(success_count)::numeric / NULLIF(SUM(request_count), 0) * 100), 2) as success_rate
FROM api_endpoint_metrics
WHERE hour IS NULL -- Daily aggregation only
GROUP BY date
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_app_health_summary(date);

-- Email campaign performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_email_performance_summary AS
SELECT
  ec.campaign_id,
  ec.name,
  ec.campaign_type,
  ec.sent_at,
  SUM(ecm.sent_count) as total_sent,
  SUM(ecm.delivered_count) as total_delivered,
  SUM(ecm.unique_open_count) as total_opens,
  SUM(ecm.unique_click_count) as total_clicks,
  ROUND(AVG(ecm.open_rate), 2) as avg_open_rate,
  ROUND(AVG(ecm.click_rate), 2) as avg_click_rate,
  SUM(ecm.revenue) as total_revenue
FROM email_campaigns ec
LEFT JOIN email_campaign_metrics ecm ON ec.campaign_id = ecm.campaign_id
WHERE ec.status = 'sent'
GROUP BY ec.campaign_id, ec.name, ec.campaign_type, ec.sent_at
ORDER BY ec.sent_at DESC;

CREATE UNIQUE INDEX ON mv_email_performance_summary(campaign_id);

-- Social media performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_social_performance_summary AS
SELECT
  sp.platform,
  DATE_TRUNC('week', sp.published_at)::date as week_start,
  COUNT(sp.id) as posts_count,
  SUM(spm.impressions) as total_impressions,
  SUM(spm.reach) as total_reach,
  SUM(spm.likes + spm.comments + spm.shares) as total_engagement,
  ROUND(AVG(spm.engagement_rate), 2) as avg_engagement_rate
FROM social_posts sp
LEFT JOIN social_post_metrics spm ON sp.post_id = spm.post_id
WHERE sp.status = 'published'
GROUP BY sp.platform, DATE_TRUNC('week', sp.published_at)
ORDER BY week_start DESC, sp.platform;

CREATE INDEX ON mv_social_performance_summary(week_start, platform);

-- Meta ads performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_meta_ads_summary AS
SELECT
  mac.campaign_id,
  mac.name,
  mac.objective,
  DATE_TRUNC('week', mam.date)::date as week_start,
  SUM(mam.impressions) as total_impressions,
  SUM(mam.clicks) as total_clicks,
  SUM(mam.conversions) as total_conversions,
  SUM(mam.spend) as total_spend,
  ROUND(AVG(mam.ctr), 4) as avg_ctr,
  ROUND(AVG(mam.roas), 2) as avg_roas,
  ROUND(SUM(mam.conversion_value) / NULLIF(SUM(mam.spend), 0), 2) as total_roas
FROM meta_ad_campaigns mac
JOIN meta_ad_sets mas ON mac.campaign_id = mas.campaign_id
JOIN meta_ads ma ON mas.ad_set_id = ma.ad_set_id
JOIN meta_ad_metrics mam ON ma.ad_id = mam.ad_id
GROUP BY mac.campaign_id, mac.name, mac.objective, DATE_TRUNC('week', mam.date)
ORDER BY week_start DESC, mac.campaign_id;

CREATE INDEX ON mv_meta_ads_summary(week_start, campaign_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Refresh all dashboard materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_app_health_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_email_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_social_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_meta_ads_summary;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate email campaign rates
CREATE OR REPLACE FUNCTION calculate_email_rates(
  p_campaign_id VARCHAR(255),
  p_date DATE
)
RETURNS TABLE (
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  click_to_open_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND((delivered_count::numeric / NULLIF(sent_count, 0) * 100), 2) as delivery_rate,
    ROUND((unique_open_count::numeric / NULLIF(delivered_count, 0) * 100), 2) as open_rate,
    ROUND((unique_click_count::numeric / NULLIF(delivered_count, 0) * 100), 2) as click_rate,
    ROUND((unique_click_count::numeric / NULLIF(unique_open_count, 0) * 100), 2) as click_to_open_rate
  FROM email_campaign_metrics
  WHERE campaign_id = p_campaign_id AND date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Verify admin session
CREATE OR REPLACE FUNCTION verify_admin_session(p_token TEXT)
RETURNS TABLE (
  admin_user_id UUID,
  email VARCHAR,
  role VARCHAR,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    au.role,
    (s.expires_at > NOW() AND au.is_active) as is_valid
  FROM admin_sessions s
  JOIN admin_users au ON s.admin_user_id = au.id
  WHERE s.token = p_token;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_content_performance_updated_at
  BEFORE UPDATE ON content_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE admin_users IS 'Admin users for dashboard access (separate from app users)';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions with JWT tokens';
COMMENT ON TABLE api_endpoint_metrics IS 'API performance metrics aggregated from PostHog + logs';
COMMENT ON TABLE feature_adoption IS 'Feature usage and adoption tracking';
COMMENT ON TABLE content_performance IS 'Blog posts and content metadata';
COMMENT ON TABLE content_metrics IS 'Daily content performance metrics (traffic, engagement, SEO)';
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE email_campaign_metrics IS 'Email campaign performance metrics';
COMMENT ON TABLE social_posts IS 'Organic social media posts across platforms';
COMMENT ON TABLE social_post_metrics IS 'Social media post performance metrics';
COMMENT ON TABLE meta_ad_campaigns IS 'Facebook/Instagram ad campaigns';
COMMENT ON TABLE meta_ad_sets IS 'Meta ad sets (targeting and budgets)';
COMMENT ON TABLE meta_ads IS 'Individual Meta ads with creative';
COMMENT ON TABLE meta_ad_metrics IS 'Daily Meta ad performance metrics';
COMMENT ON TABLE posthog_events_cache IS 'Cached PostHog events for faster dashboard queries';

COMMIT;
