-- =============================================================================
-- EverReach Backend Starter Kit - Database Schema
-- =============================================================================
-- This schema provides a production-ready foundation for your application with:
-- - User management and profiles
-- - Generic items/entities CRUD (customize to your needs)
-- - Subscription/tier management
-- - Row Level Security (RLS) policies
-- - Indexes for performance
-- - Timestamps and audit fields
--
-- CUSTOMIZATION:
-- 1. Replace 'items' table with your own entity (e.g., tasks, posts, etc.)
-- 2. Add your custom fields and relationships
-- 3. Update RLS policies to match your business logic
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Extends Supabase Auth users with additional profile information
-- Synced with auth.users via triggers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================================
-- Manages user subscription status and tiers
-- Supports both Stripe (web) and RevenueCat (mobile) webhooks
-- =============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'trialing', 'incomplete');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',

  -- Payment provider info
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  revenuecat_subscriber_id TEXT,

  -- Subscription timing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one subscription per user
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins/webhooks can update subscriptions (bypasses RLS with service role)
CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);

-- Trigger to update updated_at timestamp
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ITEMS TABLE
-- =============================================================================
-- Generic CRUD entity - CUSTOMIZE THIS TO YOUR NEEDS
-- Replace "items" with your actual entity (e.g., tasks, posts, products, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Generic fields - customize these
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',

  -- Metadata and audit fields
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for items table
CREATE POLICY "Users can view own items"
  ON public.items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);

-- Full-text search index (optional)
CREATE INDEX IF NOT EXISTS idx_items_search ON public.items
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Trigger to update updated_at timestamp
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to check if user has a specific subscription tier or higher
CREATE OR REPLACE FUNCTION public.has_subscription_tier(
  required_tier subscription_tier
)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  tier_levels INTEGER[] := ARRAY[0, 1, 2, 3]; -- free, basic, premium, enterprise
  user_level INTEGER;
  required_level INTEGER;
BEGIN
  -- Get user's current tier
  SELECT tier INTO user_tier
  FROM public.subscriptions
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  -- Default to free tier if no subscription found
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Convert tiers to numeric levels for comparison
  user_level := CASE user_tier
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
  END;

  required_level := CASE required_tier
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 1
    WHEN 'premium' THEN 2
    WHEN 'enterprise' THEN 3
  END;

  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create default free subscription
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View to get user profile with subscription info
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.avatar_url,
  u.created_at,
  u.updated_at,
  s.tier AS subscription_tier,
  s.status AS subscription_status,
  s.current_period_end AS subscription_expires_at
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id;

-- =============================================================================
-- SEED DATA (Optional - for development)
-- =============================================================================

-- Uncomment to create test data
-- INSERT INTO public.items (user_id, title, description, status)
-- SELECT
--   auth.uid(),
--   'Sample Item ' || generate_series,
--   'This is a sample item for testing',
--   'active'
-- FROM generate_series(1, 5);

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. Run this schema in your Supabase SQL Editor
-- 2. Customize the 'items' table to match your entity
-- 3. Update RLS policies based on your business logic
-- 4. Add additional tables and relationships as needed
-- 5. Always test RLS policies thoroughly before production
-- =============================================================================
