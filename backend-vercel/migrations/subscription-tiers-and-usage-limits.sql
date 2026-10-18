-- Subscription Tiers and Usage Limits Migration
-- Adds tier-based limits for screenshot analysis and other AI features
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add subscription_tier to profiles table
-- ============================================================================

-- Add tier column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'core' 
      CHECK (subscription_tier IN ('core', 'pro', 'enterprise'));
  END IF;
END $$;

-- Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Update existing users to 'core' tier if NULL
UPDATE profiles SET subscription_tier = 'core' WHERE subscription_tier IS NULL;

-- ============================================================================
-- STEP 2: Create user_usage_limits table for monthly tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_usage_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Usage period (monthly)
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Screenshot analysis usage
    screenshots_used INT DEFAULT 0 NOT NULL,
    screenshots_limit INT NOT NULL, -- Set based on tier
    
    -- Future: Voice note processing
    voice_notes_used INT DEFAULT 0 NOT NULL,
    voice_notes_limit INT DEFAULT -1, -- -1 = unlimited
    
    -- Future: AI chat messages
    chat_messages_used INT DEFAULT 0 NOT NULL,
    chat_messages_limit INT DEFAULT -1, -- -1 = unlimited
    
    -- Future: Smart compose generations
    compose_generations_used INT DEFAULT 0 NOT NULL,
    compose_generations_limit INT DEFAULT -1, -- -1 = unlimited
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraint: One record per user per period
    UNIQUE(user_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_user_id ON user_usage_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_period ON user_usage_limits(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_active_period ON user_usage_limits(user_id) 
  WHERE period_end > NOW();

-- Enable RLS
ALTER TABLE user_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage limits" ON user_usage_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage limits" ON user_usage_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits" ON user_usage_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_usage_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_usage_limits_updated_at_trigger
  BEFORE UPDATE ON user_usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_user_usage_limits_updated_at();

-- ============================================================================
-- STEP 3: Helper functions for usage limit management
-- ============================================================================

-- Function to get or create current usage period for user
CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id UUID)
RETURNS user_usage_limits AS $$
DECLARE
  v_period user_usage_limits;
  v_tier TEXT;
  v_screenshot_limit INT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Calculate current period (monthly, 1st of month to end of month)
  v_period_start := DATE_TRUNC('month', NOW());
  v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');
  
  -- Try to get existing period
  SELECT * INTO v_period
  FROM user_usage_limits
  WHERE user_id = p_user_id
    AND period_start = v_period_start
    AND period_end = v_period_end;
  
  -- If not found, create new period
  IF v_period.id IS NULL THEN
    -- Get user's tier
    SELECT subscription_tier INTO v_tier
    FROM profiles
    WHERE user_id = p_user_id;
    
    -- Default to 'core' if no tier found
    v_tier := COALESCE(v_tier, 'core');
    
    -- Set limits based on tier
    CASE v_tier
      WHEN 'core' THEN
        v_screenshot_limit := 100;
      WHEN 'pro' THEN
        v_screenshot_limit := 300;
      WHEN 'enterprise' THEN
        v_screenshot_limit := -1; -- unlimited
      ELSE
        v_screenshot_limit := 100; -- default to core
    END CASE;
    
    -- Insert new period
    INSERT INTO user_usage_limits (
      user_id,
      period_start,
      period_end,
      screenshots_limit
    ) VALUES (
      p_user_id,
      v_period_start,
      v_period_end,
      v_screenshot_limit
    )
    RETURNING * INTO v_period;
  END IF;
  
  RETURN v_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use screenshot analysis
CREATE OR REPLACE FUNCTION can_use_screenshot_analysis(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_usage user_usage_limits;
BEGIN
  v_usage := get_or_create_usage_period(p_user_id);
  
  -- -1 means unlimited
  IF v_usage.screenshots_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN v_usage.screenshots_used < v_usage.screenshots_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment screenshot usage
CREATE OR REPLACE FUNCTION increment_screenshot_usage(p_user_id UUID)
RETURNS user_usage_limits AS $$
DECLARE
  v_usage user_usage_limits;
BEGIN
  -- Get or create current period
  v_usage := get_or_create_usage_period(p_user_id);
  
  -- Increment usage
  UPDATE user_usage_limits
  SET screenshots_used = screenshots_used + 1,
      updated_at = NOW()
  WHERE id = v_usage.id
  RETURNING * INTO v_usage;
  
  RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Tier Limits Reference Table (for documentation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_limits_reference (
    tier TEXT PRIMARY KEY CHECK (tier IN ('core', 'pro', 'enterprise')),
    screenshots_per_month INT NOT NULL, -- -1 = unlimited
    voice_notes_per_month INT NOT NULL, -- -1 = unlimited
    chat_messages_per_month INT NOT NULL, -- -1 = unlimited
    compose_generations_per_month INT NOT NULL, -- -1 = unlimited
    price_monthly_usd NUMERIC(10,2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert tier definitions
INSERT INTO tier_limits_reference (tier, screenshots_per_month, voice_notes_per_month, chat_messages_per_month, compose_generations_per_month, price_monthly_usd, description)
VALUES 
  ('core', 100, -1, -1, -1, 0, 'Free tier with 100 screenshots/month'),
  ('pro', 300, -1, -1, -1, 29.99, 'Pro tier with 300 screenshots/month'),
  ('enterprise', -1, -1, -1, -1, 99.99, 'Enterprise tier with unlimited usage')
ON CONFLICT (tier) DO UPDATE SET
  screenshots_per_month = EXCLUDED.screenshots_per_month,
  voice_notes_per_month = EXCLUDED.voice_notes_per_month,
  chat_messages_per_month = EXCLUDED.chat_messages_per_month,
  compose_generations_per_month = EXCLUDED.compose_generations_per_month,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  description = EXCLUDED.description;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show tier limits
SELECT * FROM tier_limits_reference ORDER BY price_monthly_usd;

-- Count users by tier
SELECT subscription_tier, COUNT(*) as user_count
FROM profiles
GROUP BY subscription_tier;

-- Show current usage for auth user (test in authenticated context)
-- SELECT * FROM user_usage_limits WHERE user_id = auth.uid();

SELECT 'Subscription tiers and usage limits installed successfully!' as status;
