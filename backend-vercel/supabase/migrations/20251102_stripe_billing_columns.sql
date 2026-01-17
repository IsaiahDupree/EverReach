-- Stripe Billing Columns Migration
-- Adds required columns for Stripe integration to profiles table
-- Run via: Supabase MCP or psql

BEGIN;

-- Add Stripe customer and subscription columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON profiles(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
  ON profiles(subscription_status) 
  WHERE subscription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
  ON profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends 
  ON profiles(trial_ends_at) 
  WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_period_end 
  ON profiles(current_period_end) 
  WHERE current_period_end IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID (cus_...)';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID (sub_...)';
COMMENT ON COLUMN profiles.stripe_price_id IS 'Stripe price ID (price_...)';
COMMENT ON COLUMN profiles.subscription_status IS 'Stripe status: trialing, active, past_due, canceled, paused, unpaid';
COMMENT ON COLUMN profiles.current_period_end IS 'End of current billing period (UTC)';
COMMENT ON COLUMN profiles.subscription_tier IS 'Logical tier: free, pro, enterprise';
COMMENT ON COLUMN profiles.trial_ends_at IS 'Trial expiration timestamp (UTC)';

COMMIT;

-- Verify migration
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_customer_id') THEN
    missing_columns := array_append(missing_columns, 'stripe_customer_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_subscription_id') THEN
    missing_columns := array_append(missing_columns, 'stripe_subscription_id');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
    missing_columns := array_append(missing_columns, 'subscription_status');
  END IF;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Migration failed. Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'Migration successful. All Stripe billing columns added to profiles table.';
  END IF;
END $$;
