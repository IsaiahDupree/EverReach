-- ============================================================================
-- RevenueCat Subscriptions & Webhook Integration
-- Migration: 20251026172100
-- ============================================================================

-- 1. User Subscriptions Table
-- Stores subscription state mirrored from RevenueCat
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- RevenueCat identifiers
  original_transaction_id TEXT NOT NULL, -- iOS: original transaction ID, Android: purchase token
  transaction_id TEXT NOT NULL,          -- Current transaction ID
  product_id TEXT NOT NULL,              -- RC product ID (e.g., com.everreach.core.monthly)
  
  -- Subscription state
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'canceled', 'expired', 'refunded')),
  platform TEXT NOT NULL CHECK (platform IN ('app_store', 'play')),
  environment TEXT NOT NULL CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
  
  -- Timing
  purchased_at TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Product details
  period_type TEXT,                      -- TRIAL, NORMAL, INTRO
  presented_offering_id TEXT,
  country_code TEXT,
  
  -- Tracking
  last_event_id TEXT NOT NULL,
  last_event_type TEXT NOT NULL,
  last_event_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, platform),                           -- One active subscription per platform per user
  UNIQUE(original_transaction_id)                      -- Prevent duplicate transaction processing
);

-- 2. RevenueCat Webhook Events Table
-- For idempotency - tracks processed event IDs
CREATE TABLE IF NOT EXISTS revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  product_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_platform ON user_subscriptions(platform, status);
CREATE INDEX IF NOT EXISTS idx_revenuecat_events_user ON revenuecat_webhook_events(app_user_id);
CREATE INDEX IF NOT EXISTS idx_revenuecat_events_created ON revenuecat_webhook_events(created_at);

-- 4. RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can modify subscriptions (via webhook)
CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Only service role can access webhook events
CREATE POLICY "Service role can manage webhook events"
  ON revenuecat_webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Helper Function: Get Active Subscription for User
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  product_id TEXT,
  status TEXT,
  platform TEXT,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  is_trial BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.product_id,
    s.status,
    s.platform,
    s.current_period_end,
    s.trial_ends_at,
    (s.period_type = 'TRIAL') AS is_trial,
    (s.status IN ('trial', 'active', 'canceled') AND s.current_period_end > NOW()) AS is_active
  FROM user_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('trial', 'active', 'canceled')
    AND s.current_period_end > NOW()
  ORDER BY s.current_period_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper Function: Derive Tier from Product ID
CREATE OR REPLACE FUNCTION get_tier_from_product(p_product_id TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Map product IDs to tiers
  IF p_product_id LIKE '%core%' THEN
    RETURN 'core';
  ELSIF p_product_id LIKE '%pro%' THEN
    RETURN 'pro';
  ELSIF p_product_id LIKE '%team%' THEN
    RETURN 'team';
  ELSE
    RETURN 'free';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Cleanup Function: Delete Old Webhook Events (> 48 hours)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM revenuecat_webhook_events
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- 9. Update existing entitlements table (if needed)
-- Add source column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'entitlements' 
          AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE entitlements ADD COLUMN subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
    subs_exists BOOLEAN;
    events_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
    ) INTO subs_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'revenuecat_webhook_events'
    ) INTO events_exists;
    
    IF subs_exists AND events_exists THEN
        RAISE NOTICE '✅ RevenueCat tables created successfully!';
    ELSE
        RAISE EXCEPTION 'Migration verification failed: user_subscriptions=%, revenuecat_webhook_events=%', 
            subs_exists, events_exists;
    END IF;
END $$;
