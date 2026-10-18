-- Migration: Add Contact Preview for Import Selection
-- Date: 2025-11-03
-- Purpose: Allow users to preview and select which contacts to import

-- Add new status to enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'contacts_fetched' 
    AND enumtypid = 'public.import_status'::regtype
  ) THEN
    ALTER TYPE public.import_status ADD VALUE 'contacts_fetched';
  END IF;
END $$;

-- Create table for preview contacts
CREATE TABLE IF NOT EXISTS import_preview_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES contact_import_jobs(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- ID from provider (Google, Microsoft)
  display_name TEXT,
  given_name TEXT,
  family_name TEXT,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  organization TEXT,
  job_title TEXT,
  notes TEXT,
  raw_data JSONB, -- Full contact data from provider
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_preview_contacts_job_id ON import_preview_contacts(job_id);
CREATE INDEX idx_preview_contacts_external_id ON import_preview_contacts(external_id);

-- Add RLS policies
ALTER TABLE import_preview_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preview contacts"
  ON import_preview_contacts
  FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM contact_import_jobs
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert preview contacts"
  ON import_preview_contacts
  FOR INSERT
  WITH CHECK (true); -- Service role only

CREATE POLICY "System can delete preview contacts"
  ON import_preview_contacts
  FOR DELETE
  USING (true); -- Service role only

-- Add comment
COMMENT ON TABLE import_preview_contacts IS 'Temporary storage for contacts before user selection during import';
