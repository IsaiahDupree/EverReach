-- ================================================
-- DELETE ALL TEST DATA - Aggressive Cleanup
-- ================================================
-- This will delete ALL contacts that look like test data

-- STEP 1: Delete interactions for test contacts
DELETE FROM interactions 
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE 
    -- Any contact with "test" in the name (case insensitive)
    display_name ILIKE '%test%'
    -- Or "warmth tracking"
    OR display_name ILIKE '%warmth%'
    OR display_name ILIKE '%tracking%'
    -- Or "PW" prefix
    OR display_name ILIKE 'PW %'
    -- Or specific test tags
    OR 'e2e_warmth_test' = ANY(tags)
    OR 'test' = ANY(tags)
    OR 'integration' = ANY(tags)
    -- Or test emails
    OR EXISTS (
      SELECT 1 FROM unnest(emails) AS email 
      WHERE email ILIKE '%test%' 
        OR email ILIKE '%example.com'
    )
    -- Or contacts with test phone numbers
    OR EXISTS (
      SELECT 1 FROM unnest(phones) AS phone 
      WHERE phone LIKE '+15555551234'
    )
);

-- STEP 2: Delete all test contacts
DELETE FROM contacts 
WHERE 
  -- Any contact with "test" in the name (case insensitive)
  display_name ILIKE '%test%'
  -- Or "warmth tracking"
  OR display_name ILIKE '%warmth%'
  OR display_name ILIKE '%tracking%'
  -- Or "PW" prefix
  OR display_name ILIKE 'PW %'
  -- Or specific test tags
  OR 'e2e_warmth_test' = ANY(tags)
  OR 'test' = ANY(tags)
  OR 'integration' = ANY(tags)
  -- Or test emails
  OR EXISTS (
    SELECT 1 FROM unnest(emails) AS email 
    WHERE email ILIKE '%test%' 
      OR email ILIKE '%example.com'
  )
  -- Or contacts with test phone numbers
  OR EXISTS (
    SELECT 1 FROM unnest(phones) AS phone 
    WHERE phone LIKE '+15555551234'
  );

-- STEP 3: Show what's left
SELECT 'Cleanup complete!' as status;
SELECT COUNT(*) as remaining_contacts FROM contacts;
SELECT COUNT(*) as remaining_interactions FROM interactions;
SELECT display_name, emails, created_at 
FROM contacts 
ORDER BY created_at DESC 
LIMIT 10;
