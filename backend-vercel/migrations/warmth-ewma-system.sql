-- Warmth EWMA System Migration
-- Adds continuous-time decay fields and supporting indexes

-- 1) New columns on contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS amplitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warmth_last_updated_at TIMESTAMPTZ NULL;

-- 2) Optional backfill: use last_interaction_at recency to seed a tiny amplitude
--    This keeps existing contacts from appearing too cold immediately.
--    You can safely skip this if you want a hard reset.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'last_interaction_at') THEN
    UPDATE contacts
      SET amplitude = CASE
        WHEN last_interaction_at IS NULL THEN 0
        WHEN NOW() - last_interaction_at < INTERVAL '7 days' THEN 8
        WHEN NOW() - last_interaction_at < INTERVAL '30 days' THEN 5
        WHEN NOW() - last_interaction_at < INTERVAL '60 days' THEN 3
        ELSE 1
      END,
      warmth_last_updated_at = COALESCE(last_interaction_at, NOW())
    WHERE amplitude = 0 AND warmth_last_updated_at IS NULL;
  END IF;
END $$;

-- 3) Indexes to speed up reads
CREATE INDEX IF NOT EXISTS idx_contacts_warmth_last_updated_at ON contacts (warmth_last_updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contacts_amplitude ON contacts (amplitude);

-- 4) (Optional) View for debugging current computed warmth at read time
--    This uses a 30-day half-life approximation in SQL for observability only.
--    App should compute in app layer via lib/warmth-ewma.ts.
-- DROP VIEW IF EXISTS v_contacts_warmth_now;
-- CREATE VIEW v_contacts_warmth_now AS
-- SELECT
--   c.id,
--   30 +
--   (c.amplitude * EXP(- (LN(2) / 30.0) * GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(c.warmth_last_updated_at, NOW()))) / 86400.0))) AS warmth_now
-- FROM contacts c;
