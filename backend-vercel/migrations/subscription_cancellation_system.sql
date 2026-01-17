/**
 * Subscription Cancellation & Multi-Provider System
 * 
 * Extends trial_tracking_system.sql with:
 * - Cross-platform subscription tracking (Stripe, Apple, Google)
 * - Unified cancellation support
 * - Unclaimed entitlements (buy-first, link-later)
 * - Full audit trail
 * 
 * Builds on: trial_tracking_system.sql
 */

-- ============================================================================
-- 1. EXTEND USER_SUBSCRIPTIONS (Multi-Provider Support)
-- ============================================================================

-- Add cross-platform tracking fields
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN (
    'trialing', 'active', 'in_grace', 'paused', 
    'canceled', 'expired', 'billing_issue'
  )),
  ADD COLUMN IF NOT EXISTS entitlement_active_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS origin_platform_user_key TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

COMMENT ON COLUMN user_subscriptions.provider_subscription_id IS 'Provider-specific ID: Stripe sub_xxx | Apple originalTransactionId | Google purchaseToken';
COMMENT ON COLUMN user_subscriptions.status IS 'Normalized status across all providers';
COMMENT ON COLUMN user_subscriptions.entitlement_active_until IS 'Computed: max of trial_end/current_period_end/grace_end - single source of truth';
COMMENT ON COLUMN user_subscriptions.is_primary IS 'Which subscription wins if user has multiple active';
COMMENT ON COLUMN user_subscriptions.origin_platform_user_key IS 'Store account identifier (Apple ID, Google account, etc)';
COMMENT ON COLUMN user_subscriptions.canceled_at IS 'When subscription was canceled (may still be active until period end)';

-- Add unique constraint for provider + subscription ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_provider_id 
  ON user_subscriptions (origin, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- Add index for entitlement queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_entitlement 
  ON user_subscriptions (user_id, entitlement_active_until DESC, is_primary DESC)
  WHERE status IN ('trialing', 'active', 'in_grace');

-- ============================================================================
-- 2. UNCLAIMED ENTITLEMENTS (Buy-First, Link-Later)
-- ============================================================================

CREATE TABLE IF NOT EXISTS unclaimed_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'app_store', 'play')),
  raw_receipt_or_token TEXT NOT NULL,
  hint_email TEXT,
  product_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ
);

COMMENT ON TABLE unclaimed_entitlements IS 'Subscriptions purchased before account creation - can be claimed later';
COMMENT ON COLUMN unclaimed_entitlements.raw_receipt_or_token IS 'Original receipt/token from provider for validation';
COMMENT ON COLUMN unclaimed_entitlements.hint_email IS 'Email hint for matching during claim flow';

CREATE INDEX IF NOT EXISTS idx_unclaimed_entitlements_email 
  ON unclaimed_entitlements (hint_email)
  WHERE claimed_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_unclaimed_entitlements_provider 
  ON unclaimed_entitlements (provider, created_at DESC)
  WHERE claimed_by_user_id IS NULL;

-- RLS Policies
ALTER TABLE unclaimed_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to unclaimed entitlements"
  ON unclaimed_entitlements FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their claimed entitlements"
  ON unclaimed_entitlements FOR SELECT
  USING (claimed_by_user_id = auth.uid());

-- ============================================================================
-- 3. AUDIT EVENTS (Full Subscription Lifecycle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'purchase', 'trial_started', 'trial_converted', 'trial_expired',
    'cancel_request', 'cancel_scheduled', 'cancel_immediate', 'cancel_completed',
    'reactivate', 'provider_webhook', 'status_change', 'entitlement_change',
    'link_receipt', 'claim_entitlement', 'billing_issue', 'grace_period_entered',
    'grace_period_resolved', 'refund', 'chargeback'
  )),
  provider TEXT CHECK (provider IN ('stripe', 'app_store', 'play', 'manual')),
  provider_subscription_id TEXT,
  old_status TEXT,
  new_status TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_audit_events IS 'Complete audit trail of all subscription lifecycle events';
COMMENT ON COLUMN subscription_audit_events.event_type IS 'Type of subscription event that occurred';
COMMENT ON COLUMN subscription_audit_events.payload IS 'Full event data including provider webhooks, user actions, metadata';

CREATE INDEX IF NOT EXISTS idx_audit_events_user_time 
  ON subscription_audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_type 
  ON subscription_audit_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_provider_sub 
  ON subscription_audit_events (provider, provider_subscription_id, created_at DESC)
  WHERE provider_subscription_id IS NOT NULL;

-- RLS Policies
ALTER TABLE subscription_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit events"
  ON subscription_audit_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to audit events"
  ON subscription_audit_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. HELPER FUNCTIONS (Entitlement Resolution)
-- ============================================================================

-- Function: Compute entitlement_active_until based on subscription state
CREATE OR REPLACE FUNCTION compute_entitlement_active_until(
  p_status TEXT,
  p_trial_ends_at TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_grace_period_days INT DEFAULT 3
)
RETURNS TIMESTAMPTZ 
LANGUAGE SQL 
IMMUTABLE AS $$
  SELECT CASE 
    WHEN p_status IN ('trialing', 'active', 'in_grace') THEN
      GREATEST(
        COALESCE(p_trial_ends_at, '1970-01-01'::TIMESTAMPTZ),
        COALESCE(p_current_period_end, '1970-01-01'::TIMESTAMPTZ),
        COALESCE(p_current_period_end + (p_grace_period_days || ' days')::INTERVAL, '1970-01-01'::TIMESTAMPTZ)
      )
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION compute_entitlement_active_until IS 'Calculate effective entitlement end date across all states';

-- Function: Resolve user entitlement (cross-platform)
CREATE OR REPLACE FUNCTION resolve_user_entitlement(p_user_id UUID)
RETURNS TABLE (
  entitled BOOLEAN,
  reason TEXT,
  provider TEXT,
  active_until TIMESTAMPTZ,
  subscription_id UUID,
  cancel_allowed BOOLEAN,
  cancel_method TEXT,
  manage_url TEXT
) 
LANGUAGE PLPGSQL 
STABLE AS $$
DECLARE
  v_primary_sub RECORD;
  v_has_entitled BOOLEAN;
BEGIN
  -- Find all entitled subscriptions
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('trialing', 'active', 'in_grace')
      AND entitlement_active_until > NOW()
  ) INTO v_has_entitled;

  -- Get primary subscription (if any)
  SELECT * INTO v_primary_sub
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('trialing', 'active', 'in_grace')
    AND entitlement_active_until > NOW()
  ORDER BY 
    is_primary DESC NULLS LAST,
    CASE status 
      WHEN 'active' THEN 1 
      WHEN 'trialing' THEN 2 
      WHEN 'in_grace' THEN 3 
      ELSE 4 
    END,
    subscribed_at DESC
  LIMIT 1;

  -- Return resolved entitlement
  RETURN QUERY SELECT
    v_has_entitled,
    COALESCE(v_primary_sub.status, 'none'),
    COALESCE(v_primary_sub.origin, 'none'),
    v_primary_sub.entitlement_active_until,
    v_primary_sub.id,
    (v_primary_sub.id IS NOT NULL AND NOT COALESCE(v_primary_sub.cancel_at_period_end, FALSE)),
    CASE 
      WHEN v_primary_sub.origin = 'stripe' THEN 'server'
      WHEN v_primary_sub.origin IN ('app_store', 'play') THEN 'store'
      ELSE NULL
    END,
    CASE 
      WHEN v_primary_sub.origin = 'app_store' THEN 'https://apps.apple.com/account/subscriptions'
      WHEN v_primary_sub.origin = 'play' THEN 'https://play.google.com/store/account/subscriptions'
      ELSE NULL
    END;
END;
$$;

COMMENT ON FUNCTION resolve_user_entitlement IS 'Resolve user entitlement across all providers with cancel info';

-- Function: Log audit event (helper)
CREATE OR REPLACE FUNCTION log_subscription_audit(
  p_user_id UUID,
  p_event_type TEXT,
  p_provider TEXT DEFAULT NULL,
  p_provider_subscription_id TEXT DEFAULT NULL,
  p_old_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID 
LANGUAGE SQL AS $$
  INSERT INTO subscription_audit_events (
    user_id, event_type, provider, provider_subscription_id,
    old_status, new_status, payload
  ) VALUES (
    p_user_id, p_event_type, p_provider, p_provider_subscription_id,
    p_old_status, p_new_status, p_payload
  )
  RETURNING id;
$$;

COMMENT ON FUNCTION log_subscription_audit IS 'Helper to log subscription lifecycle events';

-- ============================================================================
-- 5. AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Trigger: Auto-compute entitlement_active_until on insert/update
CREATE OR REPLACE FUNCTION auto_compute_entitlement_active_until()
RETURNS TRIGGER AS $$
BEGIN
  NEW.entitlement_active_until := compute_entitlement_active_until(
    NEW.status,
    NEW.trial_ends_at,
    NEW.current_period_end,
    3 -- grace period days
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_entitlement_active_until
  BEFORE INSERT OR UPDATE OF status, trial_ends_at, current_period_end
  ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_compute_entitlement_active_until();

-- Trigger: Auto-set is_primary if first subscription
CREATE OR REPLACE FUNCTION auto_set_primary_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_has_primary BOOLEAN;
BEGIN
  -- Only auto-set on INSERT of new active subscription
  IF TG_OP = 'INSERT' AND NEW.status IN ('trialing', 'active') THEN
    SELECT EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_primary = TRUE
    ) INTO v_has_primary;
    
    -- If no primary exists, make this one primary
    IF NOT v_has_primary THEN
      NEW.is_primary := TRUE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_set_primary
  BEFORE INSERT ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_primary_subscription();

-- ============================================================================
-- 6. BACKFILL & VERIFICATION
-- ============================================================================

-- Backfill provider_subscription_id from existing stripe data
DO $$
BEGIN
  -- Try to backfill from profiles table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'stripe_subscription_id'
  ) THEN
    UPDATE user_subscriptions us
    SET 
      provider_subscription_id = COALESCE(us.provider_subscription_id, p.stripe_subscription_id),
      origin = COALESCE(us.origin, 'stripe')
    FROM profiles p
    WHERE us.user_id = p.user_id
      AND p.stripe_subscription_id IS NOT NULL
      AND us.provider_subscription_id IS NULL;
  END IF;
END $$;

-- Backfill status from subscription_status if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'subscription_status'
  ) THEN
    UPDATE user_subscriptions us
    SET status = CASE p.subscription_status
      WHEN 'trial' THEN 'trialing'
      WHEN 'active' THEN 'active'
      WHEN 'grace' THEN 'in_grace'
      WHEN 'paused' THEN 'paused'
      WHEN 'canceled' THEN 'canceled'
      ELSE 'active'
    END
    FROM profiles p
    WHERE us.user_id = p.user_id
      AND p.subscription_status IS NOT NULL
      AND us.status IS NULL;
  END IF;
END $$;

-- Compute entitlement_active_until for existing rows
UPDATE user_subscriptions
SET entitlement_active_until = compute_entitlement_active_until(
  status,
  trial_ends_at,
  current_period_end,
  3
)
WHERE entitlement_active_until IS NULL
  AND status IS NOT NULL;

-- Set is_primary for existing subscriptions (most recent active one per user)
WITH ranked_subs AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE status 
          WHEN 'active' THEN 1 
          WHEN 'trialing' THEN 2 
          WHEN 'in_grace' THEN 3 
          ELSE 4 
        END,
        subscribed_at DESC NULLS LAST
    ) as rn
  FROM user_subscriptions
  WHERE status IN ('trialing', 'active', 'in_grace')
)
UPDATE user_subscriptions us
SET is_primary = TRUE
FROM ranked_subs rs
WHERE us.id = rs.id
  AND rs.rn = 1
  AND us.is_primary IS NULL OR us.is_primary = FALSE;

-- Verification
DO $$
DECLARE
  audit_table_exists BOOLEAN;
  unclaimed_table_exists BOOLEAN;
  provider_sub_id_col BOOLEAN;
  entitlement_until_col BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'subscription_audit_events'
  ) INTO audit_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'unclaimed_entitlements'
  ) INTO unclaimed_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_subscriptions' 
      AND column_name = 'provider_subscription_id'
  ) INTO provider_sub_id_col;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_subscriptions' 
      AND column_name = 'entitlement_active_until'
  ) INTO entitlement_until_col;
  
  IF audit_table_exists AND unclaimed_table_exists AND provider_sub_id_col AND entitlement_until_col THEN
    RAISE NOTICE '✅ Subscription cancellation system migration successful!';
    RAISE NOTICE '   - user_subscriptions extended (provider_subscription_id, status, entitlement_active_until, is_primary, canceled_at)';
    RAISE NOTICE '   - subscription_audit_events table created';
    RAISE NOTICE '   - unclaimed_entitlements table created';
    RAISE NOTICE '   - Helper functions created (resolve_user_entitlement, compute_entitlement_active_until)';
    RAISE NOTICE '   - Auto-compute triggers installed';
  ELSE
    RAISE WARNING '❌ Migration verification failed';
    RAISE WARNING '   audit_table: %, unclaimed_table: %, provider_id: %, entitlement_until: %', 
      audit_table_exists, unclaimed_table_exists, provider_sub_id_col, entitlement_until_col;
  END IF;
END $$;

-- Show summary
SELECT 
  'user_subscriptions' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE is_primary = TRUE) AS primary_subs,
  COUNT(*) FILTER (WHERE status IN ('trialing', 'active', 'in_grace')) AS active_entitled
FROM user_subscriptions
UNION ALL
SELECT 
  'unclaimed_entitlements',
  COUNT(*),
  COUNT(*) FILTER (WHERE claimed_by_user_id IS NOT NULL),
  COUNT(*) FILTER (WHERE claimed_by_user_id IS NULL)
FROM unclaimed_entitlements
UNION ALL
SELECT 
  'subscription_audit_events',
  COUNT(*),
  COUNT(DISTINCT user_id),
  COUNT(*) FILTER (WHERE event_type LIKE 'cancel%')
FROM subscription_audit_events;
