-- Migration: Live Paywall Configuration
-- Purpose: Store which paywall is currently live per platform per user
-- Created: 2025-11-15

-- Create live_paywall_config table
CREATE TABLE IF NOT EXISTS live_paywall_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  paywall_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('custom', 'superwall', 'revenuecat')),
  configuration JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one live paywall per platform per user
  UNIQUE(user_id, platform)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_live_paywall_config_user_platform 
  ON live_paywall_config(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_live_paywall_config_user_id 
  ON live_paywall_config(user_id);

-- Enable Row Level Security
ALTER TABLE live_paywall_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/modify their own live paywall config
CREATE POLICY "Users can view own live paywall config"
  ON live_paywall_config
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own live paywall config"
  ON live_paywall_config
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own live paywall config"
  ON live_paywall_config
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own live paywall config"
  ON live_paywall_config
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE live_paywall_config IS 
  'Stores which paywall is currently live per platform per user. Only ONE paywall can be live per platform.';

COMMENT ON COLUMN live_paywall_config.platform IS 
  'Platform: ios, android, or web';

COMMENT ON COLUMN live_paywall_config.paywall_id IS 
  'The paywall identifier (e.g., everreach_pro_paywall, superwall placement ID, revenuecat offering ID)';

COMMENT ON COLUMN live_paywall_config.provider IS 
  'Paywall provider: custom (in-app), superwall, or revenuecat';

COMMENT ON COLUMN live_paywall_config.configuration IS 
  'Optional configuration JSON for platform-specific display settings';
