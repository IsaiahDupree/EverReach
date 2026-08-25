-- Preserve exact ACTP content lineage on first-touch attribution and
-- transactionally enqueue click facts for server-side delivery.

BEGIN;

-- RevenueCat audit facts contain raw webhook bodies. Harden an existing
-- installation without assuming the legacy table is present on a clean test.
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  -- The shared ACTP project also contains a table named subscription_events
  -- whose schema belongs to a different product. Harden RevenueCat audit rows
  -- only when this is the EverReach-shaped table; never add columns or indexes
  -- to an unrelated shared table merely because the relation name matches.
  IF to_regclass('public.subscription_events') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_events'
        AND column_name = 'transaction_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_events'
        AND column_name = 'event_type'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_events'
        AND column_name = 'created_at'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscription_events'
        AND column_name = 'id'
    )
  THEN
    EXECUTE 'ALTER TABLE public.subscription_events '
      || 'ADD COLUMN IF NOT EXISTS provider_fact_canonical BOOLEAN';
    EXECUTE 'WITH ranked_provider_facts AS ('
      || 'SELECT id, row_number() OVER ('
      || 'PARTITION BY transaction_id, event_type '
      || 'ORDER BY created_at ASC, id ASC) AS provider_fact_rank '
      || 'FROM public.subscription_events WHERE transaction_id IS NOT NULL) '
      || 'UPDATE public.subscription_events AS event '
      || 'SET provider_fact_canonical = ranked.provider_fact_rank = 1 '
      || 'FROM ranked_provider_facts AS ranked WHERE event.id = ranked.id';
    EXECUTE 'UPDATE public.subscription_events '
      || 'SET provider_fact_canonical = true '
      || 'WHERE transaction_id IS NULL AND provider_fact_canonical IS NULL';
    EXECUTE 'ALTER TABLE public.subscription_events '
      || 'ALTER COLUMN provider_fact_canonical SET DEFAULT true, '
      || 'ALTER COLUMN provider_fact_canonical SET NOT NULL';
    EXECUTE 'DROP INDEX IF EXISTS public.subscription_events_provider_fact_unique';
    EXECUTE 'CREATE UNIQUE INDEX subscription_events_provider_fact_unique '
      || 'ON public.subscription_events(transaction_id, event_type) '
      || 'WHERE transaction_id IS NOT NULL AND provider_fact_canonical';
    EXECUTE 'COMMENT ON COLUMN public.subscription_events.provider_fact_canonical IS '
      || quote_literal(
        'True for the one idempotency-authoritative row per transaction/event pair; false preserves legacy duplicate audit rows.'
      );
    EXECUTE 'ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY';
    FOR v_policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'subscription_events'
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.subscription_events',
        v_policy.policyname
      );
    END LOOP;
    EXECUTE 'REVOKE ALL ON public.subscription_events FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT, INSERT ON public.subscription_events TO service_role';
    EXECUTE 'CREATE POLICY subscription_events_service_role_only '
      || 'ON public.subscription_events FOR ALL TO service_role '
      || 'USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.attribution (
  -- EverReach authenticates users in its primary Supabase project. This
  -- isolated owned-outcome data plane deliberately stores that externally
  -- verified UUID without requiring a duplicate shared-project auth row.
  user_id UUID PRIMARY KEY,
  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_term TEXT,
  first_utm_content TEXT,
  first_referrer TEXT,
  first_landing_page TEXT,
  content_id TEXT,
  source_id TEXT,
  campaign_id TEXT,
  offer_id TEXT,
  source_platform TEXT,
  touch_token TEXT,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attribution
  ADD COLUMN IF NOT EXISTS content_id TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_id TEXT,
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS touch_token TEXT,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;

-- A clean install must not expose attribution rows if the legacy bootstrap
-- migration has not already enabled RLS. Existing policies remain unchanged.
ALTER TABLE public.attribution ENABLE ROW LEVEL SECURITY;

-- First-touch writes now go through the identity-checked RPC below. The legacy
-- direct write policies would otherwise let a client mutate exact lineage.
DROP POLICY IF EXISTS "Users can upsert own attribution" ON public.attribution;
DROP POLICY IF EXISTS "Users can update own attribution" ON public.attribution;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.attribution
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.attribution.content_id IS
  'Exact ACTP content ID from actp_content_id; never inferred from UTM content.';
COMMENT ON COLUMN public.attribution.source_id IS
  'Exact published source ID from actp_published_id.';
COMMENT ON COLUMN public.attribution.campaign_id IS
  'Exact ACTP campaign ID from actp_campaign_id.';
COMMENT ON COLUMN public.attribution.offer_id IS
  'Exact ACTP offer ID from actp_offer_id.';
COMMENT ON COLUMN public.attribution.source_platform IS
  'Exact source platform supplied with the captured content touch.';
COMMENT ON COLUMN public.attribution.touch_token IS
  'Opaque first-party touch token used as the owned-outcome journey ID.';
COMMENT ON COLUMN public.attribution.captured_at IS
  'Client-observed timestamp for the immutable first touch.';

CREATE OR REPLACE FUNCTION public.deny_attribution_lineage_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content_id IS DISTINCT FROM OLD.content_id
    OR NEW.source_id IS DISTINCT FROM OLD.source_id
    OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
    OR NEW.offer_id IS DISTINCT FROM OLD.offer_id
    OR NEW.source_platform IS DISTINCT FROM OLD.source_platform
    OR NEW.touch_token IS DISTINCT FROM OLD.touch_token
    OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
  THEN
    RAISE EXCEPTION 'immutable attribution lineage';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attribution_lineage_immutable ON public.attribution;
CREATE TRIGGER attribution_lineage_immutable
  BEFORE UPDATE ON public.attribution
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_attribution_lineage_change();

CREATE INDEX IF NOT EXISTS idx_attribution_content_id
  ON public.attribution(content_id);
CREATE INDEX IF NOT EXISTS idx_attribution_touch_token
  ON public.attribution(touch_token)
  WHERE touch_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.anonymous_attribution_touches (
  touch_token TEXT PRIMARY KEY CHECK (
    btrim(touch_token) <> '' AND char_length(touch_token) <= 256
  ),
  content_id TEXT NOT NULL CHECK (
    btrim(content_id) <> '' AND char_length(content_id) <= 512
  ),
  source_id TEXT NOT NULL CHECK (
    btrim(source_id) <> '' AND char_length(source_id) <= 512
  ),
  campaign_id TEXT NOT NULL CHECK (
    btrim(campaign_id) <> '' AND char_length(campaign_id) <= 512
  ),
  offer_id TEXT NOT NULL CHECK (
    btrim(offer_id) <> '' AND char_length(offer_id) <= 512
  ),
  source_platform TEXT NOT NULL CHECK (
    btrim(source_platform) <> '' AND char_length(source_platform) <= 100
  ),
  captured_at TIMESTAMPTZ NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,
  claimed_user_id UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (claimed_user_id IS NULL AND claimed_at IS NULL)
    OR (claimed_user_id IS NOT NULL AND claimed_at IS NOT NULL)
  )
);

ALTER TABLE public.anonymous_attribution_touches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.anonymous_attribution_touches
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.anonymous_attribution_touches TO service_role;

CREATE INDEX IF NOT EXISTS idx_anonymous_attribution_source
  ON public.anonymous_attribution_touches(
    content_id, source_platform, source_id, captured_at
  );

CREATE TABLE IF NOT EXISTS public.attribution_user_journeys (
  user_id UUID PRIMARY KEY,
  touch_token TEXT NOT NULL UNIQUE REFERENCES public.anonymous_attribution_touches(
    touch_token
  ) ON DELETE RESTRICT,
  content_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(btrim(content_id)) BETWEEN 1 AND 512),
  CHECK (char_length(btrim(source_id)) BETWEEN 1 AND 512),
  CHECK (char_length(btrim(campaign_id)) BETWEEN 1 AND 512),
  CHECK (char_length(btrim(offer_id)) BETWEEN 1 AND 512),
  CHECK (char_length(btrim(source_platform)) BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.attribution_user_journeys IS
  'Append-only verified exact journey per user, including legacy UTM-only users.';

ALTER TABLE public.attribution_user_journeys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attribution_user_journeys
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.attribution_user_journeys TO service_role;

CREATE TABLE IF NOT EXISTS public.attribution_publication_manifests (
  publication_id TEXT PRIMARY KEY CHECK (
    btrim(publication_id) <> '' AND char_length(publication_id) <= 256
  ),
  claim_nonce TEXT NOT NULL UNIQUE CHECK (
    btrim(claim_nonce) <> '' AND char_length(claim_nonce) <= 256
  ),
  content_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(content_id) BETWEEN 1 AND 512),
  CHECK (char_length(source_id) BETWEEN 1 AND 512),
  CHECK (char_length(campaign_id) BETWEEN 1 AND 512),
  CHECK (char_length(offer_id) BETWEEN 1 AND 512),
  CHECK (char_length(source_platform) BETWEEN 1 AND 100)
);

CREATE TABLE IF NOT EXISTS public.anonymous_touch_rate_limits (
  requester_hash TEXT NOT NULL CHECK (char_length(requester_hash) = 64),
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (requester_hash, window_start)
);

ALTER TABLE public.attribution_publication_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_touch_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.attribution_publication_manifests,
  public.anonymous_touch_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.attribution_publication_manifests TO service_role;

CREATE TABLE IF NOT EXISTS public.owned_outcome_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract TEXT NOT NULL DEFAULT 'owned_attribution_event_v1'
    CHECK (contract = 'owned_attribution_event_v1'),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (char_length(idempotency_key) <= 300),
  event_type TEXT NOT NULL DEFAULT 'click'
    CHECK (event_type IN ('click', 'install', 'trial', 'purchase')),
  user_id UUID,
  content_id TEXT NOT NULL CHECK (
    btrim(content_id) <> '' AND char_length(content_id) <= 512
  ),
  source_id TEXT NOT NULL CHECK (
    btrim(source_id) <> '' AND char_length(source_id) <= 512
  ),
  campaign_id TEXT NOT NULL CHECK (
    btrim(campaign_id) <> '' AND char_length(campaign_id) <= 512
  ),
  offer_id TEXT NOT NULL CHECK (
    btrim(offer_id) <> '' AND char_length(offer_id) <= 512
  ),
  source_platform TEXT NOT NULL CHECK (
    btrim(source_platform) <> '' AND char_length(source_platform) <= 100
  ),
  touch_token TEXT NOT NULL CHECK (
    btrim(touch_token) <> '' AND char_length(touch_token) <= 256
  ),
  provider_event_id TEXT NOT NULL CHECK (
    btrim(provider_event_id) <> '' AND char_length(provider_event_id) <= 256
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_type = 'click' OR user_id IS NOT NULL),
  CHECK ((payload->>'contract') IS NOT DISTINCT FROM contract),
  CHECK ((payload->>'idempotency_key') IS NOT DISTINCT FROM idempotency_key),
  CHECK ((payload->>'event_type') IS NOT DISTINCT FROM event_type),
  CHECK ((payload->>'journey_id') IS NOT DISTINCT FROM touch_token),
  CHECK ((payload->>'provider_event_id') IS NOT DISTINCT FROM provider_event_id),
  CHECK (
    (payload->'attribution'->>'content_id') IS NOT DISTINCT FROM content_id
  ),
  CHECK (
    (payload->'attribution'->>'source_id') IS NOT DISTINCT FROM source_id
  ),
  CHECK (
    (payload->'attribution'->>'campaign_id') IS NOT DISTINCT FROM campaign_id
  ),
  CHECK (
    (payload->'attribution'->>'offer_id') IS NOT DISTINCT FROM offer_id
  ),
  CHECK (
    (payload->'attribution'->>'source_platform')
      IS NOT DISTINCT FROM source_platform
  ),
  CHECK ((payload->>'occurred_at')::TIMESTAMPTZ = occurred_at)
);

COMMENT ON TABLE public.owned_outcome_outbox IS
  'Append-only, server-readable owned outcome facts awaiting delivery.';
COMMENT ON COLUMN public.owned_outcome_outbox.payload IS
  'Complete owned_attribution_event_v1 request body, forwarded unchanged.';

CREATE INDEX IF NOT EXISTS idx_owned_outcome_outbox_created
  ON public.owned_outcome_outbox(created_at, id);
CREATE INDEX IF NOT EXISTS idx_owned_outcome_outbox_content
  ON public.owned_outcome_outbox(
    content_id, campaign_id, offer_id, source_platform, source_id, occurred_at
  );
CREATE INDEX IF NOT EXISTS idx_owned_outcome_outbox_journey
  ON public.owned_outcome_outbox(touch_token, event_type, occurred_at);

CREATE TABLE IF NOT EXISTS public.owned_retention_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract TEXT NOT NULL DEFAULT 'owned_retention_sample_v1'
    CHECK (contract = 'owned_retention_sample_v1'),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    btrim(idempotency_key) <> '' AND char_length(idempotency_key) <= 300
  ),
  measurement_id TEXT NOT NULL CHECK (
    btrim(measurement_id) <> '' AND char_length(measurement_id) <= 300
  ),
  content_id TEXT NOT NULL CHECK (char_length(btrim(content_id)) BETWEEN 1 AND 512),
  source_id TEXT NOT NULL CHECK (char_length(btrim(source_id)) BETWEEN 1 AND 512),
  campaign_id TEXT NOT NULL CHECK (char_length(btrim(campaign_id)) BETWEEN 1 AND 512),
  offer_id TEXT NOT NULL CHECK (char_length(btrim(offer_id)) BETWEEN 1 AND 512),
  source_platform TEXT NOT NULL CHECK (
    char_length(btrim(source_platform)) BETWEEN 1 AND 100
  ),
  journey_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  elapsed_ms BIGINT NOT NULL CHECK (elapsed_ms >= 0),
  retained_count BIGINT NOT NULL CHECK (retained_count >= 0),
  sample_size BIGINT NOT NULL CHECK (sample_size >= 1),
  retained_percent NUMERIC NOT NULL CHECK (
    retained_percent >= 0 AND retained_percent <= 100
  ),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (retained_count <= sample_size),
  CHECK (
    retained_percent = round((retained_count::NUMERIC * 100) / sample_size, 6)
  ),
  CHECK ((payload->>'contract') IS NOT DISTINCT FROM contract),
  CHECK ((payload->>'idempotency_key') IS NOT DISTINCT FROM idempotency_key),
  CHECK ((payload->>'measurement_id') IS NOT DISTINCT FROM measurement_id),
  CHECK ((payload->>'sample_size')::BIGINT = sample_size),
  CHECK ((payload->>'elapsed_ms')::BIGINT = elapsed_ms),
  CHECK ((payload->>'retained_percent')::NUMERIC = retained_percent),
  CHECK ((payload->>'journey_id') IS NOT DISTINCT FROM journey_id),
  CHECK ((payload->>'observed_at')::TIMESTAMPTZ = observed_at),
  CHECK ((payload->'attribution'->>'content_id') IS NOT DISTINCT FROM content_id),
  CHECK ((payload->'attribution'->>'source_id') IS NOT DISTINCT FROM source_id),
  CHECK ((payload->'attribution'->>'campaign_id') IS NOT DISTINCT FROM campaign_id),
  CHECK ((payload->'attribution'->>'offer_id') IS NOT DISTINCT FROM offer_id),
  CHECK (
    (payload->'attribution'->>'source_platform') IS NOT DISTINCT FROM source_platform
  )
);

COMMENT ON TABLE public.owned_retention_outbox IS
  'Append-only real cohort retention measurements with an explicit denominator.';

CREATE INDEX IF NOT EXISTS idx_owned_retention_outbox_created
  ON public.owned_retention_outbox(created_at, id);

ALTER TABLE public.owned_retention_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.owned_retention_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.owned_retention_outbox TO service_role;

CREATE TABLE IF NOT EXISTS public.owned_outcome_reconciliation (
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'revenuecat')),
  provider_event_id TEXT NOT NULL CHECK (
    char_length(btrim(provider_event_id)) BETWEEN 1 AND 256
  ),
  event_type TEXT NOT NULL CHECK (event_type IN ('trial', 'purchase')),
  subject_id TEXT NOT NULL CHECK (char_length(btrim(subject_id)) BETWEEN 1 AND 512),
  resolved_user_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL CHECK (
    jsonb_typeof(metadata) = 'object' AND octet_length(metadata::TEXT) <= 32768
  ),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'quarantined')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_event_id, event_type),
  CHECK (
    (status IN ('pending', 'quarantined') AND resolved_at IS NULL)
    OR (status = 'resolved' AND resolved_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.owned_outcome_reconciliation IS
  'Durable provider inbox for attributable facts awaiting user/lineage resolution.';

ALTER TABLE public.owned_outcome_reconciliation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.owned_outcome_reconciliation
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.owned_outcome_reconciliation TO service_role;
CREATE INDEX IF NOT EXISTS idx_owned_outcome_reconciliation_pending
  ON public.owned_outcome_reconciliation(status, updated_at, created_at);

CREATE TABLE IF NOT EXISTS public.owned_delivery_state (
  stream TEXT NOT NULL CHECK (stream IN ('event', 'retention')),
  outbox_id UUID NOT NULL,
  reserved_by TEXT,
  reserved_until TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  target_status TEXT,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream, outbox_id),
  CHECK (
    delivered_at IS NULL
    OR target_status IN ('created', 'idempotent_replay')
  )
);

ALTER TABLE public.owned_delivery_state
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ;

ALTER TABLE public.owned_delivery_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.owned_delivery_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.owned_delivery_state TO service_role;

CREATE INDEX IF NOT EXISTS idx_owned_delivery_pending
  ON public.owned_delivery_state(stream, delivered_at, reserved_until, updated_at);

ALTER TABLE public.owned_outcome_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.owned_outcome_outbox FROM PUBLIC;
REVOKE ALL ON TABLE public.owned_outcome_outbox FROM anon, authenticated;
GRANT SELECT ON TABLE public.owned_outcome_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.deny_owned_outcome_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'immutable row';
END;
$$;

DROP TRIGGER IF EXISTS owned_outcome_outbox_immutable
  ON public.owned_outcome_outbox;
CREATE TRIGGER owned_outcome_outbox_immutable
  BEFORE UPDATE OR DELETE ON public.owned_outcome_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_owned_outcome_change();

DROP TRIGGER IF EXISTS owned_retention_outbox_immutable
  ON public.owned_retention_outbox;
CREATE TRIGGER owned_retention_outbox_immutable
  BEFORE UPDATE OR DELETE ON public.owned_retention_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_owned_outcome_change();

CREATE FUNCTION public.reserve_owned_outcome_delivery(
  p_worker TEXT,
  p_reservation_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_outbox public.owned_outcome_outbox%ROWTYPE;
  v_attempt_count INTEGER;
BEGIN
  IF NULLIF(btrim(p_worker), '') IS NULL OR char_length(p_worker) > 200 THEN
    RAISE EXCEPTION 'delivery worker is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_reservation_seconds < 5 OR p_reservation_seconds > 3600 THEN
    RAISE EXCEPTION 'delivery reservation must be from 5 to 3600 seconds'
      USING ERRCODE = '22023';
  END IF;

  SELECT o.* INTO v_outbox
  FROM public.owned_outcome_outbox o
  LEFT JOIN public.owned_delivery_state d
    ON d.stream = 'event' AND d.outbox_id = o.id
  WHERE d.delivered_at IS NULL
    AND (d.reserved_until IS NULL OR d.reserved_until <= clock_timestamp())
  ORDER BY o.created_at ASC, o.id ASC
  LIMIT 1
  FOR UPDATE OF o SKIP LOCKED;

  IF v_outbox.id IS NULL THEN
    RETURN jsonb_build_object('status', 'empty');
  END IF;

  INSERT INTO public.owned_delivery_state (
    stream, outbox_id, reserved_by, reserved_until, attempt_count,
    last_error, updated_at
  ) VALUES (
    'event', v_outbox.id, btrim(p_worker),
    clock_timestamp() + make_interval(secs => p_reservation_seconds),
    1, NULL, clock_timestamp()
  )
  ON CONFLICT (stream, outbox_id) DO UPDATE SET
    reserved_by = EXCLUDED.reserved_by,
    reserved_until = EXCLUDED.reserved_until,
    attempt_count = public.owned_delivery_state.attempt_count + 1,
    last_error = NULL,
    updated_at = EXCLUDED.updated_at
  WHERE public.owned_delivery_state.delivered_at IS NULL
  RETURNING attempt_count INTO v_attempt_count;

  RETURN jsonb_build_object(
    'status', 'reserved',
    'stream', 'event',
    'outbox_id', v_outbox.id,
    'attempt_count', v_attempt_count,
    'payload', v_outbox.payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_owned_outcome_delivery(
  TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_owned_outcome_delivery(
  TEXT, INTEGER
) TO service_role;

CREATE FUNCTION public.take_owned_delivery(
  p_stream TEXT,
  p_worker TEXT,
  p_hold_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_outbox_id UUID;
  v_payload JSONB;
  v_attempt_count INTEGER;
BEGIN
  IF p_stream NOT IN ('event', 'retention') THEN
    RAISE EXCEPTION 'delivery stream is invalid' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(p_worker), '') IS NULL OR char_length(p_worker) > 200 THEN
    RAISE EXCEPTION 'delivery worker is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_hold_seconds < 5 OR p_hold_seconds > 3600 THEN
    RAISE EXCEPTION 'delivery hold must be from 5 to 3600 seconds'
      USING ERRCODE = '22023';
  END IF;

  IF p_stream = 'event' THEN
    SELECT o.id, o.payload INTO v_outbox_id, v_payload
    FROM public.owned_outcome_outbox o
    LEFT JOIN public.owned_delivery_state d
      ON d.stream = p_stream AND d.outbox_id = o.id
    WHERE d.delivered_at IS NULL
      AND d.dead_lettered_at IS NULL
      AND (d.retry_after IS NULL OR d.retry_after <= clock_timestamp())
    ORDER BY o.created_at ASC, o.id ASC
    LIMIT 1
    FOR UPDATE OF o SKIP LOCKED;
  ELSE
    SELECT o.id, o.payload INTO v_outbox_id, v_payload
    FROM public.owned_retention_outbox o
    LEFT JOIN public.owned_delivery_state d
      ON d.stream = p_stream AND d.outbox_id = o.id
    WHERE d.delivered_at IS NULL
      AND d.dead_lettered_at IS NULL
      AND (d.retry_after IS NULL OR d.retry_after <= clock_timestamp())
    ORDER BY o.created_at ASC, o.id ASC
    LIMIT 1
    FOR UPDATE OF o SKIP LOCKED;
  END IF;

  IF v_outbox_id IS NULL THEN
    RETURN jsonb_build_object('status', 'empty');
  END IF;

  INSERT INTO public.owned_delivery_state (
    stream, outbox_id, worker_id, retry_after, attempt_count,
    last_error, updated_at
  ) VALUES (
    p_stream, v_outbox_id, btrim(p_worker),
    clock_timestamp() + make_interval(secs => p_hold_seconds),
    1, NULL, clock_timestamp()
  )
  ON CONFLICT (stream, outbox_id) DO UPDATE SET
    worker_id = EXCLUDED.worker_id,
    retry_after = EXCLUDED.retry_after,
    attempt_count = public.owned_delivery_state.attempt_count + 1,
    last_error = NULL,
    updated_at = EXCLUDED.updated_at
  WHERE public.owned_delivery_state.delivered_at IS NULL
  RETURNING attempt_count INTO v_attempt_count;

  RETURN jsonb_build_object(
    'status', 'taken',
    'stream', p_stream,
    'outbox_id', v_outbox_id,
    'attempt_count', v_attempt_count,
    'payload', v_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.take_owned_delivery(
  TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_owned_delivery(
  TEXT, TEXT, INTEGER
) TO service_role;

CREATE FUNCTION public.finish_owned_delivery(
  p_stream TEXT,
  p_outbox_id UUID,
  p_worker TEXT,
  p_result TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_changed INTEGER;
BEGIN
  IF p_stream NOT IN ('event', 'retention')
    OR p_result NOT IN ('created', 'idempotent_replay')
  THEN
    RAISE EXCEPTION 'delivery completion is invalid'
      USING ERRCODE = '22023';
  END IF;
  v_changed := 0;
  INSERT INTO public.owned_delivery_state (
    stream, outbox_id, attempt_count, delivered_at,
    U&"\0074\0061\0072\0067\0065\0074\005f\0073\0074\0061\0074\0075\0073",
    updated_at
  )
  SELECT p_stream, p_outbox_id, attempt_count, clock_timestamp(),
         p_result, clock_timestamp()
  FROM public.owned_delivery_state
  WHERE stream = p_stream AND outbox_id = p_outbox_id
    AND delivered_at IS NULL AND worker_id = btrim(p_worker)
    AND retry_after > clock_timestamp()
  ON CONFLICT (stream, outbox_id) DO UPDATE SET
    delivered_at = EXCLUDED.delivered_at,
    U&"\0074\0061\0072\0067\0065\0074\005f\0073\0074\0061\0074\0075\0073" = EXCLUDED.U&"\0074\0061\0072\0067\0065\0074\005f\0073\0074\0061\0074\0075\0073",
    worker_id = NULL, retry_after = NULL, last_error = NULL,
    updated_at = EXCLUDED.updated_at
  RETURNING 1 INTO v_changed;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'delivery completion rejected' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('status', 'delivered', 'outbox_id', p_outbox_id);
END;
$$;

REVOKE ALL ON FUNCTION public.finish_owned_delivery(
  TEXT, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_owned_delivery(
  TEXT, UUID, TEXT, TEXT
) TO service_role;

CREATE FUNCTION public.record_owned_delivery_error(
  p_stream TEXT,
  p_outbox_id UUID,
  p_worker TEXT,
  p_error TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_changed INTEGER := 0;
BEGIN
  INSERT INTO public.owned_delivery_state (
    stream, outbox_id, attempt_count, last_error, updated_at
  )
  SELECT p_stream, p_outbox_id, attempt_count,
         left(COALESCE(NULLIF(btrim(p_error), ''), 'delivery failed'), 1000),
         clock_timestamp()
  FROM public.owned_delivery_state
  WHERE stream = p_stream AND outbox_id = p_outbox_id
    AND delivered_at IS NULL AND worker_id = btrim(p_worker)
  ON CONFLICT (stream, outbox_id) DO UPDATE SET
    worker_id = NULL,
    retry_after = CASE
      WHEN public.owned_delivery_state.attempt_count >= 12 THEN 'infinity'::TIMESTAMPTZ
      ELSE clock_timestamp() + make_interval(
        secs => LEAST(3600, (5 * power(2, LEAST(
          public.owned_delivery_state.attempt_count, 9
        )))::INTEGER)
      )
    END,
    dead_lettered_at = CASE
      WHEN public.owned_delivery_state.attempt_count >= 12 THEN clock_timestamp()
      ELSE NULL
    END,
    last_error = EXCLUDED.last_error, updated_at = EXCLUDED.updated_at
  RETURNING 1 INTO v_changed;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'delivery error record rejected' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('status', 'pending', 'outbox_id', p_outbox_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_owned_delivery_error(
  TEXT, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_owned_delivery_error(
  TEXT, UUID, TEXT, TEXT
) TO service_role;

CREATE FUNCTION public.owned_delivery_health()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'status', 'ok',
    'event_total', (SELECT count(*) FROM public.owned_outcome_outbox),
    'event_delivered', (
      SELECT count(*) FROM public.owned_delivery_state
      WHERE stream = 'event' AND delivered_at IS NOT NULL
    ),
    'retention_total', (SELECT count(*) FROM public.owned_retention_outbox),
    'retention_delivered', (
      SELECT count(*) FROM public.owned_delivery_state
      WHERE stream = 'retention' AND delivered_at IS NOT NULL
    ),
    'delayed', (
      SELECT count(*) FROM public.owned_delivery_state
      WHERE delivered_at IS NULL AND dead_lettered_at IS NULL
        AND retry_after > clock_timestamp()
    ),
    'dead_lettered', (
      SELECT count(*) FROM public.owned_delivery_state
      WHERE dead_lettered_at IS NOT NULL
    ),
    'provider_facts_pending', (
      SELECT count(*) FROM public.owned_outcome_reconciliation
      WHERE status = 'pending'
    ),
    'checked_at', clock_timestamp()
  );
$$;

REVOKE ALL ON FUNCTION public.owned_delivery_health()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owned_delivery_health() TO service_role;

CREATE OR REPLACE FUNCTION public.protect_anonymous_attribution_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.touch_token IS DISTINCT FROM OLD.touch_token
    OR NEW.content_id IS DISTINCT FROM OLD.content_id
    OR NEW.source_id IS DISTINCT FROM OLD.source_id
    OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
    OR NEW.offer_id IS DISTINCT FROM OLD.offer_id
    OR NEW.source_platform IS DISTINCT FROM OLD.source_platform
    OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
    OR NEW.utm_source IS DISTINCT FROM OLD.utm_source
    OR NEW.utm_medium IS DISTINCT FROM OLD.utm_medium
    OR NEW.utm_campaign IS DISTINCT FROM OLD.utm_campaign
    OR NEW.utm_term IS DISTINCT FROM OLD.utm_term
    OR NEW.utm_content IS DISTINCT FROM OLD.utm_content
    OR NEW.referrer IS DISTINCT FROM OLD.referrer
    OR NEW.landing_page IS DISTINCT FROM OLD.landing_page
    OR (
      OLD.claimed_user_id IS NOT NULL
      AND NEW.claimed_user_id IS DISTINCT FROM OLD.claimed_user_id
    )
    OR (OLD.claimed_at IS NOT NULL AND NEW.claimed_at IS DISTINCT FROM OLD.claimed_at)
    OR (OLD.claimed_user_id IS NULL AND NEW.claimed_user_id IS NULL
      AND NEW.claimed_at IS NOT NULL)
  THEN
    RAISE EXCEPTION 'immutable anonymous attribution touch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymous_attribution_touch_immutable
  ON public.anonymous_attribution_touches;
CREATE TRIGGER anonymous_attribution_touch_immutable
  BEFORE UPDATE OR DELETE ON public.anonymous_attribution_touches
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_anonymous_attribution_touch();

DROP TRIGGER IF EXISTS attribution_user_journey_immutable
  ON public.attribution_user_journeys;
CREATE TRIGGER attribution_user_journey_immutable
  BEFORE UPDATE OR DELETE ON public.attribution_user_journeys
  FOR EACH ROW
  EXECUTE FUNCTION public.deny_owned_outcome_change();

CREATE FUNCTION public.register_attribution_publication(
  p_publication_id TEXT,
  p_claim_nonce TEXT,
  p_content_id TEXT,
  p_source_id TEXT,
  p_campaign_id TEXT,
  p_offer_id TEXT,
  p_source_platform TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
BEGIN
  IF p_expires_at IS NULL OR p_expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'publication expiry must be in the future'
      USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.attribution_publication_manifests (
    publication_id, claim_nonce, content_id, source_id, campaign_id,
    offer_id, source_platform, expires_at
  ) VALUES (
    btrim(p_publication_id), btrim(p_claim_nonce), btrim(p_content_id),
    btrim(p_source_id), btrim(p_campaign_id), btrim(p_offer_id),
    lower(btrim(p_source_platform)), p_expires_at
  );
  RETURN jsonb_build_object(
    'status', 'registered',
    'publication_id', btrim(p_publication_id),
    'claim_nonce', btrim(p_claim_nonce)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_attribution_publication(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_attribution_publication(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

CREATE FUNCTION public.create_anonymous_attribution_touch(
  p_publication_id TEXT,
  p_claim_nonce TEXT,
  p_requester_hash TEXT,
  p_content_id TEXT,
  p_source_id TEXT,
  p_campaign_id TEXT,
  p_offer_id TEXT,
  p_source_platform TEXT,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_touch_token TEXT := 'touch_' || gen_random_uuid()::TEXT;
  v_captured_at TIMESTAMPTZ := clock_timestamp();
  v_idempotency_key TEXT;
  v_payload JSONB;
  v_outbox_id UUID;
  v_manifest public.attribution_publication_manifests%ROWTYPE;
  v_request_count INTEGER;
BEGIN
  IF NULLIF(btrim(p_content_id), '') IS NULL
    OR NULLIF(btrim(p_source_id), '') IS NULL
    OR NULLIF(btrim(p_campaign_id), '') IS NULL
    OR NULLIF(btrim(p_offer_id), '') IS NULL
    OR NULLIF(btrim(p_source_platform), '') IS NULL
  THEN
    RAISE EXCEPTION 'all exact anonymous attribution dimensions are required'
      USING ERRCODE = '22023';
  END IF;

  IF p_requester_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'requester hash is invalid' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_manifest
  FROM public.attribution_publication_manifests
  WHERE publication_id = p_publication_id
    AND claim_nonce = p_claim_nonce
    AND active = TRUE
    AND expires_at > clock_timestamp();
  IF v_manifest.publication_id IS NULL
    OR v_manifest.content_id <> btrim(p_content_id)
    OR v_manifest.source_id <> btrim(p_source_id)
    OR v_manifest.campaign_id <> btrim(p_campaign_id)
    OR v_manifest.offer_id <> btrim(p_offer_id)
    OR v_manifest.source_platform <> lower(btrim(p_source_platform))
  THEN
    RAISE EXCEPTION 'publication manifest is not registered for this attribution'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.anonymous_touch_rate_limits (
    requester_hash, window_start, request_count
  ) VALUES (
    p_requester_hash, date_trunc('minute', clock_timestamp()), 1
  )
  ON CONFLICT (requester_hash, window_start) DO UPDATE
  SET request_count = public.anonymous_touch_rate_limits.request_count + 1
  RETURNING request_count INTO v_request_count;
  IF v_request_count > 20 THEN
    RAISE EXCEPTION 'anonymous attribution touch rate limit exceeded'
      USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.anonymous_attribution_touches (
    touch_token, content_id, source_id, campaign_id, offer_id,
    source_platform, captured_at, utm_source, utm_medium, utm_campaign,
    utm_term, utm_content, referrer, landing_page
  ) VALUES (
    v_touch_token, btrim(p_content_id), btrim(p_source_id),
    btrim(p_campaign_id), btrim(p_offer_id), btrim(p_source_platform),
    v_captured_at, NULLIF(btrim(p_utm_source), ''),
    NULLIF(btrim(p_utm_medium), ''), NULLIF(btrim(p_utm_campaign), ''),
    NULLIF(btrim(p_utm_term), ''), NULLIF(btrim(p_utm_content), ''),
    NULLIF(btrim(p_referrer), ''), NULLIF(btrim(p_landing_page), '')
  );

  v_idempotency_key := 'everreach:click:' || v_touch_token;
  v_payload := jsonb_build_object(
    'contract', 'owned_attribution_event_v1',
    'idempotency_key', v_idempotency_key,
    'event_type', 'click',
    'attribution', jsonb_build_object(
      'content_id', btrim(p_content_id),
      'campaign_id', btrim(p_campaign_id),
      'offer_id', btrim(p_offer_id),
      'source_platform', btrim(p_source_platform),
      'source_id', btrim(p_source_id)
    ),
    'journey_id', v_touch_token,
    'occurred_at', to_char(
      v_captured_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'provider_event_id', v_touch_token,
    'metadata', jsonb_build_object('producer', 'everreach_anonymous_landing')
  );

  INSERT INTO public.owned_outcome_outbox (
    contract, idempotency_key, event_type, user_id, content_id, source_id,
    campaign_id, offer_id, source_platform, touch_token, provider_event_id,
    occurred_at, payload
  ) VALUES (
    'owned_attribution_event_v1', v_idempotency_key, 'click', NULL,
    btrim(p_content_id), btrim(p_source_id), btrim(p_campaign_id),
    btrim(p_offer_id), btrim(p_source_platform), v_touch_token,
    v_touch_token, v_captured_at, v_payload
  ) RETURNING id INTO v_outbox_id;

  RETURN jsonb_build_object(
    'touch_token', v_touch_token,
    'captured_at', v_captured_at,
    'outbox_event_id', v_outbox_id,
    'outbox_status', 'queued'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_anonymous_attribution_touch(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_anonymous_attribution_touch(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

CREATE FUNCTION public.enqueue_owned_outcome_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_provider_event_id TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_attribution public.attribution%ROWTYPE;
  v_user_journey public.attribution_user_journeys%ROWTYPE;
  v_event_type TEXT := lower(NULLIF(btrim(p_event_type), ''));
  v_provider_event_id TEXT := NULLIF(btrim(p_provider_event_id), '');
  v_idempotency_key TEXT;
  v_payload JSONB;
  v_outbox_id UUID;
  v_outbox_inserted BOOLEAN := FALSE;
  v_existing public.owned_outcome_outbox%ROWTYPE;
  v_missing_dimensions JSONB;
BEGIN
  IF v_event_type IS NULL OR v_event_type NOT IN (
    'click', 'install', 'trial', 'purchase'
  ) THEN
    RAISE EXCEPTION 'unsupported owned outcome event type'
      USING ERRCODE = '22023';
  END IF;
  IF v_provider_event_id IS NULL OR char_length(v_provider_event_id) > 256 THEN
    RAISE EXCEPTION 'provider_event_id must be 1 to 256 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_occurred_at IS NULL THEN
    RAISE EXCEPTION 'occurred_at is required' USING ERRCODE = '22023';
  END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object'
    OR octet_length(p_metadata::TEXT) > 32768
  THEN
    RAISE EXCEPTION 'metadata must be an object no larger than 32768 bytes'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_attribution
  FROM public.attribution
  WHERE user_id = p_user_id;

  SELECT * INTO v_user_journey
  FROM public.attribution_user_journeys
  WHERE user_id = p_user_id;
  IF v_user_journey.user_id IS NOT NULL THEN
    v_attribution.user_id := v_user_journey.user_id;
    v_attribution.content_id := v_user_journey.content_id;
    v_attribution.source_id := v_user_journey.source_id;
    v_attribution.campaign_id := v_user_journey.campaign_id;
    v_attribution.offer_id := v_user_journey.offer_id;
    v_attribution.source_platform := v_user_journey.source_platform;
    v_attribution.touch_token := v_user_journey.touch_token;
    v_attribution.captured_at := v_user_journey.captured_at;
  END IF;

  v_missing_dimensions := to_jsonb(array_remove(ARRAY[
    CASE WHEN v_attribution.user_id IS NULL THEN 'attribution' END,
    CASE WHEN NULLIF(btrim(v_attribution.content_id), '') IS NULL THEN 'content_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.source_id), '') IS NULL THEN 'source_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.campaign_id), '') IS NULL THEN 'campaign_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.offer_id), '') IS NULL THEN 'offer_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.source_platform), '') IS NULL THEN 'source_platform' END,
    CASE WHEN NULLIF(btrim(v_attribution.touch_token), '') IS NULL THEN 'touch_token' END,
    CASE WHEN v_attribution.captured_at IS NULL THEN 'captured_at' END
  ]::TEXT[], NULL));

  IF jsonb_array_length(v_missing_dimensions) > 0 THEN
    RETURN jsonb_build_object(
      'outbox_event_id', NULL,
      'outbox_inserted', FALSE,
      'outbox_status', 'not_queued_incomplete_exact_dimensions',
      'missing_dimensions', v_missing_dimensions
    );
  END IF;

  -- The verified touch is the causal lower bound for every downstream owned
  -- outcome. Do not invent a conversion path from an event timestamp that
  -- predates the immutable journey. Presence of install or trial is not
  -- required: valid paths such as click -> purchase remain supported.
  IF v_event_type <> 'click' AND p_occurred_at < v_attribution.captured_at THEN
    RETURN jsonb_build_object(
      'outbox_event_id', NULL,
      'outbox_inserted', FALSE,
      'outbox_status', 'rejected_before_journey_capture',
      'rejection_reason', 'occurred_at_before_journey_capture',
      'journey_captured_at', v_attribution.captured_at,
      'submitted_occurred_at', p_occurred_at,
      'missing_dimensions', '[]'::JSONB
    );
  END IF;

  v_idempotency_key := 'everreach:' || v_event_type || ':' || v_provider_event_id;
  v_payload := jsonb_build_object(
    'contract', 'owned_attribution_event_v1',
    'idempotency_key', v_idempotency_key,
    'event_type', v_event_type,
    'attribution', jsonb_build_object(
      'content_id', v_attribution.content_id,
      'campaign_id', v_attribution.campaign_id,
      'offer_id', v_attribution.offer_id,
      'source_platform', v_attribution.source_platform,
      'source_id', v_attribution.source_id
    ),
    'journey_id', v_attribution.touch_token,
    'occurred_at', to_char(
      p_occurred_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'provider_event_id', v_provider_event_id,
    'metadata', p_metadata
  );

  INSERT INTO public.owned_outcome_outbox (
    contract,
    idempotency_key,
    event_type,
    user_id,
    content_id,
    source_id,
    campaign_id,
    offer_id,
    source_platform,
    touch_token,
    provider_event_id,
    occurred_at,
    payload
  ) VALUES (
    'owned_attribution_event_v1',
    v_idempotency_key,
    v_event_type,
    p_user_id,
    v_attribution.content_id,
    v_attribution.source_id,
    v_attribution.campaign_id,
    v_attribution.offer_id,
    v_attribution.source_platform,
    v_attribution.touch_token,
    v_provider_event_id,
    p_occurred_at,
    v_payload
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  v_outbox_inserted := v_outbox_id IS NOT NULL;
  IF NOT v_outbox_inserted THEN
    SELECT * INTO v_existing
    FROM public.owned_outcome_outbox
    WHERE idempotency_key = v_idempotency_key;

    IF v_existing.user_id <> p_user_id
      OR v_existing.event_type <> v_event_type
      OR v_existing.content_id <> v_attribution.content_id
      OR v_existing.source_id <> v_attribution.source_id
      OR v_existing.campaign_id <> v_attribution.campaign_id
      OR v_existing.offer_id <> v_attribution.offer_id
      OR v_existing.source_platform <> v_attribution.source_platform
      OR v_existing.touch_token <> v_attribution.touch_token
      OR v_existing.provider_event_id <> v_provider_event_id
      OR v_existing.occurred_at <> p_occurred_at
    THEN
      RAISE EXCEPTION 'idempotency key already identifies a different owned outcome'
        USING ERRCODE = '23505';
    END IF;
    v_outbox_id := v_existing.id;
  END IF;

  RETURN jsonb_build_object(
    'outbox_event_id', v_outbox_id,
    'outbox_inserted', v_outbox_inserted,
    'outbox_status', CASE
      WHEN v_outbox_inserted THEN 'queued'
      ELSE 'idempotent_replay'
    END,
    'missing_dimensions', '[]'::JSONB
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_owned_outcome_event(
  UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_owned_outcome_event(
  UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO service_role;

CREATE FUNCTION public.record_owned_provider_fact(
  p_provider TEXT,
  p_subject_id TEXT,
  p_resolved_user_id UUID,
  p_event_type TEXT,
  p_provider_event_id TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_provider TEXT := lower(NULLIF(btrim(p_provider), ''));
  v_subject_id TEXT := NULLIF(btrim(p_subject_id), '');
  v_event_type TEXT := lower(NULLIF(btrim(p_event_type), ''));
  v_provider_event_id TEXT := NULLIF(btrim(p_provider_event_id), '');
  v_user_id UUID;
  v_existing public.owned_outcome_reconciliation%ROWTYPE;
  v_enqueue JSONB;
  v_status TEXT;
BEGIN
  IF v_provider NOT IN ('stripe', 'revenuecat')
    OR v_event_type NOT IN ('trial', 'purchase')
    OR v_subject_id IS NULL OR char_length(v_subject_id) > 512
    OR v_provider_event_id IS NULL OR char_length(v_provider_event_id) > 256
    OR p_occurred_at IS NULL
    OR p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object'
    OR octet_length(p_metadata::TEXT) > 32768
  THEN
    RAISE EXCEPTION 'owned provider fact is invalid' USING ERRCODE = '22023';
  END IF;

  -- The caller is the EverReach backend after it has authenticated or resolved
  -- the user in the primary app project. The shared outcome project must not
  -- require or infer a duplicate auth.users/profile row.
  IF p_resolved_user_id IS NOT NULL THEN
    v_user_id := p_resolved_user_id;
  ELSIF v_provider = 'revenuecat'
    AND v_subject_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    v_user_id := v_subject_id::UUID;
  END IF;

  INSERT INTO public.owned_outcome_reconciliation (
    provider, provider_event_id, event_type, subject_id, resolved_user_id,
    occurred_at, metadata
  ) VALUES (
    v_provider, v_provider_event_id, v_event_type, v_subject_id, v_user_id,
    p_occurred_at, p_metadata
  )
  ON CONFLICT (provider, provider_event_id, event_type) DO NOTHING;

  SELECT * INTO v_existing
  FROM public.owned_outcome_reconciliation
  WHERE provider = v_provider AND provider_event_id = v_provider_event_id
    AND event_type = v_event_type
  FOR UPDATE;

  IF v_existing.subject_id <> v_subject_id
    OR v_existing.occurred_at <> p_occurred_at
    OR v_existing.metadata <> p_metadata
  THEN
    RAISE EXCEPTION 'provider event id identifies a different outcome fact'
      USING ERRCODE = '23505';
  END IF;

  IF v_existing.status = 'resolved' THEN
    RETURN jsonb_build_object(
      'status', 'idempotent_replay',
      'provider_event_id', v_provider_event_id,
      'resolved_user_id', v_existing.resolved_user_id
    );
  END IF;

  IF v_existing.status = 'quarantined' THEN
    RETURN jsonb_build_object(
      'status', 'idempotent_quarantine',
      'provider_event_id', v_provider_event_id,
      'resolved_user_id', v_existing.resolved_user_id,
      'rejection_reason', v_existing.last_error
    );
  END IF;

  IF v_user_id IS NULL THEN
    UPDATE public.owned_outcome_reconciliation
    SET attempt_count = attempt_count + 1,
        last_error = 'user_mapping_unresolved', updated_at = clock_timestamp()
    WHERE provider = v_provider AND provider_event_id = v_provider_event_id
      AND event_type = v_event_type;
    RETURN jsonb_build_object(
      'status', 'pending_user_mapping',
      'provider_event_id', v_provider_event_id
    );
  END IF;

  v_enqueue := public.enqueue_owned_outcome_event(
    v_user_id, v_event_type, v_provider_event_id, p_occurred_at, p_metadata
  );
  v_status := v_enqueue->>'outbox_status';
  IF v_status IN ('queued', 'idempotent_replay') THEN
    UPDATE public.owned_outcome_reconciliation
    SET resolved_user_id = v_user_id, status = 'resolved',
        attempt_count = attempt_count + 1, last_error = NULL,
        resolved_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE provider = v_provider AND provider_event_id = v_provider_event_id
      AND event_type = v_event_type;
    RETURN jsonb_build_object(
      'status', v_status,
      'provider_event_id', v_provider_event_id,
      'resolved_user_id', v_user_id,
      'outbox', v_enqueue
    );
  END IF;

  IF v_status = 'rejected_before_journey_capture' THEN
    UPDATE public.owned_outcome_reconciliation
    SET resolved_user_id = v_user_id, status = 'quarantined',
        attempt_count = attempt_count + 1,
        last_error = 'occurred_at_before_journey_capture',
        updated_at = clock_timestamp()
    WHERE provider = v_provider AND provider_event_id = v_provider_event_id
      AND event_type = v_event_type;
    RETURN jsonb_build_object(
      'status', 'quarantined_before_journey_capture',
      'provider_event_id', v_provider_event_id,
      'resolved_user_id', v_user_id,
      'rejection_reason', 'occurred_at_before_journey_capture',
      'outbox', v_enqueue
    );
  END IF;

  UPDATE public.owned_outcome_reconciliation
  SET resolved_user_id = v_user_id, attempt_count = attempt_count + 1,
      last_error = 'exact_attribution_incomplete', updated_at = clock_timestamp()
  WHERE provider = v_provider AND provider_event_id = v_provider_event_id
    AND event_type = v_event_type;
  RETURN jsonb_build_object(
    'status', 'pending_exact_attribution',
    'provider_event_id', v_provider_event_id,
    'resolved_user_id', v_user_id,
    'missing_dimensions', v_enqueue->'missing_dimensions'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_owned_provider_fact(
  TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_owned_provider_fact(
  TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO service_role;

CREATE FUNCTION public.reconcile_owned_provider_facts(p_limit INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_fact public.owned_outcome_reconciliation%ROWTYPE;
  v_result JSONB;
  v_checked INTEGER := 0;
  v_resolved INTEGER := 0;
  v_quarantined INTEGER := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'reconciliation limit must be from 1 to 500'
      USING ERRCODE = '22023';
  END IF;
  FOR v_fact IN
    SELECT * FROM public.owned_outcome_reconciliation
    WHERE status = 'pending'
    ORDER BY updated_at ASC, created_at ASC
    LIMIT p_limit
  LOOP
    v_checked := v_checked + 1;
    BEGIN
      v_result := public.record_owned_provider_fact(
        v_fact.provider, v_fact.subject_id, v_fact.resolved_user_id,
        v_fact.event_type, v_fact.provider_event_id, v_fact.occurred_at,
        v_fact.metadata
      );
      IF v_result->>'status' IN ('queued', 'idempotent_replay') THEN
        v_resolved := v_resolved + 1;
      ELSIF v_result->>'status' IN (
        'quarantined_before_journey_capture', 'idempotent_quarantine'
      ) THEN
        v_quarantined := v_quarantined + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.owned_outcome_reconciliation
      SET attempt_count = attempt_count + 1,
          last_error = left(SQLSTATE || ':' || SQLERRM, 1000),
          updated_at = clock_timestamp()
      WHERE provider = v_fact.provider
        AND provider_event_id = v_fact.provider_event_id
        AND event_type = v_fact.event_type;
    END;
  END LOOP;
  RETURN jsonb_build_object(
    'status', 'ok', 'checked', v_checked, 'resolved', v_resolved,
    'quarantined', v_quarantined,
    'pending', v_checked - v_resolved - v_quarantined
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_owned_provider_facts(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_owned_provider_facts(INTEGER)
  TO service_role;

CREATE FUNCTION public.enqueue_owned_retention_sample(
  p_measurement_id TEXT,
  p_content_id TEXT,
  p_source_id TEXT,
  p_campaign_id TEXT,
  p_offer_id TEXT,
  p_source_platform TEXT,
  p_journey_id TEXT,
  p_observed_at TIMESTAMPTZ,
  p_elapsed_ms BIGINT,
  p_retained_count BIGINT,
  p_sample_size BIGINT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_measurement_id TEXT := NULLIF(btrim(p_measurement_id), '');
  v_content_id TEXT := NULLIF(btrim(p_content_id), '');
  v_source_id TEXT := NULLIF(btrim(p_source_id), '');
  v_campaign_id TEXT := NULLIF(btrim(p_campaign_id), '');
  v_offer_id TEXT := NULLIF(btrim(p_offer_id), '');
  v_source_platform TEXT := lower(NULLIF(btrim(p_source_platform), ''));
  v_journey_id TEXT := NULLIF(btrim(p_journey_id), '');
  v_percent NUMERIC;
  v_key TEXT;
  v_payload JSONB;
  v_id UUID;
  v_existing public.owned_retention_outbox%ROWTYPE;
BEGIN
  IF v_measurement_id IS NULL OR char_length(v_measurement_id) > 240
    OR v_content_id IS NULL OR char_length(v_content_id) > 512
    OR v_source_id IS NULL OR char_length(v_source_id) > 512
    OR v_campaign_id IS NULL OR char_length(v_campaign_id) > 512
    OR v_offer_id IS NULL OR char_length(v_offer_id) > 512
    OR v_source_platform IS NULL OR char_length(v_source_platform) > 100
  THEN
    RAISE EXCEPTION 'retention identity or exact dimensions are invalid'
      USING ERRCODE = '22023';
  END IF;
  IF p_observed_at IS NULL OR p_elapsed_ms < 0
    OR p_sample_size < 1 OR p_retained_count < 0
    OR p_retained_count > p_sample_size
  THEN
    RAISE EXCEPTION 'retention cohort counts or timestamps are invalid'
      USING ERRCODE = '22023';
  END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object'
    OR octet_length(p_metadata::TEXT) > 32768
  THEN
    RAISE EXCEPTION 'retention metadata is invalid' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.attribution_publication_manifests
    WHERE content_id = v_content_id AND source_id = v_source_id
      AND campaign_id = v_campaign_id AND offer_id = v_offer_id
      AND source_platform = v_source_platform
  ) THEN
    RAISE EXCEPTION 'retention dimensions do not identify a registered publication'
      USING ERRCODE = '42501';
  END IF;

  v_percent := round((p_retained_count::NUMERIC * 100) / p_sample_size, 6);
  v_key := 'everreach:retention:' || v_measurement_id || ':' || p_elapsed_ms::TEXT;
  IF char_length(v_key) > 300 THEN
    RAISE EXCEPTION 'retention idempotency key is too long'
      USING ERRCODE = '22023';
  END IF;
  v_payload := jsonb_build_object(
    'contract', 'owned_retention_sample_v1',
    'idempotency_key', v_key,
    'attribution', jsonb_build_object(
      'content_id', v_content_id,
      'source_id', v_source_id,
      'campaign_id', v_campaign_id,
      'offer_id', v_offer_id,
      'source_platform', v_source_platform
    ),
    'measurement_id', v_measurement_id,
    'observed_at', to_char(
      p_observed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'elapsed_ms', p_elapsed_ms,
    'retained_percent', v_percent,
    'sample_size', p_sample_size,
    'journey_id', v_journey_id,
    'metadata', p_metadata || jsonb_build_object(
      'retained_count', p_retained_count,
      'denominator', p_sample_size,
      'producer', COALESCE(p_metadata->>'producer', 'everreach_server_retention')
    )
  );

  INSERT INTO public.owned_retention_outbox (
    contract, idempotency_key, measurement_id, content_id, source_id,
    campaign_id, offer_id, source_platform, journey_id, observed_at,
    elapsed_ms, retained_count, sample_size, retained_percent, payload
  ) VALUES (
    'owned_retention_sample_v1', v_key, v_measurement_id, v_content_id,
    v_source_id, v_campaign_id, v_offer_id, v_source_platform, v_journey_id,
    p_observed_at, p_elapsed_ms, p_retained_count, p_sample_size,
    v_percent, v_payload
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT * INTO v_existing FROM public.owned_retention_outbox
    WHERE idempotency_key = v_key;
    IF v_existing.payload <> v_payload THEN
      RAISE EXCEPTION 'retention idempotency key identifies a different sample'
        USING ERRCODE = '23505';
    END IF;
    v_id := v_existing.id;
  END IF;
  RETURN jsonb_build_object(
    'outbox_event_id', v_id,
    'outbox_inserted', v_existing.id IS NULL,
    'outbox_status', CASE WHEN v_existing.id IS NULL
      THEN 'queued' ELSE 'idempotent_replay' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_owned_retention_sample(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ,
  BIGINT, BIGINT, BIGINT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_owned_retention_sample(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ,
  BIGINT, BIGINT, BIGINT, JSONB
) TO service_role;

DROP FUNCTION IF EXISTS public.upsert_attribution(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE FUNCTION public.upsert_attribution(
  p_user_id UUID,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT,
  p_utm_term TEXT,
  p_utm_content TEXT,
  p_referrer TEXT,
  p_landing_page TEXT,
  p_content_id TEXT DEFAULT NULL,
  p_source_id TEXT DEFAULT NULL,
  p_campaign_id TEXT DEFAULT NULL,
  p_offer_id TEXT DEFAULT NULL,
  p_source_platform TEXT DEFAULT NULL,
  p_touch_token TEXT DEFAULT NULL,
  p_captured_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET U&"\0073\0065\0061\0072\0063\0068\005f\0070\0061\0074\0068" = pg_catalog, public
AS $$
DECLARE
  v_attribution_inserted BOOLEAN := FALSE;
  v_attribution public.attribution%ROWTYPE;
  v_anonymous public.anonymous_attribution_touches%ROWTYPE;
  v_user_journey public.attribution_user_journeys%ROWTYPE;
  v_content_id TEXT;
  v_source_id TEXT;
  v_campaign_id TEXT;
  v_offer_id TEXT;
  v_source_platform TEXT;
  v_touch_token TEXT;
  v_captured_at TIMESTAMPTZ;
  v_utm_source TEXT;
  v_utm_medium TEXT;
  v_utm_campaign TEXT;
  v_utm_term TEXT;
  v_utm_content TEXT;
  v_referrer TEXT;
  v_landing_page TEXT;
  v_outbox_inserted BOOLEAN := FALSE;
  v_outbox_id UUID;
  v_idempotency_key TEXT;
  v_payload JSONB;
  v_existing public.owned_outcome_outbox%ROWTYPE;
  v_missing_dimensions JSONB;
BEGIN
  -- This RPC is service-role-only. The EverReach backend authenticates the
  -- primary-project bearer token and passes that exact subject UUID across the
  -- isolated data-plane boundary. Never grant this function to a client role.
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'attribution subject is required' USING ERRCODE = '22023';
  END IF;

  v_touch_token := NULLIF(btrim(p_touch_token), '');
  IF v_touch_token IS NULL THEN
    IF NULLIF(btrim(p_content_id), '') IS NOT NULL
      OR NULLIF(btrim(p_source_id), '') IS NOT NULL
      OR NULLIF(btrim(p_campaign_id), '') IS NOT NULL
      OR NULLIF(btrim(p_offer_id), '') IS NOT NULL
      OR NULLIF(btrim(p_source_platform), '') IS NOT NULL
      OR p_captured_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'exact attribution requires a server-minted touch token'
        USING ERRCODE = '42501';
    END IF;
    v_utm_source := NULLIF(btrim(p_utm_source), '');
    v_utm_medium := NULLIF(btrim(p_utm_medium), '');
    v_utm_campaign := NULLIF(btrim(p_utm_campaign), '');
    v_utm_term := NULLIF(btrim(p_utm_term), '');
    v_utm_content := NULLIF(btrim(p_utm_content), '');
    v_referrer := NULLIF(btrim(p_referrer), '');
    v_landing_page := NULLIF(btrim(p_landing_page), '');
  ELSE
    SELECT * INTO v_anonymous
    FROM public.anonymous_attribution_touches
    WHERE touch_token = v_touch_token
    FOR UPDATE;
    IF v_anonymous.touch_token IS NULL THEN
      RAISE EXCEPTION 'unknown or non-server-minted touch token'
        USING ERRCODE = '42501';
    END IF;
    IF v_anonymous.captured_at < clock_timestamp() - INTERVAL '30 days'
      OR v_anonymous.captured_at > clock_timestamp() + INTERVAL '5 minutes'
    THEN
      RAISE EXCEPTION 'touch token is expired or not yet valid'
        USING ERRCODE = '42501';
    END IF;
    IF v_anonymous.claimed_user_id IS NOT NULL
      AND v_anonymous.claimed_user_id <> p_user_id
    THEN
      RAISE EXCEPTION 'touch token is already claimed by another user'
        USING ERRCODE = '42501';
    END IF;
    IF NULLIF(btrim(p_content_id), '') IS DISTINCT FROM v_anonymous.content_id
      OR NULLIF(btrim(p_source_id), '') IS DISTINCT FROM v_anonymous.source_id
      OR NULLIF(btrim(p_campaign_id), '') IS DISTINCT FROM v_anonymous.campaign_id
      OR NULLIF(btrim(p_offer_id), '') IS DISTINCT FROM v_anonymous.offer_id
      OR NULLIF(btrim(p_source_platform), '')
        IS DISTINCT FROM v_anonymous.source_platform
    THEN
      RAISE EXCEPTION 'submitted attribution conflicts with server-minted touch'
        USING ERRCODE = '23505';
    END IF;
    v_content_id := v_anonymous.content_id;
    v_source_id := v_anonymous.source_id;
    v_campaign_id := v_anonymous.campaign_id;
    v_offer_id := v_anonymous.offer_id;
    v_source_platform := v_anonymous.source_platform;
    v_captured_at := v_anonymous.captured_at;
    v_utm_source := v_anonymous.utm_source;
    v_utm_medium := v_anonymous.utm_medium;
    v_utm_campaign := v_anonymous.utm_campaign;
    v_utm_term := v_anonymous.utm_term;
    v_utm_content := v_anonymous.utm_content;
    v_referrer := v_anonymous.referrer;
    v_landing_page := v_anonymous.landing_page;
  END IF;

  IF v_touch_token IS NOT NULL THEN
    INSERT INTO public.attribution_user_journeys (
      user_id, touch_token, content_id, source_id, campaign_id, offer_id,
      source_platform, captured_at
    ) VALUES (
      p_user_id, v_touch_token, v_content_id, v_source_id, v_campaign_id,
      v_offer_id, v_source_platform, v_captured_at
    )
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_user_journey
    FROM public.attribution_user_journeys
    WHERE user_id = p_user_id;
    IF v_user_journey.touch_token IS DISTINCT FROM v_touch_token
      OR v_user_journey.content_id IS DISTINCT FROM v_content_id
      OR v_user_journey.source_id IS DISTINCT FROM v_source_id
      OR v_user_journey.campaign_id IS DISTINCT FROM v_campaign_id
      OR v_user_journey.offer_id IS DISTINCT FROM v_offer_id
      OR v_user_journey.source_platform IS DISTINCT FROM v_source_platform
      OR v_user_journey.captured_at IS DISTINCT FROM v_captured_at
    THEN
      RAISE EXCEPTION 'user already has a different verified exact journey'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Store the immutable first touch. Existing rows are never enriched from a
  -- later caller because that would splice two journeys into one lineage.
  INSERT INTO public.attribution (
    user_id,
    first_utm_source,
    first_utm_medium,
    first_utm_campaign,
    first_utm_term,
    first_utm_content,
    first_referrer,
    first_landing_page,
    content_id,
    source_id,
    campaign_id,
    offer_id,
    source_platform,
    touch_token,
    captured_at
  ) VALUES (
    p_user_id,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_utm_term,
    v_utm_content,
    v_referrer,
    v_landing_page,
    v_content_id,
    v_source_id,
    v_campaign_id,
    v_offer_id,
    v_source_platform,
    v_touch_token,
    v_captured_at
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING TRUE INTO v_attribution_inserted;

  SELECT * INTO v_attribution
  FROM public.attribution
  WHERE user_id = p_user_id;

  IF v_touch_token IS NOT NULL AND (
    (
      v_attribution.touch_token IS NULL
      AND (
        v_attribution.content_id IS NOT NULL
        OR v_attribution.source_id IS NOT NULL
        OR v_attribution.campaign_id IS NOT NULL
        OR v_attribution.offer_id IS NOT NULL
        OR v_attribution.source_platform IS NOT NULL
        OR v_attribution.captured_at IS NOT NULL
      )
    )
    OR (
      v_attribution.touch_token IS NOT NULL
      AND (
        v_attribution.content_id IS DISTINCT FROM v_content_id
        OR v_attribution.source_id IS DISTINCT FROM v_source_id
        OR v_attribution.campaign_id IS DISTINCT FROM v_campaign_id
        OR v_attribution.offer_id IS DISTINCT FROM v_offer_id
        OR v_attribution.source_platform IS DISTINCT FROM v_source_platform
        OR v_attribution.touch_token IS DISTINCT FROM v_touch_token
        OR v_attribution.captured_at IS DISTINCT FROM v_captured_at
      )
    )
  )
  THEN
    RAISE EXCEPTION 'submitted attribution conflicts with immutable first touch'
      USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_user_journey
  FROM public.attribution_user_journeys
  WHERE user_id = p_user_id;
  IF v_user_journey.user_id IS NOT NULL THEN
    -- Use the append-only verified journey for outcome construction without
    -- mutating a legacy UTM-only attribution row.
    v_attribution.content_id := v_user_journey.content_id;
    v_attribution.source_id := v_user_journey.source_id;
    v_attribution.campaign_id := v_user_journey.campaign_id;
    v_attribution.offer_id := v_user_journey.offer_id;
    v_attribution.source_platform := v_user_journey.source_platform;
    v_attribution.touch_token := v_user_journey.touch_token;
    v_attribution.captured_at := v_user_journey.captured_at;
  END IF;

  IF v_touch_token IS NOT NULL AND v_anonymous.claimed_user_id IS NULL THEN
    UPDATE public.anonymous_attribution_touches
    SET claimed_user_id = p_user_id, claimed_at = clock_timestamp()
    WHERE touch_token = v_touch_token;
  END IF;

  v_missing_dimensions := to_jsonb(array_remove(ARRAY[
    CASE WHEN NULLIF(btrim(v_attribution.content_id), '') IS NULL THEN 'content_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.source_id), '') IS NULL THEN 'source_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.campaign_id), '') IS NULL THEN 'campaign_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.offer_id), '') IS NULL THEN 'offer_id' END,
    CASE WHEN NULLIF(btrim(v_attribution.source_platform), '') IS NULL THEN 'source_platform' END,
    CASE WHEN NULLIF(btrim(v_attribution.touch_token), '') IS NULL THEN 'touch_token' END,
    CASE WHEN v_attribution.captured_at IS NULL THEN 'captured_at' END
  ]::TEXT[], NULL));

  IF jsonb_array_length(v_missing_dimensions) = 0 THEN
    v_idempotency_key := 'everreach:click:' || v_attribution.touch_token;
    v_payload := jsonb_build_object(
      'contract', 'owned_attribution_event_v1',
      'idempotency_key', v_idempotency_key,
      'event_type', 'click',
      'attribution', jsonb_build_object(
        'content_id', v_attribution.content_id,
        'campaign_id', v_attribution.campaign_id,
        'offer_id', v_attribution.offer_id,
        'source_platform', v_attribution.source_platform,
        'source_id', v_attribution.source_id
      ),
      'journey_id', v_attribution.touch_token,
      'occurred_at', to_char(
        v_attribution.captured_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ),
      'provider_event_id', v_attribution.touch_token,
      'metadata', jsonb_build_object('producer', 'everreach')
    );

    INSERT INTO public.owned_outcome_outbox (
      contract,
      idempotency_key,
      event_type,
      user_id,
      content_id,
      source_id,
      campaign_id,
      offer_id,
      source_platform,
      touch_token,
      provider_event_id,
      occurred_at,
      payload
    ) VALUES (
      'owned_attribution_event_v1',
      v_idempotency_key,
      'click',
      p_user_id,
      v_attribution.content_id,
      v_attribution.source_id,
      v_attribution.campaign_id,
      v_attribution.offer_id,
      v_attribution.source_platform,
      v_attribution.touch_token,
      v_attribution.touch_token,
      v_attribution.captured_at,
      v_payload
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_outbox_id;

    v_outbox_inserted := v_outbox_id IS NOT NULL;
    IF NOT v_outbox_inserted THEN
      SELECT * INTO v_existing
      FROM public.owned_outcome_outbox
      WHERE idempotency_key = v_idempotency_key;

      IF v_existing.user_id <> p_user_id
        OR v_existing.content_id <> v_attribution.content_id
        OR v_existing.source_id <> v_attribution.source_id
        OR v_existing.campaign_id <> v_attribution.campaign_id
        OR v_existing.offer_id <> v_attribution.offer_id
        OR v_existing.source_platform <> v_attribution.source_platform
        OR v_existing.touch_token <> v_attribution.touch_token
        OR v_existing.provider_event_id <> v_attribution.touch_token
        OR v_existing.occurred_at <> v_attribution.captured_at
      THEN
        RAISE EXCEPTION 'touch token already identifies different attribution'
          USING ERRCODE = '23505';
      END IF;
      v_outbox_id := v_existing.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'attribution_inserted', COALESCE(v_attribution_inserted, FALSE),
    'outbox_event_id', v_outbox_id,
    'outbox_inserted', v_outbox_inserted,
    'outbox_status', CASE
      WHEN jsonb_array_length(v_missing_dimensions) > 0
        THEN 'not_queued_incomplete_exact_dimensions'
      WHEN v_outbox_inserted THEN 'queued'
      ELSE 'idempotent_replay'
    END,
    'missing_dimensions', v_missing_dimensions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_attribution(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_attribution(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

COMMIT;
