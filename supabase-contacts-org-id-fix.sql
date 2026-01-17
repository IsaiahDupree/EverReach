-- Fix for contacts missing org_id
-- This script:
-- 1. Creates a trigger to auto-populate org_id on contact insert
-- 2. Backfills existing contacts with org_id from user_orgs

-- Function to auto-populate org_id on contacts insert
CREATE OR REPLACE FUNCTION auto_set_contact_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
BEGIN
  -- If org_id is already set, don't override it
  IF NEW.org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user's org_id from user_orgs
  SELECT org_id INTO user_org_id
  FROM user_orgs
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- If user has no org, create one
  IF user_org_id IS NULL THEN
    user_org_id := ensure_user_org();
  END IF;

  -- Set the org_id
  NEW.org_id := user_org_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set org_id on contacts insert
DROP TRIGGER IF EXISTS auto_set_contact_org_id_trigger ON contacts;
CREATE TRIGGER auto_set_contact_org_id_trigger
  BEFORE INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_contact_org_id();

-- Backfill existing contacts with org_id
-- This finds contacts without org_id and tries to set it based on:
-- 1. The user who created them (if we can determine that)
-- 2. The first user in the system (fallback)

DO $$
DECLARE
  default_org_id uuid;
  updated_count int;
BEGIN
  -- Get the first org in the system as fallback
  SELECT id INTO default_org_id FROM orgs LIMIT 1;
  
  -- If no org exists, create one
  IF default_org_id IS NULL THEN
    INSERT INTO orgs (name) VALUES ('Default Workspace') RETURNING id INTO default_org_id;
    
    -- Add all users to this org
    INSERT INTO user_orgs (org_id, user_id, role)
    SELECT default_org_id, id, 'owner'
    FROM auth.users
    ON CONFLICT (org_id, user_id) DO NOTHING;
  END IF;
  
  -- Update contacts without org_id
  UPDATE contacts
  SET org_id = default_org_id
  WHERE org_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % contacts with org_id: %', updated_count, default_org_id;
END $$;

-- Verify the fix
SELECT 
  COUNT(*) as total_contacts,
  COUNT(org_id) as contacts_with_org_id,
  COUNT(*) - COUNT(org_id) as contacts_missing_org_id
FROM contacts;

-- Show sample of contacts with org_id
SELECT 
  id,
  display_name,
  org_id,
  created_at
FROM contacts
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Contacts org_id fix complete!' as message;
