# Quick Fix for Health Check Errors

## Root Causes Identified ✅

### 1. **PostHog - DEGRADED (Bad Request)**
**Issue**: Using public key `phc_v71...` as `project_id`, but API needs numeric ID

**Fix**: Get numeric project ID
1. Go to https://app.posthog.com/project/settings
2. Find "Project ID" (numeric, e.g., `12345`)
3. Update SQL (line 17 in `fix-health-check-errors.sql`)
4. Replace `YOUR_NUMERIC_PROJECT_ID` with the number

---

### 2. **OpenAI - DOWN (Unauthorized)**  
**Issue**: API key not properly stored in database

**Fix**: ✅ **SQL READY** - Run section 2 of `fix-health-check-errors.sql`
```sql
-- Already configured, just run this to ensure it's set
UPDATE integration_accounts SET ...
```

---

### 3. **RevenueCat - DOWN (Forbidden)**
**Issue**: Missing `project_id` field (adapter requires both `api_key` AND `project_id`)

**Fix**: Get RevenueCat project ID
1. Go to https://app.revenuecat.com/settings/projects
2. Copy your project ID (format: `proj_abcd1234efgh5678`)
3. Update SQL (line 44 in `fix-health-check-errors.sql`)
4. Replace `YOUR_REVENUECAT_PROJECT_ID` with your ID

---

### 4. **Superwall - DEGRADED (Internal Error)**
**Issue**: `app_id` might be incorrect

**Fix**: ✅ **SQL READY** - Run section 4 of `fix-health-check-errors.sql`
- Verify `app_id: 'everreach'` is correct in your Superwall dashboard
- If different, update the SQL before running

---

### 5. **Apple/Google/Meta showing "Missing credentials"**
**Issue**: These are marked `is_active = true` but have placeholder values

**Fix**: ✅ **SQL READY** - Run section 5 of `fix-health-check-errors.sql`
- Sets Apple, Google, mobile_app to `is_active = false`
- Activates Meta with your real token

---

## Quick Action Plan (5 minutes)

### Step 1: Run Immediate Fixes (OpenAI, Superwall, Meta, Disable placeholders)
```sql
-- Open Supabase SQL Editor
-- Run sections 2, 4, 5, and 6 of: fix-health-check-errors.sql
```

**Expected Result:**
- ✅ OpenAI: UP
- ✅ Superwall: UP (if app_id is correct)
- ✅ Meta: UP
- ✅ Apple/Google: No longer showing errors

---

### Step 2: Get PostHog Project ID
1. Visit https://app.posthog.com/project/settings
2. Look for **"Project ID"** (numeric)
3. Copy the number

### Step 3: Run PostHog Fix
```sql
UPDATE integration_accounts
SET auth_json = jsonb_build_object(
    'api_key', 'phx_VORtsKCqbDi396CfCCNd2HYUER3v6NMs9d0gAxEx4IxLdxT',
    'project_id', '12345'  -- ← REPLACE WITH YOUR NUMBER
  )
WHERE service = 'posthog'
  AND workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c';
```

**Expected Result:**
- ✅ PostHog: UP

---

### Step 4: Get RevenueCat Project ID
1. Visit https://app.revenuecat.com/settings/projects
2. Copy your **Project ID** (e.g., `proj_abc123`)
3. Run RevenueCat fix from SQL file

### Step 5: Run RevenueCat Fix
```sql
UPDATE integration_accounts
SET 
  auth_json = jsonb_build_object(
    'api_key', 'sk_YxBEBltFjXgAUTiOMzmHgyjEqyZpX',
    'project_id', 'proj_YOUR_ID',  -- ← REPLACE WITH YOUR PROJECT ID
    'sdk_key_app_store', 'appl_vFRuKNRSMlJOSINeBHtjivpcZNs',
    'sdk_key_test', 'test_KsnKaXlsDwOXbyRyCrQZjHcQDhv',
    'sdk_key_web', 'rcb_ElSyxfqivpMlrxCyzywWaeOsylYh',
    'sandbox_key', 'rcb_sb_gKGRFCryyvnqkLjRCXp4xcPB'
  ),
  is_active = true,
  updated_at = now()
WHERE service = 'revenuecat'
  AND workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c';
```

**Expected Result:**
- ✅ RevenueCat: UP

---

## Final Dashboard Status (After All Fixes)

| Service | Status | Notes |
|---------|--------|-------|
| Stripe | 🟢 UP | Already working |
| Supabase | 🟢 UP | Already working |
| **PostHog** | **🟢 UP** | After adding numeric project_id |
| Resend | 🟢 UP | Already working |
| Twilio | 🟢 UP | Already working |
| **OpenAI** | **🟢 UP** | After SQL fix |
| **Meta** | **🟢 UP** | After SQL fix |
| **RevenueCat** | **🟢 UP** | After adding project_id |
| **Superwall** | **🟢 UP** | After SQL fix |
| Apple | ⚪ INACTIVE | Correctly disabled |
| Google | ⚪ INACTIVE | Correctly disabled |
| mobile_app | ⚪ INACTIVE | Correctly disabled |

---

## Verification Query

After running all fixes, verify with:

```sql
SELECT 
  service,
  is_active,
  CASE 
    WHEN auth_json->>'api_key' IS NOT NULL THEN '✅ API Key'
    WHEN auth_json->>'service_role_key' IS NOT NULL THEN '✅ Service Key'
    WHEN auth_json->>'access_token' IS NOT NULL THEN '✅ Token'
    ELSE '❌ Missing'
  END as credentials,
  CASE
    WHEN is_active = true THEN '🟢 ACTIVE'
    ELSE '⚪ INACTIVE'
  END as status
FROM integration_accounts
WHERE workspace_id = 'b948da70-72f7-427b-9f68-0ee55dadb37c'
ORDER BY is_active DESC, service;
```

---

## Summary

**Problems**: 4 services DOWN/DEGRADED due to configuration issues
**Solutions**: 
- ✅ 2 can be fixed immediately (OpenAI, Superwall, Meta)
- ⚠️ 2 need external IDs from dashboards (PostHog, RevenueCat)

**Time Required**: 
- Immediate fixes: 2 minutes
- Full fix (with ID lookup): 5-10 minutes

**File to Run**: `fix-health-check-errors.sql`

---

**Last Updated**: November 10, 2025, 5:55 PM EST
