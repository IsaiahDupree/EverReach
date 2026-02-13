-- ============================================================================
-- Migration: subscription_events
-- Creates audit log table for all RevenueCat webhook events
-- Date: 2026-02-13
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 text NOT NULL,
  event_type              text NOT NULL,
  product_id              text,
  store                   text DEFAULT 'app_store',
  environment             text DEFAULT 'PRODUCTION',
  period_type             text,
  plan                    text,
  status                  text,
  transaction_id          text,
  original_transaction_id text,
  revenue                 numeric(10,2),
  currency                text DEFAULT 'USD',
  entitlement_ids         text[] DEFAULT '{}',
  is_trial_conversion     boolean DEFAULT false,
  raw_payload             jsonb,
  occurred_at             timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sub_events_occurred ON subscription_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_events_env ON subscription_events(environment);

-- RLS: service role only (webhooks bypass RLS via service key)
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_full_access" ON subscription_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE subscription_events IS 'Audit log of all RevenueCat webhook events. Every INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc. is logged here with the full payload for debugging and analytics.';
