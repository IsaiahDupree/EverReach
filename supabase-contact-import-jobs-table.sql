-- Migration: Create contact_import_jobs table
-- This table tracks OAuth-based contact imports from third-party providers

CREATE TABLE IF NOT EXISTS contact_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'icloud')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'authenticating', 'fetching', 'processing', 'completed', 'failed')),
  
  -- Progress tracking
  total_contacts INTEGER NOT NULL DEFAULT 0,
  imported_contacts INTEGER NOT NULL DEFAULT 0,
  skipped_contacts INTEGER NOT NULL DEFAULT 0,
  failed_contacts INTEGER NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Provider details
  provider_account_name TEXT,
  oauth_state TEXT UNIQUE,
  refresh_token TEXT, -- Encrypted in production
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_import_jobs_user_id ON contact_import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_import_jobs_status ON contact_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_contact_import_jobs_oauth_state ON contact_import_jobs(oauth_state);
CREATE INDEX IF NOT EXISTS idx_contact_import_jobs_started_at ON contact_import_jobs(started_at DESC);

-- RLS Policies
ALTER TABLE contact_import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own import jobs
CREATE POLICY "Users can view own import jobs"
  ON contact_import_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own import jobs
CREATE POLICY "Users can create own import jobs"
  ON contact_import_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own import jobs
CREATE POLICY "Users can update own import jobs"
  ON contact_import_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add columns to contacts table if they don't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES contact_import_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_import_job_id ON contacts(import_job_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_contact_import_jobs_updated_at
  BEFORE UPDATE ON contact_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_import_jobs_updated_at();

COMMENT ON TABLE contact_import_jobs IS 'Tracks OAuth-based contact imports from third-party providers like Google, Microsoft, etc.';
COMMENT ON COLUMN contact_import_jobs.oauth_state IS 'OAuth state parameter for security (CSRF protection)';
COMMENT ON COLUMN contact_import_jobs.refresh_token IS 'OAuth refresh token for re-authentication (should be encrypted)';
COMMENT ON COLUMN contact_import_jobs.progress_percent IS 'Import progress from 0-100';
