-- Notifications System Migration
-- Enables push notifications and in-app notifications for import completion

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications for users';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(user_id, type);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Create push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, token)
);

COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for users';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_tokens(user_id, enabled) WHERE enabled = TRUE;

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- 3. Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = NOW(),
      updated_at = NOW()
  WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION mark_notification_read IS 'Mark a notification as read';

-- 4. Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = NOW(),
      updated_at = NOW()
  WHERE user_id = auth.uid()
    AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Mark all notifications as read for current user';

-- 5. Create function to delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications
  WHERE read = TRUE
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Delete read notifications older than 30 days';

-- Verify migration
DO $$
DECLARE
    notifications_exists BOOLEAN;
    push_tokens_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications'
    ) INTO notifications_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'push_tokens'
    ) INTO push_tokens_exists;
    
    IF notifications_exists AND push_tokens_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════';
        RAISE NOTICE '✅ NOTIFICATIONS SYSTEM MIGRATION SUCCESSFUL';
        RAISE NOTICE '═══════════════════════════════════════════════';
        RAISE NOTICE 'Tables Created:';
        RAISE NOTICE '  ✅ notifications (in-app notifications)';
        RAISE NOTICE '  ✅ push_tokens (Expo push tokens)';
        RAISE NOTICE '';
        RAISE NOTICE 'Functions Created:';
        RAISE NOTICE '  ✅ mark_notification_read()';
        RAISE NOTICE '  ✅ mark_all_notifications_read()';
        RAISE NOTICE '  ✅ cleanup_old_notifications()';
        RAISE NOTICE '';
        RAISE NOTICE 'Ready for:';
        RAISE NOTICE '  • Push notifications on import completion';
        RAISE NOTICE '  • In-app notification center';
        RAISE NOTICE '  • Expo token registration';
        RAISE NOTICE '═══════════════════════════════════════════════';
    ELSE
        RAISE WARNING '⚠️  MIGRATION INCOMPLETE';
        RAISE WARNING '  notifications exists: %', notifications_exists;
        RAISE WARNING '  push_tokens exists: %', push_tokens_exists;
    END IF;
END $$;
