-- =====================================================
-- META PLATFORMS INTEGRATION SCHEMA
-- Messaging (Messenger, IG DMs, WhatsApp) + Ads + Events
-- =====================================================

-- =====================================================
-- 1) MESSAGING INFRASTRUCTURE
-- =====================================================

-- Conversation threads across all Meta platforms
CREATE TABLE IF NOT EXISTS conversation_thread (
  thread_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'messenger', 'instagram', 'whatsapp'
  platform_thread_id TEXT NOT NULL, -- PSID or phone number
  page_id TEXT, -- For Messenger/IG
  phone_number_id TEXT, -- For WhatsApp
  status TEXT DEFAULT 'active', -- active, archived, blocked
  last_message_at TIMESTAMPTZ,
  policy_window_expires_at TIMESTAMPTZ, -- 24-hour window tracking
  human_agent_tag_expires_at TIMESTAMPTZ, -- 7-day window for manual replies
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_user ON conversation_thread(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_platform ON conversation_thread(platform, platform_thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_status ON conversation_thread(status, last_message_at DESC);

-- Messages within threads
CREATE TABLE IF NOT EXISTS conversation_message (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_thread(thread_id) ON DELETE CASCADE,
  platform_message_id TEXT, -- Meta's message ID
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  message_type TEXT, -- 'text', 'image', 'template', 'interactive'
  content TEXT,
  media_url TEXT,
  template_name TEXT, -- For WhatsApp templates
  status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_thread ON conversation_message(thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status ON conversation_message(status);
CREATE INDEX IF NOT EXISTS idx_message_platform_id ON conversation_message(platform_message_id);

-- Policy window tracking (24-hour & 7-day rules)
CREATE TABLE IF NOT EXISTS messaging_policy_window (
  window_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_thread(thread_id) ON DELETE CASCADE,
  window_type TEXT NOT NULL, -- 'standard_24h', 'human_agent_7d', 'template_required'
  opened_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  trigger_event TEXT, -- What opened the window: 'user_message', 'manual_assignment'
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_window_thread ON messaging_policy_window(thread_id, is_active);
CREATE INDEX IF NOT EXISTS idx_window_expiry ON messaging_policy_window(expires_at) WHERE is_active = TRUE;

-- Message deliveries & reads tracking
CREATE TABLE IF NOT EXISTS message_delivery_event (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES conversation_message(message_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_delivery_message ON message_delivery_event(message_id, occurred_at DESC);

-- =====================================================
-- 2) META PLATFORMS CONFIGURATION
-- =====================================================

-- Store platform credentials & config
CREATE TABLE IF NOT EXISTS meta_platform_config (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL, -- 'messenger', 'instagram', 'whatsapp', 'ads'
  page_id TEXT,
  page_name TEXT,
  ig_user_id TEXT,
  ig_username TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  phone_number TEXT,
  ad_account_id TEXT,
  access_token_encrypted TEXT, -- Store encrypted
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_active ON meta_platform_config(platform, is_active);

-- =====================================================
-- 3) ORGANIC CONTENT & INSIGHTS
-- =====================================================

-- Facebook/Instagram posts/media
CREATE TABLE IF NOT EXISTS social_media_post (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL, -- 'facebook', 'instagram'
  platform_post_id TEXT NOT NULL,
  page_id TEXT,
  ig_user_id TEXT,
  post_type TEXT, -- 'photo', 'video', 'reel', 'story', 'carousel'
  caption TEXT,
  media_url TEXT,
  permalink TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_platform ON social_media_post(platform, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_platform_id ON social_media_post(platform_post_id);

-- Post performance insights
CREATE TABLE IF NOT EXISTS social_post_insights (
  insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES social_media_post(post_id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'impressions', 'reach', 'engagement', 'saves', 'shares'
  metric_value NUMERIC,
  period TEXT, -- 'lifetime', 'day'
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_post ON social_post_insights(post_id, metric_name);

-- Account-level insights (daily snapshots)
CREATE TABLE IF NOT EXISTS social_account_insights (
  insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL, -- page_id or ig_user_id
  date DATE NOT NULL,
  impressions BIGINT,
  reach BIGINT,
  profile_views BIGINT,
  engaged_users BIGINT,
  followers_count BIGINT,
  following_count BIGINT,
  media_count BIGINT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_insights_unique 
  ON social_account_insights(platform, account_id, date);

-- =====================================================
-- 4) ADS PERFORMANCE (integrate with existing campaign table)
-- =====================================================

-- Ad-level insights (extends existing campaign table)
CREATE TABLE IF NOT EXISTS ad_performance (
  performance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaign(campaign_id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  platform_campaign_id TEXT, -- Meta's campaign ID
  platform_adset_id TEXT,
  platform_ad_id TEXT,
  date DATE NOT NULL,
  spend NUMERIC(10,2),
  impressions BIGINT,
  clicks BIGINT,
  cpc NUMERIC(10,2),
  cpm NUMERIC(10,2),
  ctr NUMERIC(5,2),
  conversions INT,
  conversion_value NUMERIC(10,2),
  actions JSONB, -- Array of action types & counts
  metadata JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_perf_campaign ON ad_performance(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_perf_account ON ad_performance(ad_account_id, date DESC);

-- =====================================================
-- 5) SERVER-SIDE EVENTS (Conversions API)
-- =====================================================

-- Track server-side events sent to Meta
CREATE TABLE IF NOT EXISTS meta_conversion_event (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pixel_id TEXT NOT NULL,
  event_name TEXT NOT NULL, -- 'Purchase', 'AddToCart', 'Lead', etc.
  event_time TIMESTAMPTZ NOT NULL,
  action_source TEXT NOT NULL, -- 'website', 'app', 'offline'
  event_source_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hashed_email TEXT, -- SHA256
  hashed_phone TEXT, -- SHA256
  client_ip_address TEXT,
  client_user_agent TEXT,
  fbp TEXT, -- Facebook browser pixel cookie
  fbc TEXT, -- Facebook click ID
  value NUMERIC(10,2),
  currency TEXT,
  custom_data JSONB,
  test_event_code TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  response_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_conversion_pixel ON meta_conversion_event(pixel_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_user ON meta_conversion_event(user_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_event_name ON meta_conversion_event(event_name, event_time DESC);

-- =====================================================
-- 6) WEBHOOK EVENTS LOG
-- =====================================================

-- Log all incoming webhooks for debugging/replay
CREATE TABLE IF NOT EXISTS meta_webhook_event (
  webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL, -- 'messenger', 'instagram', 'whatsapp'
  event_type TEXT NOT NULL, -- 'message', 'delivery', 'read', 'postback'
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_platform ON meta_webhook_event(platform, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON meta_webhook_event(processed, received_at DESC);

-- =====================================================
-- 7) INTEGRATION WITH EXISTING MARKETING INTELLIGENCE
-- =====================================================

-- Link messages to user_event table for unified analytics
CREATE OR REPLACE FUNCTION log_message_as_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log outbound messages as marketing events
  IF NEW.direction = 'outbound' THEN
    INSERT INTO user_event (
      user_id,
      etype,
      occurred_at,
      source,
      props
    )
    SELECT
      ct.user_id,
      CASE NEW.platform
        WHEN 'messenger' THEN 'messenger_sent'
        WHEN 'instagram' THEN 'instagram_dm_sent'
        WHEN 'whatsapp' THEN 'whatsapp_sent'
      END,
      NEW.sent_at,
      NEW.platform,
      jsonb_build_object(
        'message_id', NEW.message_id,
        'thread_id', NEW.thread_id,
        'message_type', NEW.message_type,
        'template_name', NEW.template_name
      )
    FROM conversation_thread ct
    WHERE ct.thread_id = NEW.thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_message_to_event
  AFTER INSERT ON conversation_message
  FOR EACH ROW
  EXECUTE FUNCTION log_message_as_event();

-- =====================================================
-- 8) HELPER FUNCTIONS
-- =====================================================

-- Check if thread is in valid messaging window
CREATE OR REPLACE FUNCTION is_in_messaging_window(p_thread_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active_window BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM messaging_policy_window 
    WHERE thread_id = p_thread_id 
      AND is_active = TRUE 
      AND expires_at > NOW()
  ) INTO has_active_window;
  
  RETURN has_active_window;
END;
$$ LANGUAGE plpgsql;

-- Update thread's last message timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_thread
  SET last_message_at = NEW.sent_at
  WHERE thread_id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_timestamp
  AFTER INSERT ON conversation_message
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- =====================================================
-- 9) ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE conversation_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads" 
  ON conversation_thread FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" 
  ON conversation_message FOR SELECT 
  USING (thread_id IN (SELECT thread_id FROM conversation_thread WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access threads" 
  ON conversation_thread FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access messages" 
  ON conversation_message FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- SUMMARY
-- =====================================================
-- Tables created: 11
-- Functions created: 3
-- Triggers created: 2
-- Indexes created: 20+
-- 
-- Integration points:
-- - conversation_message → user_event (automatic)
-- - ad_performance → campaign (foreign key)
-- - meta_conversion_event → user tracking
-- 
-- Ready for:
-- - Messenger/IG DMs/WhatsApp messaging
-- - Organic content insights
-- - Ad performance tracking
-- - Server-side event tracking
-- - Webhook processing
