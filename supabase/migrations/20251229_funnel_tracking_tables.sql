-- Funnel Tracking Tables Migration
-- Created: 2024-12-29
-- Purpose: Support waitlist signup flow with intent-qualifying questions and funnel tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table - tracks visitor sessions with attribution data
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  idea_id TEXT DEFAULT 'everreach_waitlist',
  funnel_id TEXT DEFAULT 'everreach_waitlist_v01',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbp TEXT,
  fbc TEXT,
  meta_ad_id TEXT,
  meta_adset_id TEXT,
  meta_campaign_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  landing_url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on session_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_utm_source ON sessions(utm_source);
CREATE INDEX IF NOT EXISTS idx_sessions_utm_campaign ON sessions(utm_campaign);

-- Funnel events table - tracks conversion events (Lead, CompleteRegistration, etc.)
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for funnel_events
CREATE INDEX IF NOT EXISTS idx_funnel_events_session_id ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name ON funnel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events(created_at);

-- Waitlist signups table - stores waitlist form submissions with intent scoring
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(session_id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  pain_point TEXT,
  network_size TEXT,
  urgency TEXT,
  intent_score INTEGER DEFAULT 0,
  is_high_intent BOOLEAN DEFAULT FALSE,
  event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT waitlist_signups_email_unique UNIQUE (email)
);

-- Create indexes for waitlist_signups
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_session_id ON waitlist_signups(session_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_is_high_intent ON waitlist_signups(is_high_intent);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow insert/select for service role and anon (public endpoints)
-- Sessions policies
CREATE POLICY "Allow anonymous insert on sessions" ON sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select on sessions" ON sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service role full access on sessions" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Funnel events policies
CREATE POLICY "Allow anonymous insert on funnel_events" ON funnel_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select on funnel_events" ON funnel_events
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service role full access on funnel_events" ON funnel_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Waitlist signups policies
CREATE POLICY "Allow anonymous insert on waitlist_signups" ON waitlist_signups
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select on waitlist_signups" ON waitlist_signups
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service role full access on waitlist_signups" ON waitlist_signups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON funnel_events TO anon;
GRANT SELECT, INSERT ON waitlist_signups TO anon;

GRANT ALL ON sessions TO service_role;
GRANT ALL ON funnel_events TO service_role;
GRANT ALL ON waitlist_signups TO service_role;

-- Comments for documentation
COMMENT ON TABLE sessions IS 'Tracks visitor sessions with UTM and Meta attribution data for funnel analytics';
COMMENT ON TABLE funnel_events IS 'Stores funnel conversion events (Lead, CompleteRegistration, ViewContent, etc.)';
COMMENT ON TABLE waitlist_signups IS 'Waitlist form submissions with intent-qualifying questions and scoring';

COMMENT ON COLUMN sessions.fbp IS 'Facebook Pixel browser ID cookie (_fbp)';
COMMENT ON COLUMN sessions.fbc IS 'Facebook Click ID cookie (_fbc)';
COMMENT ON COLUMN waitlist_signups.intent_score IS 'Calculated intent score (0-100) based on form answers';
COMMENT ON COLUMN waitlist_signups.is_high_intent IS 'True if user has real pain + 200+ contacts + urgency this week/month';
