-- Migration: Unified Events Tracking System
-- Description: Single source of truth for all analytics events from all platforms
-- Date: 2025-11-01
-- Version: 1.0

-- =====================================================
-- 1. Create ENUMs
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.event_source AS ENUM (
    'app',
    'superwall',
    'revenuecat',
    'stripe',
    'apple',
    'google',
    'facebook_ads',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_category AS ENUM (
    'ui',
    'paywall',
    'billing',
    'lifecycle',
    'ads',
    'error',
    'internal'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. Create Events Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.events (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idempotency
  idempotency_key text UNIQUE,
  
  -- Classification
  source public.event_source NOT NULL,
  category public.event_category NOT NULL,
  name text NOT NULL,
  
  -- Timing
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  
  -- User context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  app_user_id text,                    -- RevenueCat app_user_id
  anon_id uuid,                        -- Device UUID
  session_id text,
  
  -- Device
  platform text,                       -- ios | android | web | server
  device text,                         -- Model or User-Agent
  
  -- Attribution
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  
  -- Billing context
  product_id text,
  entitlement_id text,
  store text,                          -- app_store | play_store | stripe
  revenue_amount_cents integer,
  currency text,
  
  -- Ads context
  campaign_id text,
  adset_id text,
  ad_id text,
  
  -- Meta
  external_ref text,                   -- Webhook ID, JTI, etc.
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text DEFAULT 'ingest'
);

-- =====================================================
-- 3. Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_events_time ON public.events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_source_name ON public.events(source, name);
CREATE INDEX IF NOT EXISTS idx_events_user ON public.events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_app_user ON public.events(app_user_id) WHERE app_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session ON public.events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category, name);
CREATE INDEX IF NOT EXISTS idx_events_revenue ON public.events(revenue_amount_cents) WHERE revenue_amount_cents IS NOT NULL;

-- GIN index for JSONB payload queries
CREATE INDEX IF NOT EXISTS idx_events_payload ON public.events USING gin(payload);

-- =====================================================
-- 4. Create Analytical Views
-- =====================================================

-- View: 7-day event counts by name
CREATE OR REPLACE VIEW public.events_7d AS
SELECT
  name,
  source,
  category,
  COUNT(*) as count_7d,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM public.events
WHERE occurred_at >= now() - interval '7 days'
GROUP BY name, source, category
ORDER BY count_7d DESC;

-- View: Revenue rollups by day
CREATE OR REPLACE VIEW public.revenue_rollups AS
SELECT
  date_trunc('day', occurred_at) as day,
  SUM(COALESCE(revenue_amount_cents, 0)) as amount_cents,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT user_id) as unique_payers,
  currency
FROM public.events
WHERE name IN ('purchase_completed', 'renewal', 'trial_converted')
  AND revenue_amount_cents IS NOT NULL
GROUP BY date_trunc('day', occurred_at), currency
ORDER BY day DESC;

-- View: Hourly event rates (last 24 hours)
CREATE OR REPLACE VIEW public.events_24h AS
SELECT
  date_trunc('hour', occurred_at) as hour,
  source,
  category,
  COUNT(*) as event_count
FROM public.events
WHERE occurred_at >= now() - interval '24 hours'
GROUP BY date_trunc('hour', occurred_at), source, category
ORDER BY hour DESC;

-- View: User funnel (onboarding → trial → paid)
CREATE OR REPLACE VIEW public.user_funnel AS
WITH funnel_events AS (
  SELECT DISTINCT
    user_id,
    MAX(CASE WHEN name = 'first_onboarding_completed' THEN occurred_at END) as onboarded_at,
    MAX(CASE WHEN name = 'trial_started' THEN occurred_at END) as trial_started_at,
    MAX(CASE WHEN name = 'purchase_completed' THEN occurred_at END) as purchased_at,
    MAX(CASE WHEN name = 'second_onboarding_shown' THEN occurred_at END) as paywall_shown_at
  FROM public.events
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
SELECT
  COUNT(*) as total_users,
  COUNT(onboarded_at) as onboarded_count,
  COUNT(trial_started_at) as trial_count,
  COUNT(paywall_shown_at) as paywall_shown_count,
  COUNT(purchased_at) as purchased_count,
  ROUND(100.0 * COUNT(trial_started_at) / NULLIF(COUNT(onboarded_at), 0), 2) as onboard_to_trial_pct,
  ROUND(100.0 * COUNT(purchased_at) / NULLIF(COUNT(trial_started_at), 0), 2) as trial_to_paid_pct,
  ROUND(100.0 * COUNT(purchased_at) / NULLIF(COUNT(paywall_shown_at), 0), 2) as paywall_conversion_pct
FROM funnel_events;

-- View: Attribution summary
CREATE OR REPLACE VIEW public.attribution_summary AS
SELECT
  utm_source,
  utm_medium,
  utm_campaign,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN name = 'purchase_completed' THEN user_id END) as paying_users,
  SUM(CASE WHEN name = 'purchase_completed' THEN revenue_amount_cents ELSE 0 END) as total_revenue_cents,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN name = 'purchase_completed' THEN user_id END) / NULLIF(COUNT(DISTINCT user_id), 0), 2) as conversion_rate
FROM public.events
WHERE utm_source IS NOT NULL
GROUP BY utm_source, utm_medium, utm_campaign
ORDER BY total_revenue_cents DESC NULLS LAST;

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to get event count for a user
CREATE OR REPLACE FUNCTION get_user_event_count(
  p_user_id uuid,
  p_event_name text DEFAULT NULL,
  p_days int DEFAULT 30
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM public.events
  WHERE user_id = p_user_id
    AND (p_event_name IS NULL OR name = p_event_name)
    AND occurred_at >= now() - (p_days || ' days')::interval;
$$;

-- Function to get user's lifetime revenue
CREATE OR REPLACE FUNCTION get_user_lifetime_revenue(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(revenue_amount_cents), 0)::integer
  FROM public.events
  WHERE user_id = p_user_id
    AND revenue_amount_cents IS NOT NULL;
$$;

-- Function to check if user has event
CREATE OR REPLACE FUNCTION has_user_event(
  p_user_id uuid,
  p_event_name text,
  p_days int DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE user_id = p_user_id
      AND name = p_event_name
      AND (p_days IS NULL OR occurred_at >= now() - (p_days || ' days')::interval)
  );
$$;

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS (but allow service role full access)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage events"
  ON public.events
  FOR ALL
  USING (true);

-- Users can view their own events (if you want user-facing analytics)
CREATE POLICY "Users can view own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. Comments
-- =====================================================

COMMENT ON TABLE public.events IS 'Unified events table for all analytics from all platforms';
COMMENT ON COLUMN public.events.idempotency_key IS 'Used to prevent duplicate events from webhooks';
COMMENT ON COLUMN public.events.source IS 'Platform that generated the event';
COMMENT ON COLUMN public.events.category IS 'Event category for grouping';
COMMENT ON COLUMN public.events.app_user_id IS 'RevenueCat app_user_id or cross-platform stable ID';
COMMENT ON COLUMN public.events.anon_id IS 'Anonymous device UUID for pre-login tracking';
COMMENT ON COLUMN public.events.payload IS 'Raw event data for debugging';

COMMENT ON VIEW public.events_7d IS 'Event counts for the last 7 days by name and source';
COMMENT ON VIEW public.revenue_rollups IS 'Daily revenue aggregations';
COMMENT ON VIEW public.user_funnel IS 'Conversion funnel metrics';
COMMENT ON VIEW public.attribution_summary IS 'Attribution and conversion by UTM parameters';

-- =====================================================
-- Migration Complete
-- =====================================================
