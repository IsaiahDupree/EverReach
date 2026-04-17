-- Create events table for storing analytics events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  user_id TEXT,
  session_id UUID,
  anonymous_id UUID NOT NULL,
  url TEXT,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  device_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  click_id TEXT,
  properties JSONB DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_timestamp CHECK (timestamp > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_idempotency_key ON events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_composite ON events(event, timestamp DESC) WHERE timestamp > extract(epoch from (now() - interval '90 days')) * 1000;

-- Create JSONB index for properties
CREATE INDEX IF NOT EXISTS idx_events_properties_gin ON events USING gin(properties);

-- Enable Row-Level Security for Supabase
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create analytics table for aggregated data
CREATE TABLE IF NOT EXISTS event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_date DATE NOT NULL,
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_date ON event_metrics(metric_name, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON event_metrics(metric_date DESC);

ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;
