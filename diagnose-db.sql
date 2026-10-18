-- Check user_event table structure
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_event'
ORDER BY ordinal_position;

-- Check what enum types exist
SELECT  
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
GROUP BY t.typname
ORDER BY t.typname;
