-- =====================================================
-- COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- Order: Seed Data → Meta Platforms Schema
-- =====================================================

-- =====================================================
-- PART 1: SEED SAMPLE DATA FOR MARKETING INTELLIGENCE
-- =====================================================

DO $$
DECLARE
  test_user_id UUID;
  test_campaign_id UUID;
  power_user_persona_id INT;
BEGIN
  -- Find test user (must exist in auth.users)
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'isaiahdupree33@gmail.com'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user not found. Please sign up at the app first.';
  END IF;

  RAISE NOTICE '✅ Test user ID: %', test_user_id;

  -- 1. Create test campaign
  INSERT INTO campaign (campaign_id, name, channel, objective, start_at)
  VALUES (
    gen_random_uuid(),
    'Email Onboarding Campaign',
    'email',
    'User activation and engagement',
    NOW() - INTERVAL '30 days'
  )
  RETURNING campaign_id INTO test_campaign_id;

  RAISE NOTICE '✅ Created campaign: %', test_campaign_id;

  -- 2. Insert persona buckets
  INSERT INTO persona_bucket (label, description) VALUES
    ('Power User', 'High engagement users who use the platform daily'),
    ('Casual User', 'Moderate engagement users'),
    ('At-Risk User', 'Low engagement, potential churn risk')
  ON CONFLICT DO NOTHING;

  SELECT persona_bucket_id INTO power_user_persona_id
  FROM persona_bucket
  WHERE label = 'Power User'
  LIMIT 1;

  -- 3. Assign user to persona
  INSERT INTO user_persona (user_id, persona_bucket_id, confidence, assigned_at)
  VALUES (test_user_id, power_user_persona_id, 0.85, NOW())
  ON CONFLICT (user_id, persona_bucket_id) DO NOTHING;

  -- 4. Insert user events (funnel journey)
  INSERT INTO user_event (user_id, etype, occurred_at, campaign_id, source, intent_weight)
  VALUES
    (test_user_id, 'ad_click', NOW() - INTERVAL '30 days', test_campaign_id, 'email', 10),
    (test_user_id, 'landing_view', NOW() - INTERVAL '30 days', test_campaign_id, 'web', 5),
    (test_user_id, 'email_submitted', NOW() - INTERVAL '29 days', test_campaign_id, 'web', 30),
    (test_user_id, 'identity_enriched', NOW() - INTERVAL '29 days', test_campaign_id, 'web', 10),
    (test_user_id, 'email_open', NOW() - INTERVAL '28 days', test_campaign_id, 'email', 12),
    (test_user_id, 'email_click', NOW() - INTERVAL '28 days', test_campaign_id, 'email', 15),
    (test_user_id, 'trial_started', NOW() - INTERVAL '27 days', test_campaign_id, 'app', 25),
    (test_user_id, 'onboarding_step', NOW() - INTERVAL '27 days', test_campaign_id, 'app', 12),
    (test_user_id, 'feature_used', NOW() - INTERVAL '26 days', test_campaign_id, 'app', 10),
    (test_user_id, 'app_open', NOW() - INTERVAL '25 days', test_campaign_id, 'app', 8);

  -- Recent activity (last 7 days)
  INSERT INTO user_event (user_id, etype, occurred_at, source, intent_weight)
  VALUES
    (test_user_id, 'app_open', NOW() - INTERVAL '7 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '6 days', 'app', 10),
    (test_user_id, 'app_open', NOW() - INTERVAL '5 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '4 days', 'app', 10),
    (test_user_id, 'email_open', NOW() - INTERVAL '3 days', 'email', 12),
    (test_user_id, 'email_click', NOW() - INTERVAL '3 days', 'email', 15),
    (test_user_id, 'app_open', NOW() - INTERVAL '2 days', 'app', 8),
    (test_user_id, 'feature_used', NOW() - INTERVAL '1 day', 'app', 10),
    (test_user_id, 'app_open', NOW(), 'app', 8);

  RAISE NOTICE '✅ Inserted % user events', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id);

  -- 5. Compute and insert magnetism index
  INSERT INTO user_magnetism_index (user_id, index_value, time_window, computed_at, details)
  VALUES (
    test_user_id,
    compute_magnetism_index(test_user_id, '7d'),
    '7d',
    NOW(),
    jsonb_build_object(
      'high_engagement', true,
      'last_seen', NOW(),
      'events_last_7d', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id AND occurred_at >= NOW() - INTERVAL '7 days')
    )
  );

  -- 6. Insert intent scores
  INSERT INTO user_intent_score (user_id, score, source, computed_at, details)
  VALUES (
    test_user_id,
    compute_intent_score(test_user_id, NOW() - INTERVAL '30 days', NOW()),
    'automated_calculation',
    NOW(),
    jsonb_build_object(
      'period', '30d',
      'total_events', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id)
    )
  );

  -- 7. Insert user identity enrichment data
  INSERT INTO user_identity (user_id, full_name, company, role_title, linkedin, last_enriched_at, raw_enrichment)
  VALUES (
    test_user_id,
    'Isaiah Dupree',
    'Rork',
    'Founder & CEO',
    'https://linkedin.com/in/isaiah-dupree',
    NOW(),
    jsonb_build_object(
      'enrichment_source', 'clay',
      'confidence', 0.95,
      'audience_size', 5000
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_enriched_at = NOW(),
    full_name = EXCLUDED.full_name,
    company = EXCLUDED.company,
    role_title = EXCLUDED.role_title;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 SAMPLE DATA SEEDING COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Test user: %', test_user_id;
  RAISE NOTICE '  - Campaign: %', test_campaign_id;
  RAISE NOTICE '  - Events: %', (SELECT COUNT(*) FROM user_event WHERE user_id = test_user_id);
  RAISE NOTICE '  - Magnetism index: %', (SELECT index_value FROM user_magnetism_index WHERE user_id = test_user_id ORDER BY computed_at DESC LIMIT 1);
  RAISE NOTICE '  - Intent score: %', (SELECT score FROM user_intent_score WHERE user_id = test_user_id ORDER BY computed_at DESC LIMIT 1);

END $$;

RAISE NOTICE '';
RAISE NOTICE '===============================================';
RAISE NOTICE 'PART 1 COMPLETE: Marketing Intelligence Data Seeded';
RAISE NOTICE '===============================================';
RAISE NOTICE '';
RAISE NOTICE 'Proceeding to Part 2: Meta Platforms Schema...';
RAISE NOTICE '';

-- =====================================================
-- PART 2: META PLATFORMS INTEGRATION SCHEMA
-- =====================================================

-- Conversation threads across all Meta platforms
CREATE TABLE IF NOT EXISTS conversation_thread (
  thread_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_thread_id TEXT NOT NULL,
  page_id TEXT,
  phone_number_id TEXT,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  policy_window_expires_at TIMESTAMPTZ,
  human_agent_tag_expires_at TIMESTAMPTZ,
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
  platform_message_id TEXT,
  direction TEXT NOT NULL,
  message_type TEXT,
  content TEXT,
  media_url TEXT,
  template_name TEXT,
  status TEXT DEFAULT 'sent',
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_thread ON conversation_message(thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status ON conversation_message(status);
CREATE INDEX IF NOT EXISTS idx_message_platform_id ON conversation_message(platform_message_id);

-- Policy window tracking
CREATE TABLE IF NOT EXISTS messaging_policy_window (
  window_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_thread(thread_id) ON DELETE CASCADE,
  window_type TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  trigger_event TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_window_thread ON messaging_policy_window(thread_id, is_active);
CREATE INDEX IF NOT EXISTS idx_window_expiry ON messaging_policy_window(expires_at) WHERE is_active = TRUE;

-- Message deliveries & reads tracking
CREATE TABLE IF NOT EXISTS message_delivery_event (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES conversation_message(message_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_delivery_message ON message_delivery_event(message_id, occurred_at DESC);

-- Store platform credentials & config
CREATE TABLE IF NOT EXISTS meta_platform_config (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  ig_user_id TEXT,
  ig_username TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  phone_number TEXT,
  ad_account_id TEXT,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_active ON meta_platform_config(platform, is_active);

-- Facebook/Instagram posts/media
CREATE TABLE IF NOT EXISTS social_media_post (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL,
  page_id TEXT,
  ig_user_id TEXT,
  post_type TEXT,
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
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  period TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_post ON social_post_insights(post_id, metric_name);

-- Account-level insights
CREATE TABLE IF NOT EXISTS social_account_insights (
  insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
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

-- Ad-level insights
CREATE TABLE IF NOT EXISTS ad_performance (
  performance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaign(campaign_id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  platform_campaign_id TEXT,
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
  actions JSONB,
  metadata JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_perf_campaign ON ad_performance(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_perf_account ON ad_performance(ad_account_id, date DESC);

-- Track server-side events sent to Meta
CREATE TABLE IF NOT EXISTS meta_conversion_event (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pixel_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  action_source TEXT NOT NULL,
  event_source_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hashed_email TEXT,
  hashed_phone TEXT,
  client_ip_address TEXT,
  client_user_agent TEXT,
  fbp TEXT,
  fbc TEXT,
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

-- Log all incoming webhooks
CREATE TABLE IF NOT EXISTS meta_webhook_event (
  webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_platform ON meta_webhook_event(platform, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON meta_webhook_event(processed, received_at DESC);

-- Helper function: Check if thread is in valid messaging window
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

-- Trigger: Log messages as events
CREATE OR REPLACE FUNCTION log_message_as_event()
RETURNS TRIGGER AS $$
BEGIN
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
        'message_type', NEW.message_type
      )
    FROM conversation_thread ct
    WHERE ct.thread_id = NEW.thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_message_to_event ON conversation_message;
CREATE TRIGGER trigger_message_to_event
  AFTER INSERT ON conversation_message
  FOR EACH ROW
  EXECUTE FUNCTION log_message_as_event();

-- Trigger: Update thread timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_thread
  SET last_message_at = NEW.sent_at
  WHERE thread_id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_timestamp ON conversation_message;
CREATE TRIGGER trigger_update_thread_timestamp
  AFTER INSERT ON conversation_message
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- Row Level Security
ALTER TABLE conversation_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_message ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own threads" ON conversation_thread;
CREATE POLICY "Users can view own threads" 
  ON conversation_thread FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own messages" ON conversation_message;
CREATE POLICY "Users can view own messages" 
  ON conversation_message FOR SELECT 
  USING (thread_id IN (SELECT thread_id FROM conversation_thread WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role full access threads" ON conversation_thread;
CREATE POLICY "Service role full access threads" 
  ON conversation_thread FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access messages" ON conversation_message;
CREATE POLICY "Service role full access messages" 
  ON conversation_message FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

RAISE NOTICE '';
RAISE NOTICE '🎉 META PLATFORMS SCHEMA COMPLETE!';
RAISE NOTICE '';
RAISE NOTICE '===============================================';
RAISE NOTICE 'SUMMARY';
RAISE NOTICE '===============================================';
RAISE NOTICE 'Part 1: Marketing Intelligence';
RAISE NOTICE '  ✅ Sample data seeded';
RAISE NOTICE '  ✅ 19 user events created';
RAISE NOTICE '  ✅ Magnetism & intent scores calculated';
RAISE NOTICE '';
RAISE NOTICE 'Part 2: Meta Platforms';
RAISE NOTICE '  ✅ 11 tables created';
RAISE NOTICE '  ✅ 3 functions created';
RAISE NOTICE '  ✅ 2 triggers created';
RAISE NOTICE '  ✅ 4 RLS policies created';
RAISE NOTICE '';
RAISE NOTICE '🚀 DATABASE SETUP COMPLETE!';
RAISE NOTICE '';
