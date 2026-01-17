-- Check what contacts remain
SELECT 
  display_name, 
  emails, 
  tags,
  created_at
FROM contacts 
ORDER BY created_at DESC 
LIMIT 20;
