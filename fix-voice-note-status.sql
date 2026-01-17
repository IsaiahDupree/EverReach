-- Fix voice notes that have transcripts but are stuck in 'pending' status
-- Run this in your Supabase SQL Editor to update existing voice notes

UPDATE persona_notes
SET status = 'completed'
WHERE type = 'voice'
  AND status = 'pending'
  AND transcript IS NOT NULL
  AND transcript != '';

-- Check how many were updated
SELECT COUNT(*) as updated_count
FROM persona_notes
WHERE type = 'voice'
  AND status = 'completed'
  AND transcript IS NOT NULL;

-- Verify the distribution
SELECT 
  status,
  COUNT(*) as count
FROM persona_notes
WHERE type = 'voice'
GROUP BY status;
