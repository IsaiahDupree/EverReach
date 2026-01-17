-- ============================================================================
-- Enable E2E Test Data Creation
-- ============================================================================
-- This migration adds RLS policies that allow the service role to create
-- test data for E2E tests. The service role is identified by the JWT role claim.
--
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
-- ============================================================================

-- ============================================================================
-- Organizations Table - Allow service role to create test orgs
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Service role can update organizations" ON organizations;
DROP POLICY IF EXISTS "Service role can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Service role can select organizations" ON organizations;

-- Allow service role to insert test organizations
CREATE POLICY "Service role can insert organizations"
ON organizations
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to update test organizations
CREATE POLICY "Service role can update organizations"
ON organizations
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Allow service role to delete test organizations
CREATE POLICY "Service role can delete organizations"
ON organizations
FOR DELETE
TO service_role
USING (true);

-- Allow service role to select organizations
CREATE POLICY "Service role can select organizations"
ON organizations
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- People Table - Allow service role to create test contacts
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert people" ON people;
DROP POLICY IF EXISTS "Service role can update people" ON people;
DROP POLICY IF EXISTS "Service role can delete people" ON people;
DROP POLICY IF EXISTS "Service role can select people" ON people;

CREATE POLICY "Service role can insert people"
ON people
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update people"
ON people
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete people"
ON people
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service role can select people"
ON people
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- Interactions Table - Allow service role to create test interactions
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert interactions" ON interactions;
DROP POLICY IF EXISTS "Service role can update interactions" ON interactions;
DROP POLICY IF EXISTS "Service role can delete interactions" ON interactions;
DROP POLICY IF EXISTS "Service role can select interactions" ON interactions;

CREATE POLICY "Service role can insert interactions"
ON interactions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update interactions"
ON interactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete interactions"
ON interactions
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service role can select interactions"
ON interactions
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- API Keys Table - Allow service role to create test API keys
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can update api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can delete api_keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can select api_keys" ON api_keys;

CREATE POLICY "Service role can insert api_keys"
ON api_keys
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update api_keys"
ON api_keys
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete api_keys"
ON api_keys
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service role can select api_keys"
ON api_keys
FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- Verify RLS is enabled on these tables
-- ============================================================================

-- Check if RLS is enabled (should already be enabled, but let's verify)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Summary
-- ============================================================================

-- This migration adds policies that allow the service role (used by E2E tests)
-- to bypass RLS restrictions for test data creation.
--
-- The service_role is a special PostgreSQL role in Supabase that:
-- 1. Has full access to the database
-- 2. Is authenticated using the SUPABASE_SERVICE_ROLE_KEY
-- 3. Should ONLY be used server-side (never exposed to clients)
--
-- Security Notes:
-- - These policies ONLY affect the service role
-- - Regular users (authenticated role) still use existing RLS policies
-- - Test data is isolated by org_id, so tests won't interfere with prod data
-- - E2E tests clean up after themselves in afterAll() hooks

SELECT 'E2E test data policies created successfully!' as status;
