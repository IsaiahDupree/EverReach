-- Fix pipeline_history table to match backend expectations
-- The backend expects a table named 'contact_pipeline_history' with specific columns

-- Create contact_pipeline_history table if it doesn't exist
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

-- Create RLS policies
DROP POLICY IF EXISTS "contact_pipeline_history_read_org" ON contact_pipeline_history;
CREATE POLICY "contact_pipeline_history_read_org" ON contact_pipeline_history
  FOR SELECT USING (is_member(org_id));

DROP POLICY IF EXISTS "contact_pipeline_history_write_org" ON contact_pipeline_history;
CREATE POLICY "contact_pipeline_history_write_org" ON contact_pipeline_history
  FOR INSERT WITH CHECK (is_member(org_id));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS contact_pipeline_history_contact_idx 
  ON contact_pipeline_history (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_pipeline_history_org_idx 
  ON contact_pipeline_history (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_pipeline_history_changed_by_idx 
  ON contact_pipeline_history (changed_by_user_id);

-- Migrate data from pipeline_history to contact_pipeline_history if pipeline_history exists
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_history') THEN
    INSERT INTO contact_pipeline_history (id, org_id, contact_id, pipeline_id, from_stage_id, to_stage_id, changed_by_user_id, reason, created_at)
    SELECT 
      id, 
      org_id, 
      contact_id, 
      pipeline_id, 
      from_stage_id, 
      to_stage_id, 
      COALESCE(moved_by, changed_by_user_id, '00000000-0000-0000-0000-000000000000'::uuid) as changed_by_user_id,
      reason,
      COALESCE(moved_at, created_at, now()) as created_at
    FROM pipeline_history
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $;

-- Success message
SELECT 'contact_pipeline_history table created successfully!' as message;
