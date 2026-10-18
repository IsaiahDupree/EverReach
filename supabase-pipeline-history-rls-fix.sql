-- Fix RLS policies for contact_pipeline_history table
-- This allows authenticated users to insert history records for contacts in their org

-- First, ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS contact_pipeline_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  pipeline_id uuid references pipelines(id) on delete cascade,
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id uuid references pipeline_stages(id) on delete cascade,
  changed_by_user_id uuid not null,
  reason text,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE contact_pipeline_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "contact_pipeline_history_read_org" ON contact_pipeline_history;
DROP POLICY IF EXISTS "contact_pipeline_history_write_org" ON contact_pipeline_history;
DROP POLICY IF EXISTS "Users can insert pipeline history for their org" ON contact_pipeline_history;
DROP POLICY IF EXISTS "Users can view pipeline history for their org" ON contact_pipeline_history;

-- Create new policies that work with the backend
-- Policy 1: Allow authenticated users to view history for contacts in their org
CREATE POLICY "Users can view pipeline history for their org" 
ON contact_pipeline_history
FOR SELECT 
TO authenticated
USING (
  org_id IN (
    SELECT org_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy 2: Allow authenticated users to insert history for contacts in their org
CREATE POLICY "Users can insert pipeline history for their org" 
ON contact_pipeline_history
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Check that the org_id matches the user's org
  org_id IN (
    SELECT org_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  AND
  -- Check that the contact belongs to the same org
  contact_id IN (
    SELECT id 
    FROM contacts 
    WHERE org_id IN (
      SELECT org_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS contact_pipeline_history_contact_idx 
  ON contact_pipeline_history (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_pipeline_history_org_idx 
  ON contact_pipeline_history (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_pipeline_history_changed_by_idx 
  ON contact_pipeline_history (changed_by_user_id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'contact_pipeline_history'
ORDER BY policyname;

-- Success message
SELECT 'contact_pipeline_history RLS policies fixed successfully!' as message;
