-- =====================================================
-- Paywall Strategy System Migration
-- Description: Comprehensive paywall configuration system
-- Date: 2025-11-12
-- =====================================================

-- 1. PAYWALL STRATEGIES TABLE
-- Defines the core paywall behaviors (hard, soft, hybrid)
CREATE TABLE IF NOT EXISTS paywall_strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('hard-hard', 'hard', 'hard-soft')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('always', 'time', 'usage', 'feature')),
  trigger_value JSONB, -- e.g., {"days": 7} or {"hours": 10}
  can_skip BOOLEAN NOT NULL DEFAULT false,
  free_access_level TEXT NOT NULL CHECK (free_access_level IN ('none', 'settings_only', 'contacts_list', 'read_only')),
  post_purchase_redirect TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default strategies
INSERT INTO paywall_strategies (id, name, mode, trigger_type, trigger_value, can_skip, free_access_level, post_purchase_redirect, description) VALUES
  ('HH_LOGIN_LOCKED', 'Hard-Hard: Always Locked', 'hard-hard', 'always', '{}', false, 'settings_only', '/subscription', 'Nuclear option. App unusable until subscribed (abusive users).'),
  ('HARD_AFTER_7D', 'Hard: 7-Day Trial', 'hard', 'time', '{"days": 7}', false, 'contacts_list', '/subscription', 'Standard 7-day trial, hard paywall after.'),
  ('HARD_AFTER_30D', 'Hard: 30-Day Trial', 'hard', 'time', '{"days": 30}', false, 'contacts_list', '/subscription', 'Extended 30-day trial, hard paywall after.'),
  ('HARD_AFTER_USAGE', 'Hard: Usage-Based Trial', 'hard', 'usage', '{"hours": 10}', false, 'contacts_list', '/subscription', 'Usage-based trial (X hours), hard paywall after.'),
  ('SOFT_AFTER_7D', 'Soft: 7-Day Trial', 'hard-soft', 'time', '{"days": 7}', true, 'read_only', '/app', 'Gentle 7-day trial, dismissible paywall.'),
  ('SOFT_AFTER_30D', 'Soft: 30-Day Trial', 'hard-soft', 'time', '{"days": 30}', true, 'read_only', '/app', 'Gentle 30-day trial, dismissible paywall.'),
  ('SOFT_AFTER_USAGE', 'Soft: Usage-Based Trial', 'hard-soft', 'usage', '{"hours": 10}', true, 'read_only', '/app', 'Usage-based soft paywall (X hours).');

-- 2. PAYWALL PRESENTATIONS TABLE
-- Defines how the paywall looks/feels
CREATE TABLE IF NOT EXISTS paywall_presentations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('static', 'video', 'appstore', 'custom')),
  template_data JSONB, -- Configuration for the presentation
  preview_url TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default presentations
INSERT INTO paywall_presentations (id, name, variant, description) VALUES
  ('PAYWALL_STATIC', 'Static Pricing Screen', 'static', 'Standard pricing table with features and CTA buttons.'),
  ('PAYWALL_ONBOARDING_VIDEO', 'Video Onboarding Flow', 'video', 'Step 1: intro, Step 2: paywall with explainer video.'),
  ('PAYWALL_APPSTORE_PREVIEW', 'App Store Style', 'appstore', 'Screenshots, testimonials, feature highlights, then pricing.');

-- 3. TRIAL TYPES TABLE
-- Defines trial duration/condition logic
CREATE TABLE IF NOT EXISTS trial_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('time', 'usage', 'none')),
  duration_days INTEGER,
  usage_hours INTEGER,
  usage_sessions INTEGER,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default trial types
INSERT INTO trial_types (id, name, type, duration_days, description) VALUES
  ('TRIAL_7_DAYS', '7-Day Trial', 'time', 7, '7 days from signup'),
  ('TRIAL_30_DAYS', '30-Day Trial', 'time', 30, '30 days from signup'),
  ('NO_TRIAL_LOCKED', 'No Trial (Always Locked)', 'none', NULL, 'Immediately locked, no trial period');

INSERT INTO trial_types (id, name, type, usage_hours, description) VALUES
  ('TRIAL_USAGE_10H', '10-Hour Usage Trial', 'usage', 10, 'Trial ends after 10 hours of usage');

-- 4. ACTIVE PAYWALL CONFIG TABLE
-- The single source of truth for current paywall config
CREATE TABLE IF NOT EXISTS active_paywall_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('mobile', 'web', 'all')) DEFAULT 'all',
  strategy_id TEXT NOT NULL REFERENCES paywall_strategies(id),
  presentation_id TEXT NOT NULL REFERENCES paywall_presentations(id),
  trial_type_id TEXT NOT NULL REFERENCES trial_types(id),
  
  -- Review prompt settings
  enable_mobile_review_prompts BOOLEAN DEFAULT true,
  enable_web_review_prompts BOOLEAN DEFAULT true,
  review_prompt_delay_minutes INTEGER DEFAULT 1440, -- 24 hours
  review_prompts_per_year INTEGER DEFAULT 4,
  review_prompt_min_sessions INTEGER DEFAULT 5,
  
  -- Usage tracking settings
  usage_cap_hours INTEGER,
  usage_cap_sessions INTEGER,
  
  -- Flags
  enable_hard_hard_for_flagged BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(platform)
);

-- Insert default configs for each platform
INSERT INTO active_paywall_config (platform, strategy_id, presentation_id, trial_type_id) VALUES
  ('mobile', 'SOFT_AFTER_7D', 'PAYWALL_ONBOARDING_VIDEO', 'TRIAL_7_DAYS'),
  ('web', 'SOFT_AFTER_7D', 'PAYWALL_STATIC', 'TRIAL_7_DAYS'),
  ('all', 'SOFT_AFTER_7D', 'PAYWALL_STATIC', 'TRIAL_7_DAYS');

-- 5. ACCESS PERMISSIONS TABLE
-- Defines what features are accessible for each strategy/status
CREATE TABLE IF NOT EXISTS paywall_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT NOT NULL REFERENCES paywall_strategies(id),
  feature_area TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT false,
  access_level TEXT CHECK (access_level IN ('none', 'view_only', 'full')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(strategy_id, feature_area)
);

-- Insert default permissions for each strategy
-- HH_LOGIN_LOCKED permissions
INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level, notes) VALUES
  ('HH_LOGIN_LOCKED', 'login_auth', true, 'full', 'Can login but immediately see paywall'),
  ('HH_LOGIN_LOCKED', 'onboarding', true, 'full', 'Can complete onboarding'),
  ('HH_LOGIN_LOCKED', 'contacts_list', false, 'none', 'Completely blocked'),
  ('HH_LOGIN_LOCKED', 'contact_detail', false, 'none', 'Completely blocked'),
  ('HH_LOGIN_LOCKED', 'settings', true, 'full', 'Account, billing, logout only'),
  ('HH_LOGIN_LOCKED', 'pro_features', false, 'none', 'All blocked');

-- HARD_* permissions (same for all hard strategies)
INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level, notes) VALUES
  ('HARD_AFTER_7D', 'login_auth', true, 'full', 'Can login'),
  ('HARD_AFTER_7D', 'onboarding', true, 'full', 'Full onboarding access'),
  ('HARD_AFTER_7D', 'contacts_list', true, 'view_only', 'Can see list, no detail view'),
  ('HARD_AFTER_7D', 'contact_detail', false, 'none', 'Blocked - redirects to paywall'),
  ('HARD_AFTER_7D', 'settings', true, 'full', 'Full access to settings'),
  ('HARD_AFTER_7D', 'pro_features', false, 'none', 'All blocked, cannot skip paywall');

-- Repeat for HARD_AFTER_30D and HARD_AFTER_USAGE
INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level)
SELECT 'HARD_AFTER_30D', feature_area, can_access, access_level
FROM paywall_access_permissions WHERE strategy_id = 'HARD_AFTER_7D';

INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level)
SELECT 'HARD_AFTER_USAGE', feature_area, can_access, access_level
FROM paywall_access_permissions WHERE strategy_id = 'HARD_AFTER_7D';

-- SOFT_* permissions (same for all soft strategies)
INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level, notes) VALUES
  ('SOFT_AFTER_7D', 'login_auth', true, 'full', 'Can login'),
  ('SOFT_AFTER_7D', 'onboarding', true, 'full', 'Full onboarding access'),
  ('SOFT_AFTER_7D', 'contacts_list', true, 'view_only', 'Can see list, no detail view'),
  ('SOFT_AFTER_7D', 'contact_detail', false, 'none', 'Blocked - redirects to paywall (can dismiss)'),
  ('SOFT_AFTER_7D', 'settings', true, 'full', 'Full access to settings'),
  ('SOFT_AFTER_7D', 'pro_features', false, 'none', 'Blocked but user can skip paywall');

-- Repeat for SOFT_AFTER_30D and SOFT_AFTER_USAGE
INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level)
SELECT 'SOFT_AFTER_30D', feature_area, can_access, access_level
FROM paywall_access_permissions WHERE strategy_id = 'SOFT_AFTER_7D';

INSERT INTO paywall_access_permissions (strategy_id, feature_area, can_access, access_level)
SELECT 'SOFT_AFTER_USAGE', feature_area, can_access, access_level
FROM paywall_access_permissions WHERE strategy_id = 'SOFT_AFTER_7D';

-- 6. REVIEW PROMPTS TRACKING
-- Track when review prompts were shown to enforce annual cap
CREATE TABLE IF NOT EXISTS review_prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('mobile_ios', 'mobile_android', 'web')),
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('after_purchase', 'after_usage')),
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT false,
  action_taken TEXT, -- 'reviewed', 'dismissed', 'later'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER USAGE TRACKING
-- Track usage for usage-based trials
CREATE TABLE IF NOT EXISTS user_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_active_minutes INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 8. INDEXES
CREATE INDEX idx_paywall_strategies_enabled ON paywall_strategies(enabled);
CREATE INDEX idx_active_paywall_config_platform ON active_paywall_config(platform);
CREATE INDEX idx_review_prompt_history_user ON review_prompt_history(user_id, shown_at DESC);
CREATE INDEX idx_review_prompt_history_year ON review_prompt_history(user_id, EXTRACT(YEAR FROM shown_at));
CREATE INDEX idx_user_usage_tracking_user ON user_usage_tracking(user_id);

-- 9. COMMENTS
COMMENT ON TABLE paywall_strategies IS 'Defines paywall behavior modes (hard, soft, hybrid)';
COMMENT ON TABLE paywall_presentations IS 'Defines paywall visual presentation variants';
COMMENT ON TABLE trial_types IS 'Defines trial duration and conditions';
COMMENT ON TABLE active_paywall_config IS 'Current active paywall configuration per platform';
COMMENT ON TABLE paywall_access_permissions IS 'Feature access matrix for each strategy';
COMMENT ON TABLE review_prompt_history IS 'Tracks review prompt display history for annual cap enforcement';
COMMENT ON TABLE user_usage_tracking IS 'Tracks user session time and count for usage-based trials';

-- 10. FUNCTIONS

-- Function to check if user can be shown review prompt
CREATE OR REPLACE FUNCTION can_show_review_prompt(
  p_user_id UUID,
  p_platform TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_prompts_this_year INTEGER;
  v_last_prompt_at TIMESTAMPTZ;
  v_config RECORD;
BEGIN
  -- Get active config
  SELECT * INTO v_config FROM active_paywall_config 
  WHERE platform = p_platform OR platform = 'all'
  ORDER BY platform DESC LIMIT 1;
  
  -- Check if prompts enabled for platform
  IF p_platform LIKE 'mobile%' AND NOT v_config.enable_mobile_review_prompts THEN
    RETURN FALSE;
  END IF;
  
  IF p_platform = 'web' AND NOT v_config.enable_web_review_prompts THEN
    RETURN FALSE;
  END IF;
  
  -- Count prompts this year
  SELECT COUNT(*) INTO v_prompts_this_year
  FROM review_prompt_history
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM shown_at) = EXTRACT(YEAR FROM NOW());
  
  IF v_prompts_this_year >= v_config.review_prompts_per_year THEN
    RETURN FALSE;
  END IF;
  
  -- Check last prompt was at least 90 days ago
  SELECT MAX(shown_at) INTO v_last_prompt_at
  FROM review_prompt_history
  WHERE user_id = p_user_id;
  
  IF v_last_prompt_at IS NOT NULL 
     AND v_last_prompt_at > NOW() - INTERVAL '90 days' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if trial has ended
CREATE OR REPLACE FUNCTION has_trial_ended(
  p_user_id UUID,
  p_trial_type_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_trial RECORD;
  v_user_created TIMESTAMPTZ;
  v_usage RECORD;
BEGIN
  SELECT * INTO v_trial FROM trial_types WHERE id = p_trial_type_id;
  
  IF v_trial.type = 'none' THEN
    RETURN TRUE; -- Always ended
  END IF;
  
  IF v_trial.type = 'time' THEN
    SELECT created_at INTO v_user_created FROM auth.users WHERE id = p_user_id;
    RETURN NOW() >= v_user_created + (v_trial.duration_days || ' days')::INTERVAL;
  END IF;
  
  IF v_trial.type = 'usage' THEN
    SELECT * INTO v_usage FROM user_usage_tracking WHERE user_id = p_user_id;
    
    IF v_usage IS NULL THEN
      RETURN FALSE;
    END IF;
    
    IF v_trial.usage_hours IS NOT NULL THEN
      RETURN (v_usage.total_active_minutes / 60.0) >= v_trial.usage_hours;
    END IF;
    
    IF v_trial.usage_sessions IS NOT NULL THEN
      RETURN v_usage.total_sessions >= v_trial.usage_sessions;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMIT;
