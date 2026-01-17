-- Add multi-mode warmth score system
-- Supports 4 cadence modes: slow, medium, fast, test

-- Create warmth mode enum
CREATE TYPE warmth_mode AS ENUM ('slow', 'medium', 'fast', 'test');

-- Add warmth_mode column to contacts
ALTER TABLE contacts 
ADD COLUMN warmth_mode warmth_mode DEFAULT 'medium',
ADD COLUMN warmth_score_cached int,
ADD COLUMN warmth_cached_at timestamptz;

-- Create index for mode-based queries
CREATE INDEX idx_contacts_warmth_mode ON contacts(warmth_mode);
CREATE INDEX idx_contacts_warmth_cached ON contacts(warmth_score_cached) WHERE warmth_score_cached IS NOT NULL;

-- Lambda values for each mode
CREATE OR REPLACE FUNCTION warmth_lambda(mode warmth_mode)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE mode
    WHEN 'slow'   THEN 0.040132   -- ~30 days to reach score 30
    WHEN 'medium' THEN 0.085998   -- ~14 days to reach score 30
    WHEN 'fast'   THEN 0.171996   -- ~7 days to reach score 30
    WHEN 'test'   THEN 2.407946   -- ~12 hours to reach score 30 (for testing)
  END;
$$;

-- Calculate warmth score based on mode
CREATE OR REPLACE FUNCTION warmth_score_for_mode(
  last_touch_at timestamptz,
  mode warmth_mode,
  w0 int DEFAULT 100,
  wmin int DEFAULT 0
)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(0, LEAST(100,
    ROUND(
      wmin + (w0 - wmin) * EXP(
        -warmth_lambda(mode) * 
        EXTRACT(EPOCH FROM (NOW() - last_touch_at)) / 86400.0
      )
    )
  ))::int;
$$;

-- Calculate days until warmth score reaches threshold
CREATE OR REPLACE FUNCTION warmth_days_until_threshold(
  current_score int,
  mode warmth_mode,
  threshold int DEFAULT 30
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN current_score <= threshold THEN 0
    ELSE (LN(current_score) - LN(threshold)) / warmth_lambda(mode)
  END;
$$;

-- Update warmth band based on score
CREATE OR REPLACE FUNCTION warmth_band_for_score(score int)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN score >= 80 THEN 'hot'
    WHEN score >= 60 THEN 'warm'
    WHEN score >= 40 THEN 'neutral'
    WHEN score >= 20 THEN 'cool'
    ELSE 'cold'
  END;
$$;

-- Trigger to update warmth_band when warmth score changes
CREATE OR REPLACE FUNCTION update_warmth_band()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.warmth IS NOT NULL THEN
    NEW.warmth_band := warmth_band_for_score(NEW.warmth);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_warmth_band
  BEFORE INSERT OR UPDATE OF warmth
  ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_warmth_band();

-- View for contacts with calculated warmth scores
CREATE OR REPLACE VIEW contacts_with_warmth AS
SELECT 
  c.*,
  warmth_score_for_mode(
    c.last_interaction_at,
    COALESCE(c.warmth_mode, 'medium'::warmth_mode),
    100,
    0
  ) AS warmth_live,
  warmth_days_until_threshold(
    COALESCE(c.warmth, warmth_score_for_mode(c.last_interaction_at, COALESCE(c.warmth_mode, 'medium'::warmth_mode), 100, 0)),
    COALESCE(c.warmth_mode, 'medium'::warmth_mode),
    30
  ) AS days_until_due
FROM contacts c;

-- Track warmth mode changes
CREATE TABLE IF NOT EXISTS warmth_mode_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_mode warmth_mode,
  to_mode warmth_mode NOT NULL,
  score_before int,
  score_after int,
  changed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_warmth_mode_changes_contact ON warmth_mode_changes(contact_id, changed_at DESC);
CREATE INDEX idx_warmth_mode_changes_user ON warmth_mode_changes(user_id, changed_at DESC);

-- RLS policies for warmth_mode_changes
ALTER TABLE warmth_mode_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own warmth mode changes"
  ON warmth_mode_changes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warmth mode changes"
  ON warmth_mode_changes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comment documentation
COMMENT ON TYPE warmth_mode IS 'Warmth decay cadence: slow (~30d), medium (~14d), fast (~7d), test (~12h)';
COMMENT ON FUNCTION warmth_lambda(warmth_mode) IS 'Returns decay constant λ for warmth mode';
COMMENT ON FUNCTION warmth_score_for_mode(timestamptz, warmth_mode, int, int) IS 'Calculate warmth score using exponential decay: W(t) = Wmin + (W0 - Wmin) * e^(-λ*Δt)';
COMMENT ON FUNCTION warmth_days_until_threshold(int, warmth_mode, int) IS 'Calculate days until warmth score decays to threshold';
COMMENT ON TABLE warmth_mode_changes IS 'Audit log of warmth mode changes for analytics';
