-- =====================================================
-- MARKETING INTELLIGENCE SYSTEM
-- Version: 1.0
-- Date: October 21, 2025
-- 
-- Complete schema for intent-based attribution, persona bucketing,
-- lifecycle tracking, and magnetism scoring
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1) CORE USER & IDENTITY
-- =====================================================

-- User identity enrichment from Clay
CREATE TABLE IF NOT EXISTS user_identity (
  identity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  role_title TEXT,
  linkedin TEXT,
  twitter TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  website TEXT,
  audience_size INT,
  last_enriched_at TIMESTAMPTZ,
  raw_enrichment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_user ON user_identity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_enriched ON user_identity(last_enriched_at);

-- Enable RLS
ALTER TABLE user_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own identity"
  ON user_identity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON user_identity FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 2) CAMPAIGNS & CREATIVES
-- =====================================================

-- Channel types
CREATE TYPE channel AS ENUM(
  'meta_ads',
  'google_ads',
  'linkedin_ads',
  'tiktok_ads',
  'x_twitter',
  'instagram',
  'youtube',
  'linkedin',
  'email',
  'app',
  'web'
);

CREATE TYPE content_type AS ENUM(
  'ad',
  'organic_post',
  'email',
  'landing',
  'app_screen'
);

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS campaign (
  campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  channel channel NOT NULL,
  objective TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  budget_cents INT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_channel ON campaign(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_dates ON campaign(start_at, end_at);

-- Ad creatives / content pieces
CREATE TABLE IF NOT EXISTS creative (
  creative_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  ab_variant TEXT,
  external_ref TEXT,
  title TEXT,
  body TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_campaign ON creative(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creative_variant ON creative(ab_variant);

-- Social media posts
CREATE TABLE IF NOT EXISTS social_post (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaign(campaign_id) ON DELETE SET NULL,
  platform channel NOT NULL,
  platform_post_id TEXT UNIQUE,
  published_at TIMESTAMPTZ,
  stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_post_platform ON social_post(platform, published_at);

-- Email sends
CREATE TABLE IF NOT EXISTS email_send (
  email_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaign(campaign_id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  provider_message_id TEXT,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_send_user ON email_send(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_send_template ON email_send(template_key);

-- =====================================================
-- 3) PERSONAS & SCORING
-- =====================================================

-- ICP buckets
CREATE TABLE IF NOT EXISTS persona_bucket (
  persona_bucket_id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User to persona assignment
CREATE TABLE IF NOT EXISTS user_persona (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_bucket_id INT REFERENCES persona_bucket(persona_bucket_id) ON DELETE CASCADE,
  confidence NUMERIC CHECK(confidence BETWEEN 0 AND 1),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, persona_bucket_id)
);

CREATE INDEX IF NOT EXISTS idx_user_persona_bucket ON user_persona(persona_bucket_id);

-- Intent scores over time
CREATE TABLE IF NOT EXISTS user_intent_score (
  intent_score_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  source TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_intent_score_user ON user_intent_score(user_id, computed_at DESC);

-- Magnetism index
CREATE TABLE IF NOT EXISTS user_magnetism_index (
  magnetism_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  index_value NUMERIC NOT NULL,
  time_window TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_magnetism_user ON user_magnetism_index(user_id, computed_at DESC);

-- =====================================================
-- 4) LIFECYCLE TRACKING
-- =====================================================

CREATE TYPE activation_source AS ENUM(
  'ad',
  'organic_post',
  'email',
  'direct',
  'unknown'
);

-- Free trials
CREATE TABLE IF NOT EXISTS free_trial (
  trial_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  activated_from activation_source NOT NULL,
  source_ref TEXT,
  completed_onboarding_step INT DEFAULT 0,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trial_user ON free_trial(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_dates ON free_trial(started_at, ended_at);

-- Subscriptions
CREATE TYPE sub_status AS ENUM(
  'active',
  'canceled',
  'past_due',
  'trialing'
);

CREATE TABLE IF NOT EXISTS subscription (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status sub_status NOT NULL,
  plan_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  renewal_at TIMESTAMPTZ,
  mrr_cents INT,
  activated_from activation_source NOT NULL,
  source_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);

-- =====================================================
-- 5) EVENT TRACKING
-- =====================================================

CREATE TYPE event_type AS ENUM(
  'ad_impression',
  'ad_click',
  'landing_view',
  'page_scroll',
  'email_submitted',
  'identity_enriched',
  'email_open',
  'email_click',
  'app_open',
  'feature_used',
  'onboarding_step',
  'trial_started',
  'trial_completed',
  'purchase',
  'subscription_renewal',
  'churn_intent',
  'cancel',
  'reactivation',
  'social_comment',
  'social_like',
  'social_share',
  'return_to_ad',
  'return_to_social'
);

-- Unified event log
CREATE TABLE IF NOT EXISTS user_event (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  etype event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  campaign_id UUID REFERENCES campaign(campaign_id) ON DELETE SET NULL,
  creative_id UUID REFERENCES creative(creative_id) ON DELETE SET NULL,
  email_id UUID REFERENCES email_send(email_id) ON DELETE SET NULL,
  post_id UUID REFERENCES social_post(post_id) ON DELETE SET NULL,
  source channel,
  intent_weight NUMERIC DEFAULT 0,
  props JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_event_user ON user_event(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_event_type ON user_event(etype, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_event_campaign ON user_event(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_event_anonymous ON user_event(anonymous_id) WHERE anonymous_id IS NOT NULL;

-- Event weight configuration
CREATE TABLE IF NOT EXISTS intent_weight (
  etype event_type PRIMARY KEY,
  weight NUMERIC NOT NULL
);

-- Seed default weights
INSERT INTO intent_weight(etype, weight) VALUES
  ('ad_click', 10),
  ('page_scroll', 8),
  ('email_submitted', 30),
  ('identity_enriched', 10),
  ('email_click', 15),
  ('onboarding_step', 12),
  ('trial_started', 25),
  ('feature_used', 10),
  ('return_to_ad', 8),
  ('return_to_social', 6),
  ('reactivation', 15),
  ('email_open', 12)
ON CONFLICT (etype) DO NOTHING;

-- =====================================================
-- 6) COMPUTED FUNCTIONS
-- =====================================================

-- Calculate intent score for a user over a time period
CREATE OR REPLACE FUNCTION compute_intent_score(
  p_user UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE SQL
AS $$
  SELECT COALESCE(SUM(we.weight), 0)
  FROM user_event ue
  JOIN intent_weight we ON we.etype = ue.etype
  WHERE ue.user_id = p_user
    AND ue.occurred_at >= p_start
    AND ue.occurred_at < p_end;
$$;

-- Calculate magnetism index
CREATE OR REPLACE FUNCTION compute_magnetism_index(
  p_user UUID,
  p_window TEXT DEFAULT '7d'
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  since TIMESTAMPTZ;
  intent NUMERIC;
  engagement NUMERIC;
  react NUMERIC;
  ctr NUMERIC;
  returns NUMERIC;
BEGIN
  since := NOW() - CASE
    WHEN p_window = '30d' THEN INTERVAL '30 days'
    ELSE INTERVAL '7 days'
  END;

  -- Intent score
  intent := COALESCE((
    SELECT SUM(we.weight)
    FROM user_event ue
    JOIN intent_weight we ON we.etype = ue.etype
    WHERE ue.user_id = p_user
      AND ue.occurred_at >= since
  ), 0);

  -- Engagement (app usage)
  engagement := COALESCE((
    SELECT COUNT(*)
    FROM user_event
    WHERE user_id = p_user
      AND etype IN ('feature_used', 'app_open', 'onboarding_step')
      AND occurred_at >= since
  ), 0);

  -- Reactivation
  react := COALESCE((
    SELECT COUNT(*)
    FROM user_event
    WHERE user_id = p_user
      AND etype = 'reactivation'
      AND occurred_at >= since
  ), 0);

  -- Email CTR
  ctr := COALESCE((
    SELECT COUNT(*) FILTER (WHERE etype = 'email_click')::NUMERIC
         / GREATEST(COUNT(*) FILTER (WHERE etype = 'email_open')::NUMERIC, 1)
    FROM user_event
    WHERE user_id = p_user
      AND occurred_at >= since
  ), 0);

  -- Social/ad returns
  returns := COALESCE((
    SELECT COUNT(*)
    FROM user_event
    WHERE user_id = p_user
      AND etype IN ('return_to_ad', 'return_to_social')
      AND occurred_at >= since
  ), 0);

  -- Weighted formula
  RETURN (intent * 0.3) + (engagement * 0.25) + (react * 0.2) + (ctr * 0.15 * 100) + (returns * 0.1);
END $$;

-- Event ingestion helper
CREATE OR REPLACE FUNCTION ingest_event(p JSONB)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID;
  v_event UUID;
BEGIN
  -- Resolve user by email if provided
  IF (p ? 'email') THEN
    INSERT INTO auth.users(email)
    VALUES (p->>'email')
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_user;
  ELSE
    v_user := (p->>'user_id')::UUID;
  END IF;

  -- Insert event
  INSERT INTO user_event(
    user_id,
    anonymous_id,
    etype,
    occurred_at,
    campaign_id,
    creative_id,
    email_id,
    post_id,
    source,
    intent_weight,
    props
  )
  VALUES (
    v_user,
    p->>'anonymous_id',
    (p->>'etype')::event_type,
    COALESCE((p->>'occurred_at')::TIMESTAMPTZ, NOW()),
    (p->>'campaign_id')::UUID,
    (p->>'creative_id')::UUID,
    (p->>'email_id')::UUID,
    (p->>'post_id')::UUID,
    (p->>'source')::channel,
    COALESCE((
      SELECT weight
      FROM intent_weight
      WHERE etype = (p->>'etype')::event_type
    ), 0),
    p
  )
  RETURNING event_id INTO v_event;

  RETURN v_event;
END $$;

-- =====================================================
-- 7) ANALYTICS VIEWS
-- =====================================================

-- Last touch attribution
CREATE OR REPLACE VIEW vw_last_touch_before_conversion AS
SELECT
  t.user_id,
  t.event_type,
  t.conv_time,
  e.etype AS last_touch_type,
  e.campaign_id,
  e.creative_id,
  e.source,
  e.occurred_at AS last_touch_time
FROM (
  SELECT
    u.id AS user_id,
    'trial_started'::TEXT AS event_type,
    (
      SELECT occurred_at
      FROM user_event
      WHERE user_event.user_id = u.id
        AND etype = 'trial_started'
      ORDER BY occurred_at ASC
      LIMIT 1
    ) AS conv_time
  FROM auth.users u
  UNION ALL
  SELECT
    u.id AS user_id,
    'purchase'::TEXT,
    (
      SELECT occurred_at
      FROM user_event
      WHERE user_event.user_id = u.id
        AND etype = 'purchase'
      ORDER BY occurred_at ASC
      LIMIT 1
    )
  FROM auth.users u
) t
LEFT JOIN LATERAL (
  SELECT *
  FROM user_event ue
  WHERE ue.user_id = t.user_id
    AND ue.occurred_at <= t.conv_time
  ORDER BY ue.occurred_at DESC
  LIMIT 1
) e ON TRUE
WHERE t.conv_time IS NOT NULL;

-- Daily funnel metrics (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_funnel AS
WITH day_events AS (
  SELECT
    DATE_TRUNC('day', occurred_at) AS d,
    etype,
    COUNT(*) AS c
  FROM user_event
  WHERE occurred_at >= NOW() - INTERVAL '120 days'
  GROUP BY 1, 2
)
SELECT
  d,
  COALESCE(SUM(c) FILTER (WHERE etype = 'ad_click'), 0) AS ad_clicks,
  COALESCE(SUM(c) FILTER (WHERE etype = 'email_submitted'), 0) AS emails_captured,
  COALESCE(SUM(c) FILTER (WHERE etype = 'trial_started'), 0) AS trials,
  COALESCE(SUM(c) FILTER (WHERE etype = 'purchase'), 0) AS purchases,
  COALESCE(SUM(c) FILTER (WHERE etype = 'reactivation'), 0) AS reactivations
FROM day_events
GROUP BY 1
ORDER BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_funnel_d ON mv_daily_funnel(d);

-- User magnetism snapshot (7-day window)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_magnetism_7d AS
SELECT
  u.id AS user_id,
  NOW()::DATE AS asof_date,
  compute_magnetism_index(u.id, '7d') AS magnetism_7d
FROM auth.users u;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_magnetism_user ON mv_user_magnetism_7d(user_id);

-- Reactivation rate by campaign & persona
CREATE OR REPLACE VIEW vw_reactivation_30d AS
SELECT
  COALESCE(campaign_id::TEXT, '(none)') AS campaign_id,
  pb.label AS persona,
  COUNT(*) FILTER (WHERE ue.etype = 'reactivation')::NUMERIC
    / GREATEST(COUNT(*), 1) AS reactivation_rate
FROM user_event ue
LEFT JOIN user_persona up ON up.user_id = ue.user_id
LEFT JOIN persona_bucket pb ON pb.persona_bucket_id = up.persona_bucket_id
WHERE ue.occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2;

-- =====================================================
-- 8) REFRESH FUNCTIONS
-- =====================================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_marketing_analytics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_magnetism_7d;
END $$;

-- =====================================================
-- 9) COMMENTS
-- =====================================================

COMMENT ON TABLE user_identity IS 'Clay-enriched user identity with social profiles';
COMMENT ON TABLE campaign IS 'Marketing campaigns across all channels';
COMMENT ON TABLE creative IS 'Ad creatives and content pieces';
COMMENT ON TABLE user_event IS 'Unified event stream for attribution and scoring';
COMMENT ON TABLE user_intent_score IS 'Computed intent scores over time';
COMMENT ON TABLE user_magnetism_index IS 'Brand magnetism metric (engagement + retention)';
COMMENT ON FUNCTION compute_magnetism_index IS 'Calculate magnetism index: weighted sum of intent, engagement, reactivation, CTR, returns';
COMMENT ON FUNCTION ingest_event IS 'Webhook handler for external event ingestion';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
