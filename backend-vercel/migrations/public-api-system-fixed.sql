/**
 * Public API System
 * 
 * Secure, rate-limited, AI-ready public API for EverReach
 * Enables external developers and AI agents to manage contacts, warmth, interactions
 */

-- ============================================================================
-- 1. API KEYS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "evr_live_")
  key_hash TEXT NOT NULL UNIQUE, -- Argon2id hash of full key
  
  -- Ownership
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Configuration
  name TEXT NOT NULL, -- "Production API Key", "AI Agent Bot"
  environment TEXT NOT NULL CHECK (environment IN ('test', 'live')),
  
  -- Scopes (granular permissions)
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- ['contacts:read', 'contacts:write', 'warmth:write']
  
  -- Security
  ip_allowlist INET[], -- Optional IP restrictions
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Metadata
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  last_used_user_agent TEXT,
  usage_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes separately (partial indexes cannot be inline)
CREATE INDEX idx_api_keys_org ON api_keys (org_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_active ON api_keys (org_id, revoked) WHERE revoked = false;

COMMENT ON TABLE api_keys IS 'Secure API key storage with scopes and usage tracking';
COMMENT ON COLUMN api_keys.key_hash IS 'Argon2id hash of full API key (evr_test_... or evr_live_...)';
COMMENT ON COLUMN api_keys.scopes IS 'Granular permissions: contacts:read, contacts:write, interactions:write, warmth:write, etc.';

-- ============================================================================
-- 2. API RATE LIMITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rate limit key (api_key_id or ip_address)
  key_type TEXT NOT NULL CHECK (key_type IN ('api_key', 'ip', 'org')),
  key_value TEXT NOT NULL,
  
  -- Window
  window_start TIMESTAMPTZ NOT NULL,
  window_duration_seconds INTEGER NOT NULL DEFAULT 60, -- 1 minute
  
  -- Counts
  request_count INTEGER NOT NULL DEFAULT 0,
  limit_max INTEGER NOT NULL, -- Max requests per window
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(key_type, key_value, window_start)
);

CREATE INDEX idx_api_rate_limits_lookup ON api_rate_limits(key_type, key_value, window_start DESC);
CREATE INDEX idx_api_rate_limits_cleanup ON api_rate_limits(window_start) WHERE window_start < NOW() - INTERVAL '1 hour';

-- ============================================================================
-- 3. API AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request identity
  request_id TEXT NOT NULL UNIQUE, -- req_01HG...
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Request details
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  
  -- Response
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  error_type TEXT,
  error_message TEXT,
  
  -- Client
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Resources accessed
  resource_type TEXT, -- 'contact', 'interaction', 'warmth'
  resource_id UUID,
  action TEXT, -- 'read', 'write', 'delete'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_audit_logs_org ON api_audit_logs (org_id, created_at DESC);
CREATE INDEX idx_api_audit_logs_key ON api_audit_logs (api_key_id, created_at DESC);
CREATE INDEX idx_api_audit_logs_request ON api_audit_logs (request_id);

-- Partition by month for performance
-- SELECT create_hypertable('api_audit_logs', 'created_at');

-- ============================================================================
-- 4. WEBHOOKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Configuration
  url TEXT NOT NULL, -- Destination endpoint
  secret TEXT NOT NULL, -- For HMAC signature
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Events subscribed to
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- ['contact.warmth.changed', 'contact.warmth.below_threshold']
  
  -- Delivery settings
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  
  -- Status
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status INTEGER,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org ON webhooks (org_id);
CREATE INDEX idx_webhooks_events ON webhooks USING gin(events);

-- ============================================================================
-- 5. WEBHOOK DELIVERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL, -- Idempotency
  
  -- Event data
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Delivery attempt
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status INTEGER, -- HTTP status code
  response_body TEXT,
  error_message TEXT,
  
  -- Timing
  sent_at TIMESTAMPTZ,
  duration_ms INTEGER,
  next_retry_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries (event_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries (next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ============================================================================
-- 6. RULES & AUTOMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'warmth_threshold',
    'stage_change',
    'tag_added',
    'interaction_created',
    'no_touch_days'
  )),
  
  -- Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL,
  -- Examples:
  -- {"warmth_threshold": 40, "lookback_days": 14}
  -- {"stage_id": "stage_xyz", "pipeline_id": "pipe_abc"}
  -- {"no_touch_days": 30, "tags_include": ["vip"]}
  
  -- Actions
  actions JSONB NOT NULL,
  -- Examples:
  -- {"webhook": true, "email": false, "push": true}
  -- {"send_message": {"template_id": "...", "channel": "email"}}
  
  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Stats
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_org ON automation_rules (org_id);
CREATE INDEX idx_automation_rules_type ON automation_rules (org_id, type) WHERE enabled = true;

-- ============================================================================
-- 7. OUTBOX (SAFE MESSAGE QUEUE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Message
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'dm', 'push')),
  recipient TEXT NOT NULL, -- email, phone, username
  subject TEXT,
  body TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB,
  template_id TEXT,
  goal TEXT, -- 're-engage', 'nurture', 'convert'
  
  -- Scheduling
  send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Approval workflow
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'awaiting_approval',
    'approved',
    'rejected',
    'sent',
    'failed',
    'expired'
  )),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_org ON outbox (org_id, status);
CREATE INDEX idx_outbox_contact ON outbox (contact_id);
CREATE INDEX idx_outbox_approval ON outbox (org_id, status) WHERE status = 'awaiting_approval';
CREATE INDEX idx_outbox_send ON outbox (send_after) WHERE status = 'pending' OR status = 'approved';

-- ============================================================================
-- 8. SEGMENTS (DYNAMIC COHORTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Definition
  name TEXT NOT NULL,
  description TEXT,
  
  -- Filter rules (JSONB DSL)
  filters JSONB NOT NULL,
  -- Example:
  -- {
  --   "warmth_band": ["cooling", "cold"],
  --   "last_touch_days_ago": {"gte": 21},
  --   "tags": {"include": ["vip"], "exclude": ["dnc"]},
  --   "stage_id": ["stage_xyz"]
  -- }
  
  -- Cache
  member_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,
  
  -- Settings
  auto_update BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segments_org ON segments (org_id);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Verify API key (returns org_id and scopes if valid)
CREATE OR REPLACE FUNCTION verify_api_key(p_key_hash TEXT)
RETURNS TABLE (
  org_id UUID,
  scopes TEXT[],
  api_key_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.org_id,
    k.scopes,
    k.id
  FROM api_keys k
  WHERE k.key_hash = p_key_hash
    AND k.revoked = false
    AND (k.expires_at IS NULL OR k.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if API key has scope
CREATE OR REPLACE FUNCTION has_scope(p_scopes TEXT[], p_required_scope TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for wildcard (e.g., 'contacts:*')
  IF p_required_scope = ANY(p_scopes) THEN
    RETURN true;
  END IF;
  
  -- Check for resource wildcard (e.g., 'contacts:*' covers 'contacts:read')
  IF (split_part(p_required_scope, ':', 1) || ':*') = ANY(p_scopes) THEN
    RETURN true;
  END IF;
  
  -- Check for full wildcard
  IF '*' = ANY(p_scopes) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update API key last used
CREATE OR REPLACE FUNCTION update_api_key_usage(
  p_api_key_id UUID,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET 
    last_used_at = NOW(),
    last_used_ip = p_ip_address,
    last_used_user_agent = p_user_agent,
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Emit webhook event
CREATE OR REPLACE FUNCTION emit_webhook_event(
  p_org_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID := gen_random_uuid();
BEGIN
  -- Find all webhooks subscribed to this event type
  FOR v_webhook IN
    SELECT id, url, secret
    FROM webhooks
    WHERE org_id = p_org_id
      AND enabled = true
      AND p_event_type = ANY(events)
  LOOP
    -- Queue delivery
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_id,
      event_type,
      payload,
      attempt_number,
      next_retry_at
    ) VALUES (
      v_webhook.id,
      v_event_id,
      p_event_type,
      p_payload,
      1,
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Compute segment members
CREATE OR REPLACE FUNCTION compute_segment_members(p_segment_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_segment RECORD;
BEGIN
  SELECT * INTO v_segment FROM segments WHERE id = p_segment_id;
  
  -- This is a simplified version - in production, parse the filters JSONB
  -- and build dynamic SQL query
  
  -- For now, just count all contacts in org
  SELECT COUNT(*) INTO v_count
  FROM people
  WHERE org_id = v_segment.org_id;
  
  UPDATE segments
  SET member_count = v_count, last_computed_at = NOW()
  WHERE id = p_segment_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

-- API keys: org members can view their org's keys
CREATE POLICY "Users can view their org's API keys"
  ON api_keys FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM people WHERE created_by = auth.uid() LIMIT 1
    )
  );

-- Audit logs: org members can view their org's logs
CREATE POLICY "Users can view their org's audit logs"
  ON api_audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM people WHERE created_by = auth.uid() LIMIT 1
    )
  );

-- Webhooks: org members can manage their webhooks
CREATE POLICY "Users can manage their org's webhooks"
  ON webhooks FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM people WHERE created_by = auth.uid() LIMIT 1
    )
  );

-- Outbox: org members can view their outbox
CREATE POLICY "Users can view their org's outbox"
  ON outbox FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM people WHERE created_by = auth.uid() LIMIT 1
    )
  );

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================

-- API keys lookup by hash (most frequent operation)
CREATE INDEX idx_api_keys_hash_active ON api_keys(key_hash) WHERE revoked = false;

-- Audit logs by time range
CREATE INDEX idx_api_audit_logs_time ON api_audit_logs(created_at DESC);

-- Webhook deliveries needing retry
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at)
  WHERE next_retry_at IS NOT NULL AND status IS NULL;

-- Outbox items ready to send
CREATE INDEX idx_outbox_ready ON outbox(send_after)
  WHERE status IN ('pending', 'approved') AND send_after <= NOW();

-- ============================================================================
-- 12. SAMPLE SCOPES
-- ============================================================================

COMMENT ON COLUMN api_keys.scopes IS 'Available scopes:
  contacts:read - List and view contacts
  contacts:write - Create and update contacts
  contacts:delete - Delete contacts
  interactions:read - View interactions
  interactions:write - Log interactions
  warmth:read - View warmth scores
  warmth:write - Manually override warmth
  warmth:recompute - Trigger warmth recomputation
  segments:read - List segments
  segments:write - Create and update segments
  outbox:read - View outbox
  outbox:write - Queue messages
  outbox:approve - Approve messages
  webhooks:read - View webhooks
  webhooks:write - Manage webhooks
  rules:read - View automation rules
  rules:write - Manage rules
  * - Full access (use with extreme caution)
';

-- ============================================================================
-- 13. CLEANUP & MAINTENANCE
-- ============================================================================

-- Clean up old rate limit windows (run hourly)
-- DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';

-- Clean up old audit logs (run daily, keep 90 days)
-- DELETE FROM api_audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean up old webhook deliveries (run daily, keep 30 days)
-- DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '30 days';

