-- Create Marketing Intelligence Schema
-- Run this FIRST before seeding data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. FUNNEL STAGE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_stage (
  stage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_name TEXT UNIQUE NOT NULL,
  ordinal INTEGER NOT NULL,
  conversion_threshold DECIMAL(5,4),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_stage_ordinal ON funnel_stage(ordinal);

-- ============================================================================
-- 2. PERSONA BUCKET TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS persona_bucket (
  bucket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persona_bucket_priority ON persona_bucket(priority);

-- ============================================================================
-- 3. MAGNETISM SCORE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS magnetism_score (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  signals JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magnetism_score_score ON magnetism_score(score DESC);
CREATE INDEX IF NOT EXISTS idx_magnetism_score_expires ON magnetism_score(expires_at);

-- ============================================================================
-- 4. FUNNEL USER PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_user_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES funnel_stage(stage_id) ON DELETE CASCADE,
  reached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_funnel_progress_user ON funnel_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_stage ON funnel_user_progress(stage_id);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_reached ON funnel_user_progress(reached_at);

-- ============================================================================
-- 5. USER PERSONA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_persona (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_bucket_id UUID NOT NULL REFERENCES persona_bucket(bucket_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, persona_bucket_id)
);

CREATE INDEX IF NOT EXISTS idx_user_persona_user ON user_persona(user_id);
CREATE INDEX IF NOT EXISTS idx_user_persona_bucket ON user_persona(persona_bucket_id);
CREATE INDEX IF NOT EXISTS idx_user_persona_confidence ON user_persona(confidence DESC);

-- ============================================================================
-- 6. ENABLE RLS (Row Level Security)
-- ============================================================================
ALTER TABLE funnel_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_bucket ENABLE ROW LEVEL SECURITY;
ALTER TABLE magnetism_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_persona ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Funnel stages are read-only for all authenticated users
CREATE POLICY "Funnel stages are viewable by authenticated users" ON funnel_stage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Funnel stages are manageable by service role" ON funnel_stage
  FOR ALL TO service_role USING (true);

-- Persona buckets are read-only for all authenticated users
CREATE POLICY "Persona buckets are viewable by authenticated users" ON persona_bucket
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Persona buckets are manageable by service role" ON persona_bucket
  FOR ALL TO service_role USING (true);

-- Users can view their own magnetism score
CREATE POLICY "Users can view own magnetism score" ON magnetism_score
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages magnetism scores" ON magnetism_score
  FOR ALL TO service_role USING (true);

-- Users can view their own funnel progress
CREATE POLICY "Users can view own funnel progress" ON funnel_user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages funnel progress" ON funnel_user_progress
  FOR ALL TO service_role USING (true);

-- Users can view their own persona
CREATE POLICY "Users can view own persona" ON user_persona
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role manages personas" ON user_persona
  FOR ALL TO service_role USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON funnel_stage TO authenticated;
GRANT SELECT ON persona_bucket TO authenticated;
GRANT SELECT ON magnetism_score TO authenticated;
GRANT SELECT ON funnel_user_progress TO authenticated;
GRANT SELECT ON user_persona TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'Schema created successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'funnel_stage') as funnel_stage_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persona_bucket') as persona_bucket_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'magnetism_score') as magnetism_score_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'funnel_user_progress') as funnel_user_progress_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_persona') as user_persona_exists;

-- Done!
SELECT '✅ Ready to seed data! Run seed-marketing-data.sql next.' as next_step;
