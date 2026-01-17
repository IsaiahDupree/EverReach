-- Message Generation Feedbacks and Regenerate lineage

BEGIN;

-- Parent linkage for regenerations
ALTER TABLE IF EXISTS message_generations
ADD COLUMN IF NOT EXISTS parent_generation_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_message_generations_parent
  ON message_generations(parent_generation_id);

-- Feedbacks table
CREATE TABLE IF NOT EXISTS message_generation_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES message_generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'like','dislike','copy','regenerate','accept','reject','edit'
  )),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mg_feedbacks_generation
  ON message_generation_feedbacks(generation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mg_feedbacks_user
  ON message_generation_feedbacks(user_id, created_at DESC);

-- RLS
ALTER TABLE message_generation_feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies: users can view/insert their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_generation_feedbacks' AND policyname = 'mg_feedbacks_select_own'
  ) THEN
    CREATE POLICY mg_feedbacks_select_own ON message_generation_feedbacks
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_generation_feedbacks' AND policyname = 'mg_feedbacks_insert_own'
  ) THEN
    CREATE POLICY mg_feedbacks_insert_own ON message_generation_feedbacks
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

COMMIT;
