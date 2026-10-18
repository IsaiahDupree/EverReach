-- Migration: Warmth History Tracking
-- Created: 2025-10-29
-- Purpose: Track historical warmth scores for contacts to enable trend visualization

-- ============================================================================
-- Table: warmth_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS warmth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  band VARCHAR(20) NOT NULL CHECK (band IN ('hot', 'warm', 'neutral', 'cool', 'cold')),
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one score per contact per day
  UNIQUE(contact_id, recorded_at)
);

COMMENT ON TABLE warmth_history IS 'Historical warmth scores for contacts';
COMMENT ON COLUMN warmth_history.score IS 'Warmth score (0-100) at the recorded time';
COMMENT ON COLUMN warmth_history.band IS 'Warmth band classification';
COMMENT ON COLUMN warmth_history.recorded_at IS 'Timestamp when this score was recorded (truncated to day)';

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_warmth_history_contact_date 
  ON warmth_history(contact_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_warmth_history_recorded_at 
  ON warmth_history(recorded_at DESC);

COMMENT ON INDEX idx_warmth_history_contact_date IS 'Fast lookups for contact warmth history';
COMMENT ON INDEX idx_warmth_history_recorded_at IS 'Fast date range queries';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE warmth_history ENABLE ROW LEVEL SECURITY;

-- Users can view warmth history for their own contacts
CREATE POLICY warmth_history_select_own 
  ON warmth_history 
  FOR SELECT 
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- System can insert warmth history (for cron jobs and triggers)
CREATE POLICY warmth_history_insert_system 
  ON warmth_history 
  FOR INSERT 
  WITH CHECK (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY warmth_history_select_own ON warmth_history IS 'Users can only view warmth history for their own contacts';
COMMENT ON POLICY warmth_history_insert_system ON warmth_history IS 'Allow system to insert warmth history snapshots';

-- ============================================================================
-- Helper Function: Record Warmth Snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION record_warmth_snapshot(
  p_contact_id UUID,
  p_score INTEGER,
  p_band VARCHAR(20)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recorded_at TIMESTAMP;
  v_history_id UUID;
BEGIN
  -- Truncate to day (midnight UTC)
  v_recorded_at := DATE_TRUNC('day', NOW());
  
  -- Insert or update if exists for this day
  INSERT INTO warmth_history (contact_id, score, band, recorded_at)
  VALUES (p_contact_id, p_score, p_band, v_recorded_at)
  ON CONFLICT (contact_id, recorded_at) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    band = EXCLUDED.band,
    created_at = NOW()
  RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$;

COMMENT ON FUNCTION record_warmth_snapshot IS 'Record daily warmth snapshot (upserts if already exists for today)';

-- ============================================================================
-- Trigger: Auto-record on warmth recompute
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_record_warmth_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only record if warmth changed
  IF (OLD.warmth IS DISTINCT FROM NEW.warmth) THEN
    PERFORM record_warmth_snapshot(NEW.id, NEW.warmth, NEW.warmth_band);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS contacts_warmth_history_trigger ON contacts;

CREATE TRIGGER contacts_warmth_history_trigger
  AFTER UPDATE OF warmth ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_warmth_history();

COMMENT ON TRIGGER contacts_warmth_history_trigger ON contacts IS 'Auto-record warmth history when score changes';

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Warmth history system initialized';
  RAISE NOTICE 'Table created: warmth_history';
  RAISE NOTICE 'Indexes created: idx_warmth_history_contact_date, idx_warmth_history_recorded_at';
  RAISE NOTICE 'RLS policies: warmth_history_select_own, warmth_history_insert_system';
  RAISE NOTICE 'Helper function: record_warmth_snapshot(contact_id, score, band)';
  RAISE NOTICE 'Trigger: contacts_warmth_history_trigger (auto-record on warmth update)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Implement GET /api/v1/contacts/:id/warmth/history (legacy endpoint)';
  RAISE NOTICE '2. Add daily cron job for snapshots';
  RAISE NOTICE '3. Implement GET /api/v1/contacts/:id/warmth-history (primary endpoint)';
END $$;
