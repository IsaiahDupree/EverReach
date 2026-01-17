-- Migration: Fix interactions occurred_at field
-- Purpose: Backfill NULL occurred_at values with created_at
-- Date: 2025-10-14
-- Related: Fix for "Unknown date" in interaction history timeline

-- ============================================================================
-- 1. Backfill existing NULL occurred_at values
-- ============================================================================

-- Update interactions where occurred_at is NULL to use created_at
UPDATE interactions 
SET occurred_at = created_at 
WHERE occurred_at IS NULL;

-- Log how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % interactions with NULL occurred_at', updated_count;
END $$;

-- ============================================================================
-- 2. Set default value for future inserts
-- ============================================================================

-- Set default to NOW() for new interactions if occurred_at is not provided
ALTER TABLE interactions 
ALTER COLUMN occurred_at SET DEFAULT NOW();

-- ============================================================================
-- 3. Add index for better query performance
-- ============================================================================

-- Create index on occurred_at for timeline queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at 
ON interactions(occurred_at DESC);

-- Create composite index for contact-specific timeline queries
CREATE INDEX IF NOT EXISTS idx_interactions_contact_occurred 
ON interactions(contact_id, occurred_at DESC);

-- ============================================================================
-- 4. Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN interactions.occurred_at IS 
'Timestamp when the interaction actually occurred. Defaults to created_at if not specified. Used for timeline displays and historical analysis.';

-- ============================================================================
-- 5. Verify the migration
-- ============================================================================

-- Check for any remaining NULL values (should be 0)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM interactions 
  WHERE occurred_at IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Warning: % interactions still have NULL occurred_at', null_count;
  ELSE
    RAISE NOTICE 'Success: All interactions now have occurred_at values';
  END IF;
END $$;
