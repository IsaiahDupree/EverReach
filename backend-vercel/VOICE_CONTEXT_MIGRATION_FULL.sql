-- ============================================
-- Voice & Tone Context - FULL MIGRATION
-- Option B: Create dedicated user_preferences table
-- ============================================

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Voice & Tone Context
  voice_context TEXT,
  
  -- Future preference fields (expandable)
  default_tone TEXT CHECK (default_tone IN ('casual', 'professional', 'warm', 'direct')),
  default_channel TEXT CHECK (default_channel IN ('email', 'sms', 'dm')),
  auto_templates BOOLEAN DEFAULT false,
  
  -- Template preferences (for future use)
  email_signature TEXT,
  preferred_language TEXT DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference row per user
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);

-- Create index on voice_context for analytics
CREATE INDEX IF NOT EXISTS idx_user_preferences_voice_context 
ON user_preferences(voice_context) 
WHERE voice_context IS NOT NULL;

-- Add table comment
COMMENT ON TABLE user_preferences IS 
'User preferences for AI message generation, templates, and app customization';

-- Add column comments
COMMENT ON COLUMN user_preferences.voice_context IS 
'User-defined voice and tone preferences for AI message generation. Examples: "Gen Z casual", "Professional fintech tone", "Arizona slang"';

COMMENT ON COLUMN user_preferences.default_tone IS 
'Default tone for message generation: casual, professional, warm, or direct';

COMMENT ON COLUMN user_preferences.default_channel IS 
'Default communication channel: email, sms, or dm';

COMMENT ON COLUMN user_preferences.auto_templates IS 
'Whether to automatically apply message templates';

-- Insert default preferences for existing users (optional)
-- Uncomment if you want to create default rows for existing users
/*
INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
*/

-- Verify table was created
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
