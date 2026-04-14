-- Contact Interactions Table
-- Stores extracted conversation history from screenshot ingestion

CREATE TABLE IF NOT EXISTS contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Interaction details
  date_approximate TIMESTAMPTZ,
  sender TEXT NOT NULL CHECK (sender IN ('me', 'contact')),
  message_summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics TEXT[],
  action_items TEXT[],

  -- Source and raw data
  source TEXT DEFAULT 'screenshot_ingestion',
  raw_extraction JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_message_summary CHECK (message_summary IS NULL OR char_length(message_summary) <= 500)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_user_id ON contact_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_date ON contact_interactions(date_approximate DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_created ON contact_interactions(created_at DESC);

-- Add columns to contacts table for screenshot ingestion tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS key_context TEXT[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS open_threads TEXT[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_ingestion_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ingestion_count INTEGER DEFAULT 0;

-- Create indexes on new contacts columns
CREATE INDEX IF NOT EXISTS idx_contacts_last_ingestion ON contacts(last_ingestion_at DESC NULLS LAST);
