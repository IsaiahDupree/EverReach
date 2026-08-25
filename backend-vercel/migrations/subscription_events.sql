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
  provider_fact_canonical boolean NOT NULL DEFAULT true,
  occurred_at             timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Older installations can contain repeated RevenueCat deliveries from before
-- provider-fact idempotency existed. Keep every raw audit row, mark exactly one
-- deterministic row per provider fact as canonical, and enforce uniqueness only
-- for canonical rows. New webhook inserts default to canonical and therefore
-- still receive a 23505 duplicate signal without deleting audit history.
ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS provider_fact_canonical boolean;

WITH ranked_provider_facts AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY transaction_id, event_type
      ORDER BY created_at ASC, id ASC
    ) AS provider_fact_rank
  FROM public.subscription_events
  WHERE transaction_id IS NOT NULL
)
UPDATE public.subscription_events AS event
SET provider_fact_canonical = ranked.provider_fact_rank = 1
FROM ranked_provider_facts AS ranked
WHERE event.id = ranked.id;

UPDATE public.subscription_events
SET provider_fact_canonical = true
WHERE transaction_id IS NULL AND provider_fact_canonical IS NULL;

ALTER TABLE public.subscription_events
  ALTER COLUMN provider_fact_canonical SET DEFAULT true,
  ALTER COLUMN provider_fact_canonical SET NOT NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sub_events_occurred ON subscription_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_events_env ON subscription_events(environment);
DROP INDEX IF EXISTS public.subscription_events_provider_fact_unique;
CREATE UNIQUE INDEX subscription_events_provider_fact_unique
  ON public.subscription_events(transaction_id, event_type)
  WHERE transaction_id IS NOT NULL AND provider_fact_canonical;

-- RLS: service role only (webhooks bypass RLS via service key)
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON subscription_events;
DROP POLICY IF EXISTS "subscription_events_service_role_only" ON subscription_events;
REVOKE ALL ON subscription_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON subscription_events TO service_role;

CREATE POLICY "subscription_events_service_role_only" ON subscription_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE subscription_events IS 'Audit log of all RevenueCat webhook events. Every INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc. is logged here with the full payload for debugging and analytics.';
COMMENT ON COLUMN public.subscription_events.provider_fact_canonical IS
  'True for the one idempotency-authoritative row per transaction/event pair; false preserves legacy duplicate audit rows.';
