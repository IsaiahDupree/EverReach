-- =====================================================
-- WARMTH ALERTS SYSTEM
-- =====================================================
-- Feature: Push notifications when VIP/watched contacts go cold
-- Created: 2025-10-05
-- 
-- Tables:
-- 1. contacts (add watch columns)
-- 2. warmth_alerts (new table)
-- 3. user_push_tokens (new table)
-- =====================================================

-- =====================================================
-- 1. ADD WATCH STATUS TO CONTACTS
-- =====================================================

-- Add watch status and alert configuration
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS watch_status TEXT DEFAULT 'none' CHECK (watch_status IN ('none', 'watch', 'important', 'vip')),
ADD COLUMN IF NOT EXISTS warmth_alert_threshold INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS last_warmth_alert_sent_at TIMESTAMPTZ;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_contacts_watch_status 
ON contacts (watch_status, warmth, last_warmth_alert_sent_at) 
WHERE watch_status != 'none';

COMMENT ON COLUMN contacts.watch_status IS 'none, watch, important, or vip - determines if user gets alerts';
COMMENT ON COLUMN contacts.warmth_alert_threshold IS 'Warmth score below which to trigger alert (default 30)';
COMMENT ON COLUMN contacts.last_warmth_alert_sent_at IS 'Last time a warmth alert was sent for this contact';

-- =====================================================
-- 2. WARMTH ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS warmth_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('dropped_below', 'rapid_decline', 'extended_silence')),
  warmth_at_alert INT NOT NULL,
  warmth_threshold INT NOT NULL,
  days_since_interaction INT,
  previous_warmth INT,
  
  -- Notification
  notification_sent BOOLEAN DEFAULT false,
  notification_channel TEXT CHECK (notification_channel IN ('push', 'email', 'in_app')),
  notification_sent_at TIMESTAMPTZ,
  notification_error TEXT,
  
  -- User action
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  action_taken TEXT CHECK (action_taken IN ('reached_out', 'snoozed', 'removed_watch', 'ignored')),
  action_taken_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warmth_alerts_user 
ON warmth_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warmth_alerts_contact 
ON warmth_alerts (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warmth_alerts_pending 
ON warmth_alerts (user_id, dismissed, notification_sent) 
WHERE dismissed = false;

-- RLS Policies
ALTER TABLE warmth_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own alerts" ON warmth_alerts;
CREATE POLICY "Users can view their own alerts" 
ON warmth_alerts FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own alerts" ON warmth_alerts;
CREATE POLICY "Users can update their own alerts" 
ON warmth_alerts FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert alerts" ON warmth_alerts;
CREATE POLICY "System can insert alerts" 
ON warmth_alerts FOR INSERT 
WITH CHECK (true); -- Cron job needs to insert

COMMENT ON TABLE warmth_alerts IS 'Logs of warmth-based alerts sent to users about their contacts';

-- =====================================================
-- 3. USER PUSH TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Token details
  push_token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT,
  device_name TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Preferences
  notifications_enabled BOOLEAN DEFAULT true,
  warmth_alerts_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user 
ON user_push_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active 
ON user_push_tokens (user_id, is_active, warmth_alerts_enabled) 
WHERE is_active = true AND warmth_alerts_enabled = true;

-- RLS Policies
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tokens" ON user_push_tokens;
CREATE POLICY "Users can view their own tokens" 
ON user_push_tokens FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own tokens" ON user_push_tokens;
CREATE POLICY "Users can insert their own tokens" 
ON user_push_tokens FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tokens" ON user_push_tokens;
CREATE POLICY "Users can update their own tokens" 
ON user_push_tokens FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own tokens" ON user_push_tokens;
CREATE POLICY "Users can delete their own tokens" 
ON user_push_tokens FOR DELETE 
USING (user_id = auth.uid());

COMMENT ON TABLE user_push_tokens IS 'Expo push notification tokens for users';

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to update warmth_alerts.updated_at
CREATE OR REPLACE FUNCTION update_warmth_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_warmth_alerts_updated_at ON warmth_alerts;
CREATE TRIGGER set_warmth_alerts_updated_at
  BEFORE UPDATE ON warmth_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_warmth_alerts_updated_at();

-- Function to update user_push_tokens.updated_at
CREATE OR REPLACE FUNCTION update_user_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_push_tokens_updated_at ON user_push_tokens;
CREATE TRIGGER set_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_push_tokens_updated_at();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON warmth_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;

-- =====================================================
-- COMPLETE
-- =====================================================

-- Verify tables created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'warmth_alerts') = 1, 
    'warmth_alerts table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_push_tokens') = 1, 
    'user_push_tokens table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'watch_status') = 1,
    'watch_status column not added to contacts';
  RAISE NOTICE 'Warmth alerts migration completed successfully! ✅';
END $$;
