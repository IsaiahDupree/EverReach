/**
 * Supporting Systems Migration
 * 
 * Additional tables for:
 * - Device registration (trial abuse prevention)
 * - Paywall events (impressions, CTA clicks)
 * - Attribution tracking (UTMs, referrers)
 * - Warmth timeline events
 * - Consent management
 * 
 * Complements trial_tracking_system.sql
 */

-- ============================================================================
-- 1. DEVICE REGISTRATION (Trial Abuse Prevention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, device_hash)
);

COMMENT ON TABLE devices IS 'Track user devices for trial eligibility and abuse prevention';
COMMENT ON COLUMN devices.device_hash IS 'SHA256 hash of device identifier';

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_hash ON devices(device_hash);

-- RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register own devices"
  ON devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. PAYWALL EVENTS (Impressions & CTA Clicks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS paywall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('impression', 'cta_click')),
  context TEXT,
  cta TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(idempotency_key)
);

COMMENT ON TABLE paywall_events IS 'Track paywall impressions and conversion events';
COMMENT ON COLUMN paywall_events.variant IS 'A/B test variant shown';
COMMENT ON COLUMN paywall_events.type IS 'impression or cta_click';
COMMENT ON COLUMN paywall_events.context IS 'Where paywall shown (trial_expired, feature_gate, etc)';
COMMENT ON COLUMN paywall_events.cta IS 'Which CTA clicked (start_trial, subscribe, etc)';

CREATE INDEX IF NOT EXISTS idx_paywall_events_user ON paywall_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paywall_events_type ON paywall_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paywall_events_variant ON paywall_events(variant, created_at DESC);

-- RLS
ALTER TABLE paywall_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paywall events"
  ON paywall_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own paywall events"
  ON paywall_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to paywall events"
  ON paywall_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. ATTRIBUTION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS attribution (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_term TEXT,
  first_utm_content TEXT,
  first_referrer TEXT,
  first_landing_page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attribution IS 'First-touch attribution data (UTMs, referrer)';

CREATE INDEX IF NOT EXISTS idx_attribution_source ON attribution(first_utm_source);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON attribution(first_utm_campaign);

-- RLS
ALTER TABLE attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attribution"
  ON attribution FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own attribution"
  ON attribution FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attribution"
  ON attribution FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. WARMTH TIMELINE EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS warmth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('interaction', 'decay', 'mode_change', 'manual')),
  delta INT NOT NULL,
  mode TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE warmth_events IS 'Timeline of warmth score changes for contacts';
COMMENT ON COLUMN warmth_events.type IS 'What caused the change: interaction, decay, mode_change, manual';
COMMENT ON COLUMN warmth_events.delta IS 'Change in warmth score (+/-) ';

CREATE INDEX IF NOT EXISTS idx_warmth_events_contact ON warmth_events(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warmth_events_user ON warmth_events(user_id, created_at DESC);

-- RLS
ALTER TABLE warmth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact warmth events"
  ON warmth_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage warmth events"
  ON warmth_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. CONSENT & PRIVACY
-- ============================================================================

-- Add consent columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tracking_consent BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.marketing_emails IS 'Opted in to marketing emails';
COMMENT ON COLUMN profiles.tracking_consent IS 'Opted in to analytics tracking';
COMMENT ON COLUMN profiles.consent_updated_at IS 'When consent was last updated';

-- Account deletion queue
CREATE TABLE IF NOT EXISTS account_deletion_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed')) DEFAULT 'queued',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  erasure_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE account_deletion_queue IS 'Queue for GDPR-compliant account deletion';

-- RLS
ALTER TABLE account_deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion status"
  ON account_deletion_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request own deletion"
  ON account_deletion_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user is eligible for trial
CREATE OR REPLACE FUNCTION check_trial_eligibility(p_user_id UUID)
RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  cooldown_until TIMESTAMPTZ
) LANGUAGE PLPGSQL AS $$
DECLARE
  v_has_subscription BOOLEAN;
  v_trial_count INT;
BEGIN
  -- Check if user has ever had a paid subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'canceled')
  ) INTO v_has_subscription;
  
  IF v_has_subscription THEN
    RETURN QUERY SELECT FALSE, 'already_subscribed'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if user has already used a trial
  SELECT COUNT(*) INTO v_trial_count
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND trial_started_at IS NOT NULL;
  
  IF v_trial_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'trial_already_used'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Eligible!
  RETURN QUERY SELECT TRUE, 'eligible'::TEXT, NULL::TIMESTAMPTZ;
END;
$$;

-- Function: Get warmth band thresholds
CREATE OR REPLACE FUNCTION get_warmth_bands()
RETURNS TABLE (
  band TEXT,
  min_score INT,
  max_score INT,
  color TEXT,
  label TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT * FROM (
    SELECT 'hot'::TEXT as band, 80 as min_score, 100 as max_score, '#EF4444'::TEXT as color, 'Hot'::TEXT as label
    UNION ALL
    SELECT 'warm'::TEXT, 60, 79, '#F59E0B'::TEXT, 'Warm'::TEXT
    UNION ALL
    SELECT 'neutral'::TEXT, 40, 59, '#10B981'::TEXT, 'Neutral'::TEXT
    UNION ALL
    SELECT 'cool'::TEXT, 20, 39, '#3B82F6'::TEXT, 'Cool'::TEXT
    UNION ALL
    SELECT 'cold'::TEXT, 0, 19, '#6B7280'::TEXT, 'Cold'::TEXT
  ) bands
  ORDER BY min_score DESC;
$$;

-- Function: Update attribution (first-touch only)
CREATE OR REPLACE FUNCTION upsert_attribution(
  p_user_id UUID,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT,
  p_utm_term TEXT,
  p_utm_content TEXT,
  p_referrer TEXT,
  p_landing_page TEXT
)
RETURNS VOID LANGUAGE PLPGSQL AS $$
BEGIN
  INSERT INTO attribution (
    user_id,
    first_utm_source,
    first_utm_medium,
    first_utm_campaign,
    first_utm_term,
    first_utm_content,
    first_referrer,
    first_landing_page
  )
  VALUES (
    p_user_id,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_term,
    p_utm_content,
    p_referrer,
    p_landing_page
  )
  ON CONFLICT (user_id) DO NOTHING; -- First-touch only!
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update attribution timestamp
CREATE OR REPLACE FUNCTION update_attribution_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attribution_updated_at
  BEFORE UPDATE ON attribution
  FOR EACH ROW
  EXECUTE FUNCTION update_attribution_timestamp();

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  devices_exists BOOLEAN;
  paywall_events_exists BOOLEAN;
  attribution_exists BOOLEAN;
  warmth_events_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'devices'
  ) INTO devices_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'paywall_events'
  ) INTO paywall_events_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'attribution'
  ) INTO attribution_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'warmth_events'
  ) INTO warmth_events_exists;
  
  IF devices_exists AND paywall_events_exists AND attribution_exists AND warmth_events_exists THEN
    RAISE NOTICE '✅ Supporting systems migration successful!';
    RAISE NOTICE '   - devices table created';
    RAISE NOTICE '   - paywall_events table created';
    RAISE NOTICE '   - attribution table created';
    RAISE NOTICE '   - warmth_events table created';
    RAISE NOTICE '   - Consent columns added to profiles';
    RAISE NOTICE '   - Helper functions created';
  ELSE
    RAISE WARNING '❌ Migration verification failed';
  END IF;
END $$;
