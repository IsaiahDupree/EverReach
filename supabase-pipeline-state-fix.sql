-- Fix contact_pipeline_state table to include org_id for proper RLS
-- This resolves the 400 error when updating pipeline state

-- Step 1: Add org_id column
ALTER TABLE contact_pipeline_state 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;

-- Step 2: Populate org_id from contacts table
UPDATE contact_pipeline_state cps
SET org_id = c.org_id
FROM contacts c
WHERE cps.contact_id = c.id AND cps.org_id IS NULL;

-- Step 3: Make org_id NOT NULL (after ensuring all rows have values)
-- Note: Only run this after verifying all rows have org_id populated
-- ALTER TABLE contact_pipeline_state ALTER COLUMN org_id SET NOT NULL;

-- Step 4: Update RLS policies to use org_id directly (more efficient)
DROP POLICY IF EXISTS "contact_pipeline_state_read_org" ON contact_pipeline_state;
DROP POLICY IF EXISTS "contact_pipeline_state_write_org" ON contact_pipeline_state;
DROP POLICY IF EXISTS "contact_pipeline_state_update_org" ON contact_pipeline_state;
DROP POLICY IF EXISTS "contact_pipeline_state_delete_org" ON contact_pipeline_state;

CREATE POLICY "contact_pipeline_state_read_org" ON contact_pipeline_state
  FOR SELECT USING (is_member(org_id));

CREATE POLICY "contact_pipeline_state_write_org" ON contact_pipeline_state
  FOR INSERT WITH CHECK (is_member(org_id));

CREATE POLICY "contact_pipeline_state_update_org" ON contact_pipeline_state
  FOR UPDATE USING (is_member(org_id)) WITH CHECK (is_member(org_id));

CREATE POLICY "contact_pipeline_state_delete_org" ON contact_pipeline_state
  FOR DELETE USING (is_member(org_id));

-- Step 5: Add index for better performance
CREATE INDEX IF NOT EXISTS contact_pipeline_state_org_idx ON contact_pipeline_state (org_id);

-- Step 6: Update contact_pipeline_history to also have org_id if not present
ALTER TABLE contact_pipeline_history 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;

UPDATE contact_pipeline_history cph
SET org_id = c.org_id
FROM contacts c
WHERE cph.contact_id = c.id AND cph.org_id IS NULL;

-- Step 7: Update contact_pipeline_history RLS policies
DROP POLICY IF EXISTS "contact_pipeline_history_read_org" ON contact_pipeline_history;
DROP POLICY IF EXISTS "contact_pipeline_history_write_org" ON contact_pipeline_history;

CREATE POLICY "contact_pipeline_history_read_org" ON contact_pipeline_history
  FOR SELECT USING (is_member(org_id));

CREATE POLICY "contact_pipeline_history_write_org" ON contact_pipeline_history
  FOR INSERT WITH CHECK (is_member(org_id));

-- Success message
SELECT 'Pipeline state tables fixed! org_id column added and RLS policies updated.' as message;
