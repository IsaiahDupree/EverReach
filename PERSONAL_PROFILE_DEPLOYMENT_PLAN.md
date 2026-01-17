/**
 * Personal Profile API - Database Migration
 * 
 * Creates tables for:
 * - Compose settings (AI message preferences)
 * - Persona notes (voice memos, context notes)
 * - Profile enhancements
 * 
 * Run: psql $DATABASE_URL -f migrations/personal-profile-api.sql
 */

-- ============================================================================
-- 1. COMPOSE SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compose_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_tone TEXT DEFAULT 'professional',
  default_length TEXT DEFAULT 'medium',
  signature TEXT,
  brand_voice JSONB DEFAULT '{
    "tone": "professional",
    "do": [],
    "dont": []
  }'::jsonb,
  email_settings JSONB DEFAULT '{
    "include_signature": true,
    "default_subject_style": "action_oriented"
  }'::jsonb,
  sms_settings JSONB DEFAULT '{
    "max_length": 160,
    "use_emojis": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE compose_settings IS 'AI composition preferences per user';

-- RLS for compose_settings
ALTER TABLE compose_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compose settings"
  ON compose_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own compose settings"
  ON compose_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compose settings"
  ON compose_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. PERSONA NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS persona_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'screenshot')),
  title TEXT,
  body_text TEXT,
  transcription TEXT,
  audio_url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  linked_contacts UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE persona_notes IS 'Personal notes, voice memos, and screenshots linked to contacts';

-- Indexes for persona_notes
CREATE INDEX IF NOT EXISTS idx_persona_notes_user ON persona_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_notes_type ON persona_notes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_persona_notes_tags ON persona_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts ON persona_notes USING GIN(linked_contacts);
CREATE INDEX IF NOT EXISTS idx_persona_notes_created ON persona_notes(user_id, created_at DESC);

-- RLS for persona_notes
ALTER TABLE persona_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own persona notes"
  ON persona_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona notes"
  ON persona_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona notes"
  ON persona_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own persona notes"
  ON persona_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. UPDATE PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.display_name IS 'User display name (separate from email)';
COMMENT ON COLUMN profiles.preferences IS 'General user preferences (notifications, UI, etc.)';

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get or create compose settings
CREATE OR REPLACE FUNCTION get_or_create_compose_settings(p_user_id UUID)
RETURNS compose_settings AS $$
DECLARE
  v_settings compose_settings;
BEGIN
  SELECT * INTO v_settings
  FROM compose_settings
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO compose_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Search persona notes
CREATE OR REPLACE FUNCTION search_persona_notes(
  p_user_id UUID,
  p_type TEXT DEFAULT NULL,
  p_contact_id UUID DEFAULT NULL,
  p_tag TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS SETOF persona_notes AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM persona_notes
  WHERE user_id = p_user_id
    AND (p_type IS NULL OR type = p_type)
    AND (p_contact_id IS NULL OR p_contact_id = ANY(linked_contacts))
    AND (p_tag IS NULL OR p_tag = ANY(tags))
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Personal Profile API tables created successfully';

-- Verify tables
SELECT 'compose_settings' AS table_name, COUNT(*) AS count FROM compose_settings
UNION ALL
SELECT 'persona_notes', COUNT(*) FROM persona_notes;
