-- SunTrace Schema Migration
-- Creates all tables with RLS policies, indexes, and seed data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_type INTEGER NOT NULL CHECK (skin_type BETWEEN 1 AND 6),
  age INTEGER CHECK (age > 0 AND age < 120),
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  timezone TEXT DEFAULT 'UTC',
  health_sync_enabled BOOLEAN DEFAULT false,
  vitamin_d_supplements BOOLEAN DEFAULT false,
  daily_target_minutes INTEGER DEFAULT 20,
  streak_count INTEGER DEFAULT 0,
  last_session_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Sun sessions table
CREATE TABLE IF NOT EXISTS sun_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes DECIMAL(8, 2),
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  location_name TEXT,
  uv_index_at_time DECIMAL(4, 2),
  cloud_cover_pct INTEGER CHECK (cloud_cover_pct BETWEEN 0 AND 100),
  skin_areas_exposed TEXT[] DEFAULT '{}',
  sunscreen_applied BOOLEAN DEFAULT false,
  estimated_vitamin_d_iu INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_minutes DECIMAL(8, 2) DEFAULT 0,
  total_vitamin_d_iu INTEGER DEFAULT 0,
  target_minutes INTEGER DEFAULT 20,
  target_iu INTEGER DEFAULT 1000,
  sessions_count INTEGER DEFAULT 0,
  max_uv_index DECIMAL(4, 2) DEFAULT 0,
  streak_day INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Sun spots table
CREATE TABLE IF NOT EXISTS sun_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  avg_uv_index DECIMAL(4, 2),
  best_time_start TIME,
  best_time_end TIME,
  tags TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) CHECK (rating BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'session', 'vitamin_d', 'social', 'explorer', 'health')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('streak_days', 'session_count', 'total_iu', 'spots_visited', 'coach_messages')),
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges (earned)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  skin_type_min INTEGER DEFAULT 1 CHECK (skin_type_min BETWEEN 1 AND 6),
  skin_type_max INTEGER DEFAULT 6 CHECK (skin_type_max BETWEEN 1 AND 6),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplement logs
CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vitamin_d_iu INTEGER DEFAULT 0,
  vitamin_k2_mcg INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Coach messages
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sun_sessions_user_date ON sun_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sun_spots_location ON sun_spots(lat, lng);
CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON coach_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, earned_at DESC);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sun_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sun_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users own their data
CREATE POLICY "Users own their profile" ON profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their sessions" ON sun_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their daily stats" ON daily_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their supplement logs" ON supplement_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their coach messages" ON coach_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their badges" ON user_badges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read sun spots" ON sun_spots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create spots" ON sun_spots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own spots" ON sun_spots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read badges" ON badges FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read tips" ON tips FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER daily_stats_updated_at BEFORE UPDATE ON daily_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
