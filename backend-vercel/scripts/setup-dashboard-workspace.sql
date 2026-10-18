-- Developer Dashboard - Workspace Setup
-- Run this in Supabase SQL Editor to prepare for dashboard tests

-- ============================================================================
-- 1. Create Test Workspace (if doesn't exist)
-- ============================================================================

INSERT INTO workspaces (id, name, created_at) 
VALUES (
  gen_random_uuid(), 
  'Production Workspace',
  now()
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Get or Create Profile for Test User
-- ============================================================================

-- Get your user ID
DO $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'isaiahdupree33@gmail.com'
  LIMIT 1;

  -- Get workspace
  SELECT id INTO v_workspace_id
  FROM workspaces
  LIMIT 1;

  -- Create or update profile
  INSERT INTO profiles (
    user_id,
    workspace_id,
    display_name,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_workspace_id,
    'Isaiah Dupree',
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    workspace_id = v_workspace_id,
    updated_at = now();

  RAISE NOTICE 'Profile updated for user: %, workspace: %', v_user_id, v_workspace_id;
END $$;

-- ============================================================================
-- 3. Verify Setup
-- ============================================================================

SELECT 
  u.id as user_id,
  u.email,
  p.workspace_id,
  w.name as workspace_name,
  p.display_name,
  p.created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
LEFT JOIN workspaces w ON w.id = p.workspace_id
WHERE u.email = 'isaiahdupree33@gmail.com';

-- ============================================================================
-- 4. Create Sample Integration (Optional - for testing)
-- ============================================================================

-- Uncomment if you want to test with a sample integration
/*
INSERT INTO integration_accounts (
  workspace_id,
  service,
  auth_json,
  scopes,
  is_active,
  created_at
)
SELECT
  w.id,
  'backend',
  jsonb_build_object('base_url', 'https://ever-reach-be.vercel.app'),
  ARRAY['read']::text[],
  true,
  now()
FROM workspaces w
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- Success!
-- ============================================================================

SELECT 'Workspace setup complete! ✅' as status;
