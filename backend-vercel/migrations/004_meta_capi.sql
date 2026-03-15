-- Meta Conversions API Event Log
-- Stores all Meta CAPI events sent from the app for debugging and analytics

CREATE TABLE IF NOT EXISTS meta_conversion_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event identification
  event_name TEXT NOT NULL,           -- e.g., 'CompleteRegistration', 'Purchase', 'ViewContent'
  event_time TIMESTAMPTZ NOT NULL,    -- When the event occurred (from client)
  event_id TEXT NOT NULL,             -- Unique event ID for deduplication (UUID)

  -- User data (hashed for privacy, ATT-gated)
  user_data JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "em": "hashed_email_sha256",
  --   "ph": "hashed_phone_sha256",
  --   "fn": "hashed_first_name_sha256",
  --   "ln": "hashed_last_name_sha256",
  --   "ct": "hashed_city_sha256",
  --   "st": "hashed_state_sha256",
  --   "zp": "hashed_zip_sha256",
  --   "country": "hashed_country_sha256",
  --   "client_ip_address": "1.2.3.4",
  --   "client_user_agent": "...",
  --   "fbp": "fb.1.timestamp.random",
  --   "fbc": "fb.1.timestamp.fbclid"
  -- }

  -- Custom event data
  custom_data JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "value": 9.99,
  --   "currency": "USD",
  --   "content_name": "Premium Subscription",
  --   "content_type": "product",
  --   "content_ids": ["monthly_plan"]
  -- }

  -- Metadata
  event_source_url TEXT,              -- Deep link or screen that triggered event
  action_source TEXT DEFAULT 'app',   -- 'app' | 'website'
  test_event_code TEXT                -- Test event code (only in __DEV__)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meta_conversion_event_created_at ON meta_conversion_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_event_event_name ON meta_conversion_event(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_event_event_id ON meta_conversion_event(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_event_event_time ON meta_conversion_event(event_time DESC);

-- RLS: Service role only (webhook writes, admin reads)
ALTER TABLE meta_conversion_event ENABLE ROW LEVEL SECURITY;

-- No public access - admin/service role only
-- Users should not be able to see or modify conversion events
