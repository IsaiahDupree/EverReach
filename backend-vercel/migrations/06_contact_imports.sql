-- Migration: Contact Import System
-- Description: Track third-party contact imports (Google, Microsoft, etc.)
-- Date: 2025-11-01
-- Version: 1.0

-- =====================================================
-- 1. Create ENUMs
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.import_provider AS ENUM (
    'google',
    'microsoft',
    'apple',
    'csv',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_status AS ENUM (
    'pending',
    'authenticating',
    'fetching',
    'processing',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. Contact Import Jobs Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider info
  provider public.import_provider NOT NULL,
  provider_account_id text,              -- Email or ID from provider
  provider_account_name text,            -- Display name from provider
  
  -- Status
  status public.import_status NOT NULL DEFAULT 'pending',
  
  -- Progress
  total_contacts integer DEFAULT 0,
  processed_contacts integer DEFAULT 0,
  imported_contacts integer DEFAULT 0,   -- Successfully created/updated
  skipped_contacts integer DEFAULT 0,    -- Duplicates or invalid
  failed_contacts integer DEFAULT 0,
  
  -- OAuth tokens (encrypted in production)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  
  -- Results
  error_message text,
  error_details jsonb,
  
  -- Metadata
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Imported Contacts Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.imported_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.contact_import_jobs(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Provider info
  provider_contact_id text NOT NULL,     -- ID from provider
  provider_etag text,                    -- For sync/updates
  
  -- Import decision
  action text NOT NULL,                  -- 'created', 'updated', 'skipped', 'failed'
  skip_reason text,                      -- Why skipped (duplicate, invalid, etc.)
  
  -- Original data
  raw_data jsonb NOT NULL,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON public.contact_import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.contact_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON public.contact_import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_provider ON public.contact_import_jobs(provider, user_id);

CREATE INDEX IF NOT EXISTS idx_imported_contacts_job ON public.imported_contacts(import_job_id);
CREATE INDEX IF NOT EXISTS idx_imported_contacts_contact ON public.imported_contacts(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imported_contacts_provider ON public.imported_contacts(provider_contact_id);

-- Composite index for checking duplicates
CREATE INDEX IF NOT EXISTS idx_imported_contacts_lookup 
ON public.imported_contacts(import_job_id, provider_contact_id);

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to get import job status
CREATE OR REPLACE FUNCTION get_import_job_summary(p_job_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'provider', provider,
    'status', status,
    'total_contacts', total_contacts,
    'processed_contacts', processed_contacts,
    'imported_contacts', imported_contacts,
    'skipped_contacts', skipped_contacts,
    'failed_contacts', failed_contacts,
    'progress_percent', CASE 
      WHEN total_contacts > 0 THEN ROUND(100.0 * processed_contacts / total_contacts, 2)
      ELSE 0
    END,
    'started_at', started_at,
    'completed_at', completed_at,
    'duration_seconds', CASE
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))
      ELSE NULL
    END
  )
  FROM public.contact_import_jobs
  WHERE id = p_job_id;
$$;

-- Function to update import job progress
CREATE OR REPLACE FUNCTION update_import_progress(
  p_job_id uuid,
  p_processed integer DEFAULT NULL,
  p_imported integer DEFAULT NULL,
  p_skipped integer DEFAULT NULL,
  p_failed integer DEFAULT NULL
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.contact_import_jobs
  SET
    processed_contacts = COALESCE(p_processed, processed_contacts),
    imported_contacts = COALESCE(p_imported, imported_contacts),
    skipped_contacts = COALESCE(p_skipped, skipped_contacts),
    failed_contacts = COALESCE(p_failed, failed_contacts),
    updated_at = now()
  WHERE id = p_job_id;
$$;

-- Function to check if contact already imported from provider
CREATE OR REPLACE FUNCTION is_contact_imported(
  p_user_id uuid,
  p_provider text,
  p_provider_contact_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.imported_contacts ic
    JOIN public.contact_import_jobs job ON ic.import_job_id = job.id
    WHERE job.user_id = p_user_id
      AND job.provider::text = p_provider
      AND ic.provider_contact_id = p_provider_contact_id
      AND ic.contact_id IS NOT NULL
  );
$$;

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.contact_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_contacts ENABLE ROW LEVEL SECURITY;

-- Users can view their own import jobs
CREATE POLICY "Users can view own import jobs"
  ON public.contact_import_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own import jobs
CREATE POLICY "Users can create own import jobs"
  ON public.contact_import_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own import jobs
CREATE POLICY "Users can update own import jobs"
  ON public.contact_import_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage import jobs"
  ON public.contact_import_jobs
  FOR ALL
  USING (true);

-- Users can view their imported contacts
CREATE POLICY "Users can view own imported contacts"
  ON public.imported_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_import_jobs
      WHERE id = import_job_id AND user_id = auth.uid()
    )
  );

-- Service role can manage all
CREATE POLICY "Service role can manage imported contacts"
  ON public.imported_contacts
  FOR ALL
  USING (true);

-- =====================================================
-- 7. Comments
-- =====================================================

COMMENT ON TABLE public.contact_import_jobs IS 'Tracks contact import jobs from third-party providers';
COMMENT ON TABLE public.imported_contacts IS 'Tracks individual contacts imported from each job';

COMMENT ON COLUMN public.contact_import_jobs.provider IS 'Third-party provider (google, microsoft, etc.)';
COMMENT ON COLUMN public.contact_import_jobs.status IS 'Current status of import job';
COMMENT ON COLUMN public.contact_import_jobs.access_token IS 'OAuth access token (encrypt in production)';

COMMENT ON COLUMN public.imported_contacts.action IS 'What happened with this contact (created, updated, skipped, failed)';
COMMENT ON COLUMN public.imported_contacts.provider_contact_id IS 'Contact ID from the provider system';

-- =====================================================
-- Migration Complete
-- =====================================================
