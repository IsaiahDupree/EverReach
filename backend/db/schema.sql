-- Future-proof CRM schema with voice notes, AI insights, and relationship management
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings

-- Core tables
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User organization membership (for RLS)
CREATE TABLE user_orgs (
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.uid()
  role TEXT CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  PRIMARY KEY (org_id, user_id)
);

-- People (contacts)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  emails TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  timezone TEXT,
  locale TEXT,
  location JSONB, -- {city, region, country, lat, lon}
  comms JSONB DEFAULT '{"channelsPreferred":[],"style":{}}',
  tags TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  key_dates JSONB DEFAULT '[]', -- [{type,dateISO,note}]
  last_interaction TIMESTAMPTZ,
  last_interaction_summary TEXT,
  warmth INT DEFAULT 0 CHECK (warmth BETWEEN 0 AND 100),
  last_suggest_copy_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship graph
CREATE TABLE people_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  src_person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  dst_person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'INTRODUCED_BY','FRIEND_OF','WORKS_WITH'
  weight NUMERIC DEFAULT 1.0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'audio','email','web','manual','calendar','file'
  uri TEXT,
  sha256 TEXT,
  meta JSONB,
  retention_policy TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain events (append-only)
CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  source_id UUID REFERENCES sources(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flexible traits (future fields without migrations)
CREATE TABLE traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  version INT DEFAULT 1,
  UNIQUE (org_id, entity_type, entity_id, namespace, key)
);

-- Interactions
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT CHECK (channel IN ('sms','email','dm','call','meet','note','webhook')),
  direction TEXT CHECK (direction IN ('inbound','outbound','internal')) DEFAULT 'internal',
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('pos','neu','neg')),
  action_items TEXT[] DEFAULT '{}',
  source_id UUID REFERENCES sources(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media files
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) UNIQUE,
  kind TEXT CHECK (kind IN ('audio','video','doc','image')),
  storage_url TEXT NOT NULL,
  mime_type TEXT,
  duration_seconds INT,
  tracks JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice calls
CREATE TABLE voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id),
  source_id UUID REFERENCES sources(id) UNIQUE,
  media_id UUID REFERENCES media_files(id),
  scenario TEXT, -- 'voice_note','scheduled_call','inbound_vm'
  context_scope TEXT CHECK (context_scope IN ('about_person','about_me')) DEFAULT 'about_person',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  lang TEXT,
  stt_model TEXT,
  stt_confidence NUMERIC,
  transcript TEXT,
  transcript_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speakers (diarization)
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id),
  label TEXT,
  voiceprint VECTOR(256),
  consent TEXT CHECK (consent IN ('granted','revoked','unknown')) DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice segments
CREATE TABLE voice_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  voice_call_id UUID REFERENCES voice_calls(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id),
  start_ms INT NOT NULL,
  end_ms INT NOT NULL,
  text TEXT,
  words JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id),
  person_id UUID REFERENCES people(id),
  title TEXT,
  kind TEXT,
  raw TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks
CREATE TABLE doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  ord INT NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doc_id, ord)
);

-- Claims (structured knowledge)
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  predicate TEXT NOT NULL,
  object JSONB NOT NULL,
  confidence NUMERIC,
  source_id UUID REFERENCES sources(id),
  evidence JSONB,
  extracted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights (HITL approval)
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id),
  proposal JSONB NOT NULL,
  confidence NUMERIC,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field changes (audit trail)
CREATE TABLE field_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  source_id UUID REFERENCES sources(id),
  sha256 TEXT,
  confidence NUMERIC,
  actor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal context notes
CREATE TABLE personal_context_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  source_id UUID REFERENCES sources(id),
  title TEXT,
  transcript TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automations
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  trigger JSONB NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  version INT DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation runs
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('queued','running','success','failed','canceled')) DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  input JSONB,
  output JSONB,
  error TEXT
);

-- Approvals
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  requested_by UUID REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connectors
CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  account JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  rate_limits JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion jobs
CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES connectors(id),
  status TEXT CHECK (status IN ('queued','running','success','failed')) DEFAULT 'queued',
  cursor JSONB,
  stats JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cadences
CREATE TABLE cadences (
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  days_interval INT NOT NULL DEFAULT 30,
  preferred_hours INT4RANGE,
  next_touch_at TIMESTAMPTZ,
  PRIMARY KEY (org_id, person_id)
);

-- Outbound messages
CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('sms','email','dm')),
  draft_text TEXT NOT NULL,
  suggested_send_at TIMESTAMPTZ,
  reason TEXT,
  approval_status TEXT CHECK (approval_status IN ('pending','approved','rejected')) DEFAULT 'pending',
  send_status TEXT CHECK (send_status IN ('drafted','queued','sent','failed')) DEFAULT 'drafted',
  provider_meta JSONB,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('conference','meetup','casual','webinar','other')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  location JSONB,
  tags TEXT[] DEFAULT '{}',
  source_id UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendance
CREATE TABLE event_attendance (
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('invited','rsvp_yes','rsvp_no','attended')),
  notes TEXT,
  PRIMARY KEY (org_id, event_id, person_id)
);

-- Opportunities
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value_cents INT,
  stage TEXT CHECK (stage IN ('new','qualified','proposal','won','lost')) DEFAULT 'new',
  next_step TEXT,
  next_step_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent
CREATE TABLE consent (
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT CHECK (status IN ('granted','revoked','unknown')) DEFAULT 'unknown',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, person_id, kind)
);

-- UX events (for metrics)
CREATE TABLE ux_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id),
  user_id UUID REFERENCES users(id),
  person_id UUID REFERENCES people(id),
  kind TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message goals (custom templates for message generation)
CREATE TABLE message_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  default_channels TEXT[] DEFAULT '{"sms","email","dm"}',
  style_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated messages (drafts with variants)
CREATE TABLE generated_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES message_goals(id) ON DELETE SET NULL,
  channel_selected TEXT CHECK (channel_selected IN ('sms','email','dm')),
  context_snapshot JSONB NOT NULL DEFAULT '{}',
  status TEXT CHECK (status IN ('draft','copied','sent_inferred','sent_confirmed')) DEFAULT 'draft',
  chosen_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message variants (3 options per generated message)
CREATE TABLE message_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES generated_messages(id) ON DELETE CASCADE,
  variant_index INT NOT NULL CHECK (variant_index >= 0 AND variant_index <= 2),
  text TEXT NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, variant_index)
);

-- Analytics events (for message generation tracking)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets (images, screenshots, etc.)
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES message_goals(id) ON DELETE SET NULL,
  message_id UUID REFERENCES generated_messages(id) ON DELETE SET NULL,
  kind TEXT CHECK (kind IN ('screenshot','profile','photo','document','other')) DEFAULT 'other',
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  width INT,
  height INT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  ocr_text TEXT,
  vision_summary TEXT,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Texting Concierge Extensions
-- User profiles for matching
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  phone_e164 TEXT UNIQUE NOT NULL,
  platform_pref TEXT CHECK (platform_pref IN ('imessage','sms','whatsapp','telegram','discord')) DEFAULT 'sms',
  consent_status TEXT CHECK (consent_status IN ('pending','granted','revoked')) DEFAULT 'pending',
  onboarding_stage TEXT CHECK (onboarding_stage IN ('phone','profile','interests','complete')) DEFAULT 'phone',
  timezone TEXT,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  location JSONB, -- {city, region, country, lat, lon}
  photo_url TEXT,
  embedding VECTOR(1536), -- for similarity matching
  match_preferences JSONB DEFAULT '{"frequency":"weekly","max_per_week":3}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External contacts (from phone/messaging platforms)
CREATE TABLE external_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- platform-specific ID
  channel TEXT CHECK (channel IN ('imessage','sms','whatsapp','telegram','discord')) NOT NULL,
  handle TEXT NOT NULL, -- phone number, username, etc.
  display_name TEXT,
  last_seen_at TIMESTAMPTZ,
  trust_score NUMERIC DEFAULT 0.5 CHECK (trust_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, channel, handle)
);

-- Message threads (conversations)
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT CHECK (channel IN ('imessage','sms','whatsapp','telegram','discord')) NOT NULL,
  thread_id TEXT NOT NULL, -- platform-specific thread ID
  participants TEXT[] NOT NULL, -- phone numbers or handles
  is_group BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel, thread_id)
);

-- Inbound/outbound messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('inbound','outbound')) NOT NULL,
  sender_handle TEXT NOT NULL,
  body TEXT NOT NULL,
  meta JSONB DEFAULT '{}', -- platform-specific metadata
  dedupe_hash TEXT UNIQUE, -- prevent duplicate processing
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Introduction attempts
CREATE TABLE introductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES message_threads(id),
  status TEXT CHECK (status IN ('pending','both_accepted','declined','expired')) DEFAULT 'pending',
  intro_message TEXT,
  match_score NUMERIC CHECK (match_score BETWEEN 0 AND 1),
  match_reasoning TEXT,
  a_response TEXT,
  b_response TEXT,
  a_responded_at TIMESTAMPTZ,
  b_responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  last_nudge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (target_a_id, target_b_id) -- prevent duplicate intros
);

-- User feedback on matches
CREATE TABLE match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  intro_id UUID REFERENCES introductions(id) ON DELETE CASCADE,
  event TEXT CHECK (event IN ('intro_received','intro_accepted','intro_declined','met_irl','positive','negative')) NOT NULL,
  value TEXT, -- thumbs up/down, rating, etc.
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message relay jobs (for sending)
CREATE TABLE relay_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT CHECK (channel IN ('imessage','sms','whatsapp','telegram','discord')) NOT NULL,
  recipient_handle TEXT NOT NULL,
  message_body TEXT NOT NULL,
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status TEXT CHECK (status IN ('queued','processing','sent','failed','cancelled')) DEFAULT 'queued',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform connectors (iMessage relay, Twilio, etc.)
CREATE TABLE platform_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT CHECK (channel IN ('imessage','sms','whatsapp','telegram','discord')) NOT NULL UNIQUE,
  config JSONB NOT NULL, -- API keys, webhook URLs, etc.
  enabled BOOLEAN DEFAULT TRUE,
  health_status TEXT CHECK (health_status IN ('healthy','degraded','down')) DEFAULT 'healthy',
  last_health_check TIMESTAMPTZ,
  rate_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX people_org_idx ON people (org_id, updated_at DESC);
CREATE INDEX interactions_q ON interactions (org_id, person_id, occurred_at DESC);
CREATE INDEX claims_q ON claims (org_id, subject_type, subject_id);
CREATE INDEX outbound_q ON outbound_messages (org_id, approval_status, send_status, suggested_send_at);
CREATE INDEX ON domain_events (org_id, entity_type, entity_id, created_at);
CREATE INDEX ON voice_segments (voice_call_id, start_ms);
CREATE INDEX ON doc_chunks (doc_id, ord);
CREATE INDEX message_goals_org_idx ON message_goals (org_id, user_id, created_at DESC);
CREATE INDEX generated_messages_org_idx ON generated_messages (org_id, user_id, person_id, created_at DESC);
CREATE INDEX message_variants_msg_idx ON message_variants (message_id, variant_index);
CREATE INDEX analytics_events_org_idx ON analytics_events (org_id, user_id, name, created_at DESC);
CREATE INDEX media_assets_org_idx ON media_assets (org_id, user_id, person_id, created_at DESC);
CREATE INDEX media_assets_message_idx ON media_assets (message_id, goal_id);

-- Concierge indexes
CREATE INDEX user_profiles_phone_idx ON user_profiles (phone_e164);
CREATE INDEX user_profiles_consent_idx ON user_profiles (consent_status, onboarding_stage);
CREATE INDEX external_contacts_user_idx ON external_contacts (user_id, channel, handle);
CREATE INDEX message_threads_channel_idx ON message_threads (channel, thread_id);
CREATE INDEX messages_thread_idx ON messages (thread_id, created_at DESC);
CREATE INDEX messages_dedupe_idx ON messages (dedupe_hash) WHERE dedupe_hash IS NOT NULL;
CREATE INDEX introductions_targets_idx ON introductions (target_a_id, target_b_id, status);
CREATE INDEX introductions_status_idx ON introductions (status, expires_at);
CREATE INDEX match_feedback_user_idx ON match_feedback (user_id, event, created_at DESC);
CREATE INDEX relay_jobs_status_idx ON relay_jobs (status, scheduled_for, priority DESC);
CREATE INDEX relay_jobs_channel_idx ON relay_jobs (channel, status);
CREATE INDEX platform_connectors_channel_idx ON platform_connectors (channel, enabled);

-- Vector indexes (if using pgvector)
-- CREATE INDEX ON voice_segments USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX ON doc_chunks USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX ON user_profiles USING ivfflat (embedding vector_cosine_ops);

-- Helper function to ensure user has an org
CREATE OR REPLACE FUNCTION ensure_user_org()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  oid UUID;
BEGIN
  -- Check if user already has an org
  SELECT org_id INTO oid FROM user_orgs WHERE user_id = auth.uid() LIMIT 1;

  IF oid IS NULL THEN
    -- Create a new org and membership
    INSERT INTO orgs (name) VALUES ('My Workspace') RETURNING id INTO oid;
    INSERT INTO user_orgs (org_id, user_id, role) VALUES (oid, auth.uid(), 'owner');
  END IF;

  RETURN oid;
END;
$;

-- RLS helper function
CREATE OR REPLACE FUNCTION is_member(org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $
  SELECT EXISTS(SELECT 1 FROM user_orgs u WHERE u.org_id = org AND u.user_id = auth.uid());
$;

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on concierge tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE introductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE relay_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connectors ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "orgs_owned" ON orgs
  FOR SELECT USING (EXISTS(SELECT 1 FROM user_orgs u WHERE u.org_id = id AND u.user_id = auth.uid()));
CREATE POLICY "orgs_ins_owner" ON orgs FOR INSERT WITH CHECK (true);

CREATE POLICY "user_orgs_self" ON user_orgs
  FOR SELECT USING (user_id = auth.uid());

-- Generic policies for org-scoped tables
CREATE POLICY "read_org" ON people FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON people FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON people FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON sources FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON sources FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON sources FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON media_files FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON media_files FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON media_files FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON voice_calls FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON voice_calls FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON voice_calls FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON interactions FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON interactions FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON interactions FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON documents FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON documents FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON documents FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON doc_chunks FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON doc_chunks FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON doc_chunks FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON insights FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON insights FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON insights FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON field_changes FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON field_changes FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON field_changes FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "read_org" ON ux_events FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON ux_events FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON ux_events FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

-- RLS policies for message goals
CREATE POLICY "read_org" ON message_goals FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON message_goals FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON message_goals FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON message_goals FOR DELETE USING (is_member(org_id));

-- RLS policies for generated messages
CREATE POLICY "read_org" ON generated_messages FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON generated_messages FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON generated_messages FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON generated_messages FOR DELETE USING (is_member(org_id));

-- RLS policies for message variants
CREATE POLICY "read_org" ON message_variants FOR SELECT USING (EXISTS(SELECT 1 FROM generated_messages gm WHERE gm.id = message_id AND is_member(gm.org_id)));
CREATE POLICY "write_org" ON message_variants FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM generated_messages gm WHERE gm.id = message_id AND is_member(gm.org_id)));
CREATE POLICY "update_org" ON message_variants FOR UPDATE USING (EXISTS(SELECT 1 FROM generated_messages gm WHERE gm.id = message_id AND is_member(gm.org_id))) WITH CHECK (EXISTS(SELECT 1 FROM generated_messages gm WHERE gm.id = message_id AND is_member(gm.org_id)));
CREATE POLICY "delete_org" ON message_variants FOR DELETE USING (EXISTS(SELECT 1 FROM generated_messages gm WHERE gm.id = message_id AND is_member(gm.org_id)));

-- RLS policies for analytics events
CREATE POLICY "read_org" ON analytics_events FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON analytics_events FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON analytics_events FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON analytics_events FOR DELETE USING (is_member(org_id));

-- Enable RLS on media assets
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for media assets
CREATE POLICY "read_org" ON media_assets FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON media_assets FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON media_assets FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON media_assets FOR DELETE USING (is_member(org_id));

-- RLS policies for concierge tables
-- User profiles: users can only see their own profile
CREATE POLICY "user_profiles_self" ON user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- External contacts: users can only see their own contacts
CREATE POLICY "external_contacts_self" ON external_contacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "external_contacts_insert" ON external_contacts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "external_contacts_update" ON external_contacts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Message threads: public for now (needed for group intros)
CREATE POLICY "message_threads_all" ON message_threads FOR ALL USING (true);

-- Messages: public for now (needed for intro conversations)
CREATE POLICY "messages_all" ON messages FOR ALL USING (true);

-- Introductions: users can see intros they're involved in
CREATE POLICY "introductions_involved" ON introductions 
  FOR SELECT USING (requester_id = auth.uid() OR target_a_id = auth.uid() OR target_b_id = auth.uid());
CREATE POLICY "introductions_insert" ON introductions 
  FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "introductions_update" ON introductions 
  FOR UPDATE USING (requester_id = auth.uid() OR target_a_id = auth.uid() OR target_b_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR target_a_id = auth.uid() OR target_b_id = auth.uid());

-- Match feedback: users can only manage their own feedback
CREATE POLICY "match_feedback_self" ON match_feedback FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "match_feedback_insert" ON match_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "match_feedback_update" ON match_feedback FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Relay jobs: system-level access (no user-level RLS for now)
CREATE POLICY "relay_jobs_all" ON relay_jobs FOR ALL USING (true);

-- Platform connectors: system-level access
CREATE POLICY "platform_connectors_all" ON platform_connectors FOR ALL USING (true);

-- Additional RLS enables for remaining org-scoped tables
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;

-- Generic org-scoped RLS policies for remaining tables
CREATE POLICY "read_org" ON connectors FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON connectors FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON connectors FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON connectors FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON ingestion_jobs FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON ingestion_jobs FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON ingestion_jobs FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON ingestion_jobs FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON events FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON events FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON events FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON events FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON event_attendance FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON event_attendance FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON event_attendance FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON event_attendance FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON opportunities FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON opportunities FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON opportunities FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON opportunities FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON consent FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON consent FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON consent FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON consent FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON approvals FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON approvals FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON approvals FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON approvals FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON cadences FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON cadences FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON cadences FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON cadences FOR DELETE USING (is_member(org_id));

CREATE POLICY "read_org" ON outbound_messages FOR SELECT USING (is_member(org_id));
CREATE POLICY "write_org" ON outbound_messages FOR INSERT WITH CHECK (is_member(org_id));
CREATE POLICY "update_org" ON outbound_messages FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));
CREATE POLICY "delete_org" ON outbound_messages FOR DELETE USING (is_member(org_id));

-- Additional helpful indexes
CREATE INDEX IF NOT EXISTS message_threads_participants_gin ON message_threads USING GIN (participants);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages (sender_handle, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_meta_gin ON messages USING GIN (meta);
CREATE INDEX IF NOT EXISTS speakers_person_idx ON speakers (person_id);
CREATE INDEX IF NOT EXISTS speakers_org_idx ON speakers (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_calls_person_idx ON voice_calls (person_id, started_at DESC);
CREATE INDEX IF NOT EXISTS documents_person_idx ON documents (person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_org_time_idx ON events (org_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS opportunities_org_stage_idx ON opportunities (org_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS approvals_org_status_idx ON approvals (org_id, kind, status, created_at DESC);
CREATE INDEX IF NOT EXISTS connectors_org_kind_idx ON connectors (org_id, kind, enabled);
CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx ON ingestion_jobs (org_id, status, started_at);
CREATE INDEX IF NOT EXISTS cadences_next_touch_idx ON cadences (org_id, next_touch_at);
CREATE INDEX IF NOT EXISTS outbound_messages_person_idx ON outbound_messages (org_id, person_id, send_status, suggested_send_at);
CREATE INDEX IF NOT EXISTS consent_kind_idx ON consent (org_id, person_id, kind);
CREATE INDEX IF NOT EXISTS doc_chunks_meta_gin ON doc_chunks USING GIN (meta);
CREATE INDEX IF NOT EXISTS media_assets_labels_gin ON media_assets USING GIN (labels);

-- Vector similarity indexes (require pgvector and tuned ivfflat lists)
CREATE INDEX IF NOT EXISTS voice_segments_embedding_idx ON voice_segments USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON doc_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS user_profiles_embedding_idx ON user_profiles USING ivfflat (embedding vector_cosine_ops);