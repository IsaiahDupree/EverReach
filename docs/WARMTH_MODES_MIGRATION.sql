-- Migration: Add warmth_mode column to contacts table
-- Description: Enables multi-cadence warmth decay system with slow/medium/fast modes
-- Date: 2025-11-02

-- Add warmth_mode column with default 'medium'
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS warmth_mode TEXT DEFAULT 'medium' CHECK (warmth_mode IN ('slow', 'medium', 'fast', 'test'));

-- Add index for filtering by warmth_mode
CREATE INDEX IF NOT EXISTS idx_contacts_warmth_mode ON contacts(warmth_mode);

-- Update existing contacts to use 'medium' mode if NULL
UPDATE contacts
SET warmth_mode = 'medium'
WHERE warmth_mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN contacts.warmth_mode IS 'Warmth decay mode: slow (~30 days), medium (~14 days), fast (~7 days), test (~12 hours for testing)';
