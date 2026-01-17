-- Check message_goals table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'message_goals'
ORDER BY ordinal_position;
