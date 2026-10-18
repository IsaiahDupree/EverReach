-- ============================================================================
-- Personal Profile API - Manual Migration Application
-- Run this in Supabase SQL Editor if CLI migration didn't work
-- https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new
-- ============================================================================

-- Step 1: Add display_name and preferences columns to profiles table
DO $$ 
BEGIN
    -- Add display_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'display_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
        RAISE NOTICE 'Added display_name column to profiles';
    ELSE
        RAISE NOTICE 'Column display_name already exists in profiles';
    END IF;

    -- Add preferences column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'preferences'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added preferences column to profiles';
    ELSE
        RAISE NOTICE 'Column preferences already exists in profiles';
    END IF;
END $$;

-- Step 2: Create compose_settings table
CREATE TABLE IF NOT EXISTS compose_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_tone TEXT DEFAULT 'professional',
  default_length TEXT DEFAULT 'medium',
  signature TEXT,
  brand_voice JSONB DEFAULT '{}'::jsonb,
  email_settings JSONB DEFAULT '{}'::jsonb,
  sms_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for compose_settings
ALTER TABLE compose_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own compose settings"
  ON compose_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own compose settings"
  ON compose_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own compose settings"
  ON compose_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 3: Create persona_notes table
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

-- Indexes for persona_notes
CREATE INDEX IF NOT EXISTS idx_persona_notes_user ON persona_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_notes_type ON persona_notes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_persona_notes_tags ON persona_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts ON persona_notes USING GIN(linked_contacts);
CREATE INDEX IF NOT EXISTS idx_persona_notes_created ON persona_notes(user_id, created_at DESC);

-- RLS for persona_notes
ALTER TABLE persona_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own persona notes"
  ON persona_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own persona notes"
  ON persona_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own persona notes"
  ON persona_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own persona notes"
  ON persona_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create helper function
CREATE OR REPLACE FUNCTION get_or_create_compose_settings(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  default_tone TEXT,
  default_length TEXT,
  signature TEXT,
  brand_voice JSONB,
  email_settings JSONB,
  sms_settings JSONB
) AS $$
BEGIN
  INSERT INTO compose_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN QUERY
  SELECT cs.user_id, cs.default_tone, cs.default_length, cs.signature,
         cs.brand_voice, cs.email_settings, cs.sms_settings
  FROM compose_settings cs
  WHERE cs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verification
DO $$
DECLARE
    display_name_exists BOOLEAN;
    preferences_exists BOOLEAN;
    compose_exists BOOLEAN;
    notes_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name'
    ) INTO display_name_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences'
    ) INTO preferences_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'compose_settings'
    ) INTO compose_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'persona_notes'
    ) INTO notes_exists;
    
    IF display_name_exists AND preferences_exists AND compose_exists AND notes_exists THEN
        RAISE NOTICE '✅ All migration elements successfully applied!';
    ELSE
        RAISE EXCEPTION 'Migration verification failed: display_name=%, preferences=%, compose_settings=%, persona_notes=%', 
            display_name_exists, preferences_exists, compose_exists, notes_exists;
    END IF;
END $$;
