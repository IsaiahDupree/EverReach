-- Fix for "Unknown date" issue in Contact Context page
-- This migration ensures all interactions have a valid occurred_at timestamp

-- Step 1: Update NULL occurred_at values to use created_at as fallback
UPDATE interactions
SET occurred_at = created_at
WHERE occurred_at IS NULL;

-- Step 2: Ensure occurred_at has a default value for new records
ALTER TABLE interactions
ALTER COLUMN occurred_at SET DEFAULT NOW();

-- Step 3: Make occurred_at NOT NULL (if it isn't already)
ALTER TABLE interactions
ALTER COLUMN occurred_at SET NOT NULL;

-- Step 4: Create an index on occurred_at for better query performance
CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at 
ON interactions(occurred_at DESC);

-- Step 5: Create a composite index for contact_id + occurred_at
CREATE INDEX IF NOT EXISTS idx_interactions_contact_occurred 
ON interactions(contact_id, occurred_at DESC);

-- Verification query - check if any NULL values remain
SELECT COUNT(*) as null_count 
FROM interactions 
WHERE occurred_at IS NULL;

-- Sample query to verify the fix
SELECT 
  id,
  contact_id,
  kind,
  occurred_at,
  created_at,
  CASE 
    WHEN occurred_at IS NULL THEN 'MISSING'
    ELSE 'OK'
  END as status
FROM interactions
ORDER BY created_at DESC
LIMIT 10;
