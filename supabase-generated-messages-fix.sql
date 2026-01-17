-- Fix generated_messages foreign key constraint
-- The table currently references people(id) but should reference contacts(id)

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE generated_messages 
DROP CONSTRAINT IF EXISTS generated_messages_person_id_fkey;

-- Step 2: Add the correct foreign key constraint to contacts table
ALTER TABLE generated_messages 
ADD CONSTRAINT generated_messages_person_fkey 
FOREIGN KEY (person_id) 
REFERENCES contacts(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint was created
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'generated_messages_person_fkey';
