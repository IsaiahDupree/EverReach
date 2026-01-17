-- Lifecycle Automation System
-- Complete schema for event-driven marketing automation
-- 
-- Flow: PostHog → Supabase → Segments → Resend/Twilio
-- Features: Consent, quiet hours, frequency caps, A/B testing, holdouts

-- ============================================================================
-- 1. PROFILES (Enhanced with consent & preferences)
-- ============================================================================

-- Add lifecycle columns to existing profiles table
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS consent_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_sms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_analytics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_push boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_e164 text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';

-- ============================================================================
-- 2. EVENT LOG (PostHog mirror for segments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id),
  anonymous_id text,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'posthog',
  idempotency_key text UNIQUE, -- Prevent duplicate events
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_event_log_ts ON event_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_event_name ON event_log (event_name);
CREATE INDEX IF NOT EXISTS idx_event_log_user_id ON event_log (user_id);
CREATE INDEX IF NOT EXISTS idx_event_log_user_event ON event_log (user_id, event_name);
CREATE INDEX IF NOT EXISTS idx_event_log_properties ON event_log USING gin (properties);

-- ============================================================================
-- 3. USER TRAITS (Denormalized for fast segment evaluation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_traits (
  user_id uuid PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Activity
  last_seen timestamptz,
  sessions_7d int DEFAULT 0,
  sessions_30d int DEFAULT 0,
  days_active_28d int DEFAULT 0,
  is_heavy_user boolean DEFAULT false,
  
  -- Onboarding
  onboarding_stage text,
  onboarding_completed_at timestamptz,
  
  -- Paywall
  paywall_first_seen timestamptz,
  paywall_last_seen timestamptz,
  paywall_impressions_total int DEFAULT 0,
  
  -- Subscription
  subscription_status text DEFAULT 'free',
  mrr_cents int DEFAULT 0,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscribed_at timestamptz,
  churned_at timestamptz,
  
  -- Engagement scores
  warmth_avg_7d numeric,
  contacts_count int DEFAULT 0,
  messages_sent_7d int DEFAULT 0,
  
  -- Last updated
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_traits_last_seen ON user_traits (last_seen);
CREATE INDEX IF NOT EXISTS idx_user_traits_subscription_status ON user_traits (subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_traits_heavy_user ON user_traits (is_heavy_user);

-- ============================================================================
-- 4. CAMPAIGNS & TEMPLATES
-- ============================================================================

-- Channel enum
DO $$ BEGIN
  CREATE TYPE channel AS ENUM ('email', 'sms', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  channel channel NOT NULL,
  
  -- Segment SQL (returns user_id, variant_key, reason, context_json)
  entry_sql text NOT NULL,
  
  -- Timing & controls
  cooldown_hours int DEFAULT 48,
  holdout_pct int DEFAULT 10, -- 10% holdout for A/B testing
  
  -- Guardrails
  max_sends_per_day int DEFAULT 1,
  respect_quiet_hours boolean DEFAULT true,
  
  -- Status
  enabled boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Templates (A/B variants)
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_key text NOT NULL DEFAULT 'A',
  
  -- Email
  subject text,
  body_md text,
  preheader text,
  
  -- SMS
  sms_text text,
  
  -- Push
  push_title text,
  push_body text,
  
  -- Video script (for video-first campaigns)
  video_script_md text,
  
  -- Deep link params
  deep_link_path text,
  deep_link_params jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campaign_id, variant_key)
);

-- ============================================================================
-- 5. DELIVERIES (Send log with status tracking)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'queued', 'sent', 'delivered', 'opened', 'clicked', 
    'bounced', 'failed', 'suppressed', 'unsubscribed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  user_id uuid REFERENCES profiles(user_id),
  variant_key text NOT NULL,
  channel channel NOT NULL,
  
  -- Status tracking
  status delivery_status DEFAULT 'queued',
  external_id text, -- Resend/Twilio message ID
  
  -- Timing
  queued_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  
  -- Error handling
  error text,
  retry_count int DEFAULT 0,
  
  -- Context
  reason text, -- e.g., 'paywall_abandoned'
  context_json jsonb DEFAULT '{}'::jsonb,
  
  -- Attribution (track revenue from this campaign)
  attributed_purchase_at timestamptz,
  attributed_revenue_cents int
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries (status);
CREATE INDEX IF NOT EXISTS idx_deliveries_campaign_id ON deliveries (campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_id ON deliveries (user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_sent_at ON deliveries (sent_at DESC);

-- Unique constraint for cooldown enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_campaign_user_cooldown 
  ON deliveries (campaign_id, user_id) 
  WHERE sent_at > now() - interval '48 hours';

-- ============================================================================
-- 6. OUTBOUND PREFERENCES (Per-user settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS outbound_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Quiet hours (user's timezone)
  quiet_hours_start time, -- e.g., '21:00'
  quiet_hours_end time,   -- e.g., '08:00'
  
  -- Frequency caps
  max_emails_per_day int DEFAULT 2,
  max_sms_per_week int DEFAULT 2,
  max_push_per_day int DEFAULT 5,
  
  -- Channel preferences
  preferred_channel channel DEFAULT 'email',
  
  -- Opt-outs
  unsubscribed_email_at timestamptz,
  unsubscribed_sms_at timestamptz,
  unsubscribed_push_at timestamptz,
  
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. SEGMENT VIEWS (Pre-defined audiences)
-- ============================================================================

-- Onboarding Stuck (started but didn't complete in 24h)
CREATE OR REPLACE VIEW v_onboarding_stuck AS
SELECT DISTINCT 
  p.user_id,
  ut.onboarding_stage,
  MAX(e.ts) as last_step_at
FROM profiles p
JOIN user_traits ut ON ut.user_id = p.user_id
LEFT JOIN event_log e ON e.user_id = p.user_id 
  AND e.event_name = 'onboarding_step_completed'
WHERE ut.onboarding_completed_at IS NULL
  AND e.ts IS NOT NULL
  AND now() - e.ts > interval '24 hours'
  AND p.consent_email = true
GROUP BY p.user_id, ut.onboarding_stage;

-- Paywall Abandoned (saw paywall but no purchase in 2h)
CREATE OR REPLACE VIEW v_paywall_abandoned AS
SELECT DISTINCT
  e.user_id,
  e.ts as paywall_seen_at,
  e.properties->>'variant' as variant
FROM event_log e
JOIN profiles p ON p.user_id = e.user_id
WHERE e.event_name = 'paywall_presented'
  AND e.ts > now() - interval '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM event_log e2
    WHERE e2.user_id = e.user_id
      AND e2.event_name IN ('purchase_started', 'purchase_succeeded')
      AND e2.ts > e.ts
      AND e2.ts <= e.ts + interval '2 hours'
  )
  AND p.consent_email = true;

-- Payment Failed (last 48h)
CREATE OR REPLACE VIEW v_payment_failed AS
SELECT DISTINCT
  e.user_id,
  MAX(e.ts) as failed_at,
  e.properties->>'error' as error_reason
FROM event_log e
JOIN profiles p ON p.user_id = e.user_id
WHERE e.event_name = 'payment_failed'
  AND e.ts > now() - interval '48 hours'
  AND p.consent_email = true
GROUP BY e.user_id, e.properties->>'error';

-- Inactive 7 Days (no session_started)
CREATE OR REPLACE VIEW v_inactive_7d AS
SELECT 
  p.user_id,
  ut.last_seen,
  ut.sessions_30d
FROM profiles p
JOIN user_traits ut ON ut.user_id = p.user_id
WHERE ut.last_seen < now() - interval '7 days'
  AND ut.subscription_status IN ('active', 'trial')
  AND p.consent_email = true;

-- Heavy Users (top 10% activity)
CREATE OR REPLACE VIEW v_heavy_users AS
SELECT 
  p.user_id,
  ut.days_active_28d,
  ut.sessions_7d,
  ut.messages_sent_7d
FROM profiles p
JOIN user_traits ut ON ut.user_id = p.user_id
WHERE ut.is_heavy_user = true
  AND p.consent_email = true;

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Bump session counters (called from webhook)
CREATE OR REPLACE FUNCTION bump_session_counters(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_traits (user_id, sessions_7d, sessions_30d, last_seen)
  VALUES (p_user_id, 1, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    sessions_7d = COALESCE(user_traits.sessions_7d, 0) + 1,
    sessions_30d = COALESCE(user_traits.sessions_30d, 0) + 1,
    last_seen = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can receive message now (respects quiet hours, frequency caps)
CREATE OR REPLACE FUNCTION can_send_now(
  p_user_id uuid,
  p_campaign_id uuid,
  p_channel channel
)
RETURNS boolean AS $$
DECLARE
  v_consent boolean;
  v_quiet_start time;
  v_quiet_end time;
  v_user_tz text;
  v_user_time time;
  v_recent_sends int;
  v_max_per_day int;
BEGIN
  -- Check consent
  SELECT 
    CASE p_channel
      WHEN 'email' THEN consent_email
      WHEN 'sms' THEN consent_sms
      WHEN 'push' THEN consent_push
    END,
    timezone
  INTO v_consent, v_user_tz
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF NOT v_consent THEN
    RETURN false;
  END IF;
  
  -- Check quiet hours
  SELECT quiet_hours_start, quiet_hours_end, 
    CASE p_channel
      WHEN 'email' THEN max_emails_per_day
      WHEN 'sms' THEN max_sms_per_week / 7 -- rough daily limit
      WHEN 'push' THEN max_push_per_day
    END
  INTO v_quiet_start, v_quiet_end, v_max_per_day
  FROM outbound_preferences
  WHERE user_id = p_user_id;
  
  IF v_quiet_start IS NOT NULL AND v_quiet_end IS NOT NULL THEN
    v_user_time := (now() AT TIME ZONE v_user_tz)::time;
    IF v_user_time >= v_quiet_start OR v_user_time <= v_quiet_end THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check frequency cap
  SELECT COUNT(*)
  INTO v_recent_sends
  FROM deliveries
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND sent_at > now() - interval '24 hours';
  
  IF v_recent_sends >= COALESCE(v_max_per_day, 999) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user trait on event (triggered from webhook)
CREATE OR REPLACE FUNCTION update_trait_on_event()
RETURNS trigger AS $$
BEGIN
  -- Update last_seen on any event
  UPDATE user_traits
  SET last_seen = NEW.ts,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Update specific traits based on event
  CASE NEW.event_name
    WHEN 'paywall_presented' THEN
      UPDATE user_traits
      SET paywall_last_seen = NEW.ts,
          paywall_impressions_total = COALESCE(paywall_impressions_total, 0) + 1,
          paywall_first_seen = COALESCE(paywall_first_seen, NEW.ts)
      WHERE user_id = NEW.user_id;
      
    WHEN 'purchase_succeeded' THEN
      UPDATE user_traits
      SET subscription_status = 'active',
          subscribed_at = NEW.ts
      WHERE user_id = NEW.user_id;
      
    WHEN 'trial_started' THEN
      UPDATE user_traits
      SET subscription_status = 'trial',
          trial_started_at = NEW.ts,
          trial_ends_at = NEW.ts + interval '7 days'
      WHERE user_id = NEW.user_id;
      
    ELSE
      -- No special handling
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update traits
DROP TRIGGER IF EXISTS trigger_update_trait_on_event ON event_log;
CREATE TRIGGER trigger_update_trait_on_event
  AFTER INSERT ON event_log
  FOR EACH ROW
  EXECUTE FUNCTION update_trait_on_event();

-- ============================================================================
-- 9. RLS POLICIES (Security)
-- ============================================================================

-- Enable RLS
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own events" ON event_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own traits" ON user_traits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own deliveries" ON deliveries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences" ON outbound_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks and workers)
CREATE POLICY "Service role full access events" ON event_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access traits" ON user_traits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access deliveries" ON deliveries
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON TABLE event_log IS 'Mirror of PostHog events for segment evaluation';
COMMENT ON TABLE user_traits IS 'Denormalized user facts for fast segment queries';
COMMENT ON TABLE campaigns IS 'Automated campaigns with entry SQL and controls';
COMMENT ON TABLE deliveries IS 'Outbound message log with status tracking';
