-- Voice Notes Table Migration
-- Stores voice notes with transcriptions and metadata

-- Create voice_notes table
CREATE TABLE IF NOT EXISTS voice_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Audio file
  audio_url text NOT NULL,
  audio_path text NOT NULL,
  duration_seconds integer NOT NULL,
  file_size_bytes integer,
  
  -- Transcription
  transcription text NOT NULL,
  transcription_confidence real,
  
  -- AI Processing Results (from backend API)
  extracted_contacts jsonb DEFAULT '[]'::jsonb,
  detected_actions jsonb DEFAULT '[]'::jsonb,
  sentiment jsonb,
  suggested_category text,
  suggested_tags text[] DEFAULT '{}',
  
  -- Metadata
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Search
  search_vector tsvector
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON voice_notes(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_contact ON voice_notes(contact_id, recorded_at DESC) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_notes_created ON voice_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_search ON voice_notes USING gin(search_vector);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_voice_notes_transcription_search ON voice_notes USING gin(to_tsvector('english', transcription));

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_voice_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.transcription, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.suggested_category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.suggested_tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_notes_search_vector_update ON voice_notes;
CREATE TRIGGER voice_notes_search_vector_update
  BEFORE INSERT OR UPDATE OF transcription, suggested_category, suggested_tags
  ON voice_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_notes_search_vector();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_voice_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_notes_updated_at ON voice_notes;
CREATE TRIGGER voice_notes_updated_at
  BEFORE UPDATE ON voice_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_notes_updated_at();

-- Enable RLS
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own voice notes" ON voice_notes;
CREATE POLICY "Users can view own voice notes"
  ON voice_notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own voice notes" ON voice_notes;
CREATE POLICY "Users can insert own voice notes"
  ON voice_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own voice notes" ON voice_notes;
CREATE POLICY "Users can update own voice notes"
  ON voice_notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own voice notes" ON voice_notes;
CREATE POLICY "Users can delete own voice notes"
  ON voice_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE voice_notes IS 'Voice notes with AI-processed metadata';
COMMENT ON COLUMN voice_notes.audio_url IS 'Public URL to audio file in Supabase Storage';
COMMENT ON COLUMN voice_notes.audio_path IS 'Storage path (e.g., voice-notes/user-id/file.m4a)';
COMMENT ON COLUMN voice_notes.extracted_contacts IS 'AI-extracted contact mentions with confidence scores';
COMMENT ON COLUMN voice_notes.detected_actions IS 'AI-detected action items (calls, emails, meetings, etc.)';
COMMENT ON COLUMN voice_notes.sentiment IS 'AI sentiment analysis (positive/negative/neutral with score)';
COMMENT ON COLUMN voice_notes.suggested_tags IS 'AI-suggested tags for categorization';
