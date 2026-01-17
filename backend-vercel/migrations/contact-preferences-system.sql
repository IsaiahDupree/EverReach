/**
 * Contact Preferences & Communication Channels System
 * 
 * Allows contacts to specify:
 * - Preferred communication channels (SMS, email, call, social platforms)
 * - Quiet hours and timezone
 * - Contact frequency preferences
 * - Content preferences (tone, length, topics)
 * 
 * Also includes tenant-level autopilot policies for guardrails
 */

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE channel_type AS ENUM (
  'sms',
  'email',
  'call',
  'whatsapp',
  'telegram',
  'ig_dm',
  'x_dm',
  'linkedin_dm',
  'facebook_messenger',
  'discord',
  'slack',
  'other'
);

CREATE TYPE opt_status AS ENUM (
  'opted_in',
  'opted_out',
  'unknown'
);

CREATE TYPE contact_frequency AS ENUM (
  'low',      -- Max 1 per week
  'normal',   -- Max 3 per week
  'high'      -- Max daily
);

-- ============================================================================
-- CONTACT CHANNELS TABLE
-- ============================================================================

CREATE TABLE contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel channel_type NOT NULL,
  address TEXT NOT NULL, -- phone, email, @handle, user_id, etc.
  
  -- Status flags
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false, -- User-starred "preferred" channel
  opt_status opt_status DEFAULT 'unknown',
  opt_event_at TIMESTAMPTZ, -- When they opted in/out
  opt_event_reason TEXT, -- Why they opted out
  
  -- Performance metrics
  last_interaction_at TIMESTAMPTZ,
  deliverability_score INT CHECK (deliverability_score BETWEEN 0 AND 100), -- Bounce/block tracking
  affinity_score INT CHECK (affinity_score BETWEEN 0 AND 100), -- ML engagement score
  reply_rate DECIMAL(5,2), -- replies / sent
  avg_reply_time_minutes INT, -- Average time to reply
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (contact_id, channel, address)
);

CREATE INDEX idx_contact_channels_contact_id ON contact_channels(contact_id);
CREATE INDEX idx_contact_channels_is_default ON contact_channels(contact_id, is_default) WHERE is_default = true;
CREATE INDEX idx_contact_channels_affinity ON contact_channels(affinity_score DESC NULLS LAST);

COMMENT ON TABLE contact_channels IS 'All communication endpoints for a contact with performance tracking';
COMMENT ON COLUMN contact_channels.address IS 'Phone number, email, @handle, platform user ID, etc.';
COMMENT ON COLUMN contact_channels.deliverability_score IS 'How reliably messages reach this endpoint (0-100)';
COMMENT ON COLUMN contact_channels.affinity_score IS 'How engaged the contact is on this channel (0-100)';

-- ============================================================================
-- CONTACT PREFERENCES TABLE
-- ============================================================================

CREATE TABLE contact_preferences (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Core preferences
  preferred_channel channel_type,
  backup_channels channel_type[] DEFAULT '{}',
  
  -- Timing
  timezone TEXT DEFAULT 'America/New_York',
  quiet_hours_start TIME, -- e.g., '21:00'
  quiet_hours_end TIME,   -- e.g., '07:00'
  preferred_days TEXT[] DEFAULT '{}', -- ['Mon', 'Wed', 'Fri']
  preferred_hours_start TIME[], -- [['09:00'], ['14:00']]
  preferred_hours_end TIME[],   -- [['11:00'], ['16:00']]
  
  -- Frequency
  contact_frequency contact_frequency DEFAULT 'normal',
  allow_ai_outreach BOOLEAN DEFAULT true,
  
  -- Content preferences
  locale TEXT DEFAULT 'en-US',
  content_tone TEXT, -- 'friendly', 'professional', 'casual'
  content_length TEXT, -- 'brief', 'detailed', 'concise'
  topics_blocklist TEXT[] DEFAULT '{}', -- ['politics', 'religion']
  
  -- Escalation
  escalation_enabled BOOLEAN DEFAULT false,
  escalation_no_reply_hours INT, -- If no reply after X hours, escalate
  escalation_channel channel_type, -- Channel to escalate to
  
  -- Accessibility
  alt_text_required BOOLEAN DEFAULT false,
  html_email_ok BOOLEAN DEFAULT true,
  
  -- Privacy
  double_opt_in_required JSONB DEFAULT '{}'::jsonb, -- {"sms": true, "email": false}
  
  -- Extensibility (for future features)
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_prefs_preferred ON contact_preferences(preferred_channel);
CREATE INDEX idx_contact_prefs_frequency ON contact_preferences(contact_frequency);
CREATE INDEX idx_contact_prefs_ai ON contact_preferences(allow_ai_outreach) WHERE allow_ai_outreach = true;
CREATE INDEX idx_contact_prefs_extras ON contact_preferences USING GIN(extras);

COMMENT ON TABLE contact_preferences IS 'Per-contact communication preferences and guardrails';
COMMENT ON COLUMN contact_preferences.quiet_hours_start IS 'Local time when quiet hours begin (e.g., 21:00)';
COMMENT ON COLUMN contact_preferences.escalation_no_reply_hours IS 'Hours to wait before escalating to another channel';
COMMENT ON COLUMN contact_preferences.extras IS 'Extensible JSONB for custom preferences';

-- ============================================================================
-- TENANT POLICIES TABLE (Autopilot Guardrails)
-- ============================================================================

CREATE TABLE tenant_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  
  -- Policy sets (structured JSONB)
  policy_sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Example structure:
  -- [
  --   {
  --     "key": "send_caps",
  --     "rules": {
  --       "per_tenant_per_day": 5000,
  --       "per_user_per_day": 500,
  --       "per_contact_per_week": 3,
  --       "per_channel": {"sms": 2000, "email": 4000}
  --     }
  --   },
  --   {
  --     "key": "approvals",
  --     "rules": {
  --       "require_human_for": [
  --         {"when": "warmth_score < 20 && channel == 'email'"}
  --       ]
  --     }
  --   },
  --   {
  --     "key": "budgets",
  --     "rules": {
  --       "period": "monthly",
  --       "currency": "USD",
  --       "max_spend": 1500,
  --       "by_channel": {"sms": 600, "email": 400}
  --     }
  --   },
  --   {
  --     "key": "compliance",
  --     "rules": {
  --       "respect_quiet_hours": true,
  --       "block_if_opted_out": true,
  --       "double_opt_in_required": {"sms": true}
  --     }
  --   }
  -- ]
  
  -- Extensibility
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (org_id)
);

CREATE INDEX idx_tenant_policies_org ON tenant_policies(org_id);
CREATE INDEX idx_tenant_policies_sets ON tenant_policies USING GIN(policy_sets);

COMMENT ON TABLE tenant_policies IS 'Organization-wide autopilot policies and guardrails';
COMMENT ON COLUMN tenant_policies.policy_sets IS 'Array of policy objects with keys: send_caps, approvals, budgets, compliance';
COMMENT ON COLUMN tenant_policies.extras IS 'Extensible JSONB for routing, throttling, etc.';

-- ============================================================================
-- PREFERENCE TOKENS TABLE (For Self-Service Preference Centers)
-- ============================================================================

CREATE TABLE preference_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  single_use BOOLEAN DEFAULT true,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preference_tokens_contact ON preference_tokens(contact_id);
CREATE INDEX idx_preference_tokens_token ON preference_tokens(token) WHERE used_at IS NULL;
CREATE INDEX idx_preference_tokens_expires ON preference_tokens(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE preference_tokens IS 'Secure tokens for self-service preference center access';

-- ============================================================================
-- TRIGGER: Enforce Single Default Channel
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_default_channel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    -- Unset other default channels for this contact
    UPDATE contact_channels
    SET is_default = false, updated_at = now()
    WHERE contact_id = NEW.contact_id AND id <> NEW.id;
    
    -- Also update contact_preferences.preferred_channel
    UPDATE contact_preferences
    SET preferred_channel = NEW.channel, updated_at = now()
    WHERE contact_id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_default_channel
BEFORE INSERT OR UPDATE ON contact_channels
FOR EACH ROW EXECUTE FUNCTION enforce_single_default_channel();

COMMENT ON FUNCTION enforce_single_default_channel IS 'Ensures only one channel is marked as default per contact';

-- ============================================================================
-- TRIGGER: Update Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contact_channels_updated
BEFORE UPDATE ON contact_channels
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contact_prefs_updated
BEFORE UPDATE ON contact_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_policies_updated
BEFORE UPDATE ON tenant_policies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEW: Effective Channel (Fallback Logic)
-- ============================================================================

CREATE VIEW v_effective_channel AS
SELECT
  c.id AS contact_id,
  COALESCE(
    -- 1. Explicit preference
    cp.preferred_channel,
    
    -- 2. Default channel (user-starred)
    (SELECT channel FROM contact_channels cc 
     WHERE cc.contact_id = c.id AND cc.is_default = true 
     LIMIT 1),
    
    -- 3. Best-scoring channel
    (SELECT channel FROM contact_channels cc
     WHERE cc.contact_id = c.id
       AND cc.opt_status != 'opted_out'
     ORDER BY 
       cc.affinity_score DESC NULLS LAST,
       cc.deliverability_score DESC NULLS LAST,
       cc.is_verified DESC,
       cc.last_interaction_at DESC NULLS LAST
     LIMIT 1),
    
    -- 4. Email fallback (most common)
    'email'::channel_type
  ) AS effective_channel,
  
  -- Include metadata
  cp.quiet_hours_start,
  cp.quiet_hours_end,
  cp.timezone,
  cp.contact_frequency,
  cp.allow_ai_outreach
  
FROM contacts c
LEFT JOIN contact_preferences cp ON cp.contact_id = c.id;

COMMENT ON VIEW v_effective_channel IS 'Determines best channel to use with fallback logic';

-- ============================================================================
-- FUNCTION: Get Effective Channel (with time validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_channel(
  p_contact_id UUID,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  channel channel_type,
  address TEXT,
  is_quiet_hours BOOLEAN,
  can_send BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_channel channel_type;
  v_prefs RECORD;
  v_channel_info RECORD;
  v_is_quiet BOOLEAN := false;
  v_local_time TIME;
BEGIN
  -- Get effective channel
  SELECT effective_channel INTO v_channel
  FROM v_effective_channel
  WHERE contact_id = p_contact_id;
  
  IF v_channel IS NULL THEN
    RETURN QUERY SELECT 
      NULL::channel_type,
      NULL::TEXT,
      false,
      false,
      'No available channels'::TEXT;
    RETURN;
  END IF;
  
  -- Get preferences
  SELECT * INTO v_prefs
  FROM contact_preferences
  WHERE contact_id = p_contact_id;
  
  -- Get channel info
  SELECT * INTO v_channel_info
  FROM contact_channels
  WHERE contact_id = p_contact_id 
    AND channel = v_channel
  ORDER BY is_default DESC, affinity_score DESC NULLS LAST
  LIMIT 1;
  
  -- Check quiet hours
  IF v_prefs.quiet_hours_start IS NOT NULL THEN
    -- Convert to local time
    v_local_time := (p_now AT TIME ZONE v_prefs.timezone)::TIME;
    
    -- Handle ranges that cross midnight
    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      v_is_quiet := v_local_time >= v_prefs.quiet_hours_start 
                    AND v_local_time < v_prefs.quiet_hours_end;
    ELSE
      v_is_quiet := v_local_time >= v_prefs.quiet_hours_start 
                    OR v_local_time < v_prefs.quiet_hours_end;
    END IF;
  END IF;
  
  -- Determine if we can send
  RETURN QUERY SELECT
    v_channel,
    v_channel_info.address,
    v_is_quiet,
    CASE
      WHEN v_channel_info.opt_status = 'opted_out' THEN false
      WHEN v_is_quiet THEN false
      WHEN NOT COALESCE(v_prefs.allow_ai_outreach, true) THEN false
      ELSE true
    END AS can_send,
    CASE
      WHEN v_channel_info.opt_status = 'opted_out' THEN 'Contact opted out'
      WHEN v_is_quiet THEN 'Quiet hours'
      WHEN NOT COALESCE(v_prefs.allow_ai_outreach, true) THEN 'AI outreach disabled'
      ELSE 'OK'
    END AS reason;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_effective_channel IS 'Returns effective channel with quiet hours and opt-out validation';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_tokens ENABLE ROW LEVEL SECURITY;

-- Contact channels: owner can manage
CREATE POLICY contact_channels_owner_all ON contact_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_channels.contact_id
        AND contacts.org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Contact preferences: owner can manage
CREATE POLICY contact_prefs_owner_all ON contact_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_preferences.contact_id
        AND contacts.org_id IN (
          SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    )
  );

-- Tenant policies: org members can read, admins can write
CREATE POLICY tenant_policies_read ON tenant_policies
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY tenant_policies_write ON tenant_policies
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  );

-- Preference tokens: public read with valid token
CREATE POLICY preference_tokens_public_read ON preference_tokens
  FOR SELECT USING (
    used_at IS NULL 
    AND expires_at > now()
  );

-- ============================================================================
-- SAMPLE DATA FUNCTIONS
-- ============================================================================

-- Create default tenant policies
CREATE OR REPLACE FUNCTION create_default_tenant_policies(p_org_id UUID)
RETURNS UUID AS $$
DECLARE
  v_policy_id UUID;
BEGIN
  INSERT INTO tenant_policies (org_id, version, policy_sets)
  VALUES (
    p_org_id,
    1,
    '[
      {
        "key": "send_caps",
        "rules": {
          "per_tenant_per_day": 5000,
          "per_user_per_day": 500,
          "per_contact_per_week": 3,
          "per_channel": {"sms": 2000, "email": 4000, "ig_dm": 500}
        }
      },
      {
        "key": "approvals",
        "rules": {
          "require_human_for": [
            {"when": "warmth_score < 20"}
          ]
        }
      },
      {
        "key": "compliance",
        "rules": {
          "respect_quiet_hours": true,
          "block_if_opted_out": true,
          "double_opt_in_required": {"sms": true, "email": false}
        }
      }
    ]'::jsonb
  )
  RETURNING id INTO v_policy_id;
  
  RETURN v_policy_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_tenant_policies IS 'Creates sensible default policies for a new organization';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_contact_channels_lookup ON contact_channels(contact_id, opt_status, affinity_score DESC);
CREATE INDEX idx_contact_prefs_ai_timing ON contact_preferences(allow_ai_outreach, quiet_hours_start, quiet_hours_end) 
  WHERE allow_ai_outreach = true;

-- GIN indexes for JSONB
CREATE INDEX idx_tenant_policies_compliance ON tenant_policies 
  USING GIN((policy_sets -> 'compliance'));

-- Partial indexes for active channels
CREATE INDEX idx_channels_active ON contact_channels(contact_id, channel) 
  WHERE opt_status = 'opted_in' AND deliverability_score > 50;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Contact preferences and communication channels system installed';
