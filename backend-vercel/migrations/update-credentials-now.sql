/**
 * IMMEDIATE CREDENTIAL UPDATES
 * Run this in Supabase SQL Editor to activate Meta integration
 * Date: November 10, 2025
 */

-- ========================================
-- 1. UPDATE META INTEGRATION WITH TOKEN
-- ========================================
UPDATE integration_accounts
SET 
  auth_json = jsonb_build_object(
    'access_token', 'EAAGcC88rBhYBP8X9ikGk7TbSb8ZANYdIi9efF0ZBXTl9gOX0IMXzMYvYRanY1h65T4DZB2KyCD5KZCKiF3bHiy3eZAGaj53WxDlHgEA9zwwpIn6qNvMmTECXtNfrx5br1Rm2nBJY5SfwvZA168lMuGfmi0qq1YxqPhkrzMdygCQo5Wwh5F0ZAEHns1q30KYK2d2r8a3wrGj',
    'ad_account_id', 'act_1130334212412487',
    'app_id', '453049510987286',
    'proxy_url', 'https://www.matrixloop.app/api/meta'
  ),
  is_active = true,
  updated_at = now()
WHERE service = 'meta'
  AND workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c';

-- ========================================
-- 2. VERIFY ALL ACTIVE INTEGRATIONS
-- ========================================
SELECT 
  service,
  is_active,
  CASE 
    WHEN auth_json->>'api_key' IS NOT NULL THEN '✅ Has API Key'
    WHEN auth_json->>'service_role_key' IS NOT NULL THEN '✅ Has Service Key'
    WHEN auth_json->>'access_token' IS NOT NULL THEN '✅ Has Access Token'
    ELSE '❌ Missing Key'
  END as credential_status,
  CASE
    WHEN is_active = true THEN '🟢 ACTIVE'
    ELSE '🔴 INACTIVE'
  END as status,
  updated_at as last_updated
FROM integration_accounts
WHERE workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c'
ORDER BY is_active DESC, service;

-- ========================================
-- 3. CHECK SERVICE HEALTH STATUS
-- ========================================
SELECT 
  ss.service,
  ss.status as health_status,
  ss.message,
  ss.last_check,
  ia.is_active as integration_active
FROM service_status ss
LEFT JOIN integration_accounts ia 
  ON ia.service = ss.service 
  AND ia.workspace_id = ss.workspace_id
WHERE ss.workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c'
ORDER BY 
  CASE ss.status 
    WHEN 'UP' THEN 1 
    WHEN 'DEGRADED' THEN 2 
    WHEN 'DOWN' THEN 3 
    ELSE 4 
  END,
  ss.service;

-- ========================================
-- 4. MARK UNCONFIGURED SERVICES AS INACTIVE
-- ========================================
-- This prevents health check errors for services without credentials
UPDATE integration_accounts
SET is_active = false
WHERE workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c'
  AND service IN ('apple', 'google', 'mobile_app')
  AND (
    auth_json->>'api_key' IS NULL
    OR auth_json->>'api_key' LIKE 'YOUR_%'
  );

-- ========================================
-- 5. VIEW SUMMARY
-- ========================================
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active_integrations,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_integrations,
  COUNT(*) as total_integrations
FROM integration_accounts
WHERE workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c';

-- ========================================
-- EXPECTED RESULTS AFTER RUNNING THIS:
-- ========================================
-- Active Integrations: 9
--   - OpenAI ✅
--   - Superwall ✅
--   - Stripe ✅
--   - Supabase ✅
--   - PostHog ✅
--   - Twilio ✅
--   - Resend ✅
--   - RevenueCat ✅
--   - Meta ✅ (after this update)
--
-- Inactive Integrations: 3
--   - Apple (needs App Store Connect API)
--   - Google (needs Play Console service account)
--   - mobile_app (internal service)
--
-- Dashboard should show 9 services UP or DEGRADED
-- (none should be DOWN except Apple/Google which are inactive)
