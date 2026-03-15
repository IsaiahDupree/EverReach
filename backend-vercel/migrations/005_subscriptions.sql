-- Subscription Management Tables
-- Handles RevenueCat webhook data and subscription entitlements

-- ============================================================================
-- subscriptions table - Current subscription status per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User identification
  user_id UUID NOT NULL,              -- Maps to auth.users.id or profiles.id

  -- Subscription details
  plan TEXT NOT NULL DEFAULT 'free',  -- 'free', 'core', 'pro', 'team', 'enterprise'
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'canceled', 'expired'

  -- Payment platform
  source TEXT,                        -- 'app_store', 'play', 'stripe', 'manual'

  -- Trial information
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_duration_days INTEGER DEFAULT 7,

  -- Subscription period
  subscription_started_at TIMESTAMPTZ, -- First time user became paid subscriber
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Cancellation
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- External identifiers
  subscription_id TEXT,               -- RevenueCat/Stripe subscription ID
  customer_id TEXT,                   -- RevenueCat/Stripe customer ID
  product_id TEXT,                    -- Store product ID (e.g., 'com.app.monthly')

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- RLS: Users can read their own subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- entitlements table - Feature access per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User identification
  user_id UUID NOT NULL,

  -- Entitlement details
  entitlement_id TEXT NOT NULL,       -- e.g., 'pro', 'premium_features', 'unlimited_contacts'
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Source
  source TEXT,                        -- 'subscription', 'lifetime', 'trial', 'promotion'

  UNIQUE(user_id, entitlement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_entitlement_id ON entitlements(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_is_active ON entitlements(is_active);
CREATE INDEX IF NOT EXISTS idx_entitlements_expires_at ON entitlements(expires_at);

-- RLS: Users can read their own entitlements
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlements"
  ON entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage entitlements"
  ON entitlements FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- subscription_events table - Audit log of subscription events
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User identification
  user_id UUID,                       -- NULL for events before user mapping

  -- Event details
  event_type TEXT NOT NULL,           -- 'INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', etc.
  product_id TEXT,                    -- Store product ID
  store TEXT,                         -- 'app_store', 'play', 'stripe'
  environment TEXT,                   -- 'PRODUCTION', 'SANDBOX'

  -- Period information
  period_type TEXT,                   -- 'NORMAL', 'TRIAL', 'INTRO'
  plan TEXT,                          -- 'free', 'core', 'pro', etc.
  status TEXT,                        -- 'active', 'trial', 'canceled', 'expired'

  -- Transaction details
  transaction_id TEXT,
  original_transaction_id TEXT,

  -- Revenue tracking
  revenue DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',

  -- Entitlements
  entitlement_ids TEXT[],             -- Array of entitlement IDs granted

  -- Trial conversion tracking
  is_trial_conversion BOOLEAN DEFAULT false,

  -- Raw webhook payload for debugging
  raw_payload JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_transaction_id ON subscription_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_store ON subscription_events(store);
CREATE INDEX IF NOT EXISTS idx_subscription_events_environment ON subscription_events(environment);

-- RLS: Users can read their own events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription events"
  ON subscription_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
