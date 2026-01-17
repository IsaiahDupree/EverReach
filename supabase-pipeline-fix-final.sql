-- Complete fix for pipeline history table
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the old table if it exists (to start fresh)
DROP TABLE IF EXISTS contact_pipeline_history CASCADE;

-- Step 2: Create the contact_pipeline_history table with all required columns
CREATE TABLE contact_pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES pipeline_stages(id),
  to_stage_id uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes for better performance
CREATE INDEX contact_pipeline_history_contact_idx 
  ON contact_pipeline_history (contact_id, created_at DESC);

CREATE INDEX contact_pipeline_history_org_idx 
  ON contact_pipeline_history (org_id, created_at DESC);

CREATE INDEX contact_pipeline_history_pipeline_idx 
  ON contact_pipeline_history (pipeline_id, created_at DESC);

CREATE INDEX contact_pipeline_history_changed_by_idx 
  ON contact_pipeline_history (changed_by_user_id);

-- Step 4: Enable RLS
ALTER TABLE contact_pipeline_history ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DROP POLICY IF EXISTS "contact_pipeline_history_read_org" ON contact_pipeline_history;
DROP POLICY IF EXISTS "contact_pipeline_history_write_org" ON contact_pipeline_history;

-- Step 6: Create RLS policies
CREATE POLICY "contact_pipeline_history_read_org" ON contact_pipeline_history
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM contacts c 
      WHERE c.id = contact_id 
      AND is_member(c.org_id)
    )
  );

CREATE POLICY "contact_pipeline_history_write_org" ON contact_pipeline_history
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM contacts c 
      WHERE c.id = contact_id 
      AND is_member(c.org_id)
    )
  );

-- Step 7: Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contact_pipeline_history'
ORDER BY ordinal_position;

-- Success message
SELECT 'contact_pipeline_history table recreated successfully with all required columns!' as message;
