-- Contact Photo Download Jobs
-- Tracks background jobs for downloading and re-hosting contact photos from external URLs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contact_photo_jobs table
CREATE TABLE IF NOT EXISTS contact_photo_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  external_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  storage_path text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'downloading', 'completed', 'failed'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_photo_jobs_status ON contact_photo_jobs(status);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_contact ON contact_photo_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_created ON contact_photo_jobs(created_at DESC);

-- Index for finding pending jobs to process
CREATE INDEX IF NOT EXISTS idx_photo_jobs_pending ON contact_photo_jobs(created_at) WHERE status = 'pending';

-- RLS Policies (users can only see jobs for their own contacts)
ALTER TABLE contact_photo_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photo jobs"
  ON contact_photo_jobs FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access"
  ON contact_photo_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_photo_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER photo_jobs_updated_at
  BEFORE UPDATE ON contact_photo_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_job_updated_at();

-- Function to queue photo download job (if not already queued)
CREATE OR REPLACE FUNCTION queue_contact_photo_download(
  p_contact_id uuid,
  p_external_url text
) RETURNS uuid AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Check if job already exists for this contact
  SELECT id INTO v_job_id
  FROM contact_photo_jobs
  WHERE contact_id = p_contact_id
    AND (status = 'pending' OR status = 'downloading' OR status = 'completed')
  LIMIT 1;

  -- Only create new job if none exists
  IF v_job_id IS NULL THEN
    INSERT INTO contact_photo_jobs (contact_id, external_url, status)
    VALUES (p_contact_id, p_external_url, 'pending')
    RETURNING id INTO v_job_id;
  END IF;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get stats on photo jobs
CREATE OR REPLACE FUNCTION get_photo_job_stats()
RETURNS TABLE (
  status text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.status,
    COUNT(*)::bigint
  FROM contact_photo_jobs pj
  GROUP BY pj.status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE contact_photo_jobs IS 'Background jobs for downloading and re-hosting contact photos from external URLs (Google, Microsoft, etc.)';
COMMENT ON COLUMN contact_photo_jobs.external_url IS 'Original URL from provider (e.g., Google Photos URL)';
COMMENT ON COLUMN contact_photo_jobs.storage_path IS 'Path in Supabase Storage after successful download';
COMMENT ON COLUMN contact_photo_jobs.retry_count IS 'Number of retry attempts (max 3)';
