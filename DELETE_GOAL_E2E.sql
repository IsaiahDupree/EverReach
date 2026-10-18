-- Delete GoalE2E test contacts
DELETE FROM interactions 
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE display_name LIKE 'GoalE2E%'
);

DELETE FROM contacts 
WHERE display_name LIKE 'GoalE2E%';

-- Also clean up any other test patterns
DELETE FROM interactions 
WHERE contact_id IN (
  SELECT id FROM contacts 
  WHERE display_name = 'new'
    OR display_name ILIKE '%enterprise cto%'
);

DELETE FROM contacts 
WHERE display_name = 'new'
  OR display_name ILIKE '%enterprise cto%';

SELECT 'Cleanup complete!' as status;
