-- Create notification_history table for tracking sent notifications and rate limiting
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'relationship_drifting', etc.
  message TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  deeplink TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_contact_id ON notification_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type_date ON notification_history(notification_type, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_type_date ON notification_history(user_id, notification_type, created_at);

-- Enable RLS
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own notification history
CREATE POLICY notification_history_user_access ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policy: Backend service can insert
CREATE POLICY notification_history_insert ON notification_history
  FOR INSERT WITH CHECK (true);
