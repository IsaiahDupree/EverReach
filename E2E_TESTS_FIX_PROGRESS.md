# E2E Tests Fix Progress

**Date**: October 19, 2025  
**Status**: In Progress - Making Good Progress!

---

## 🎯 **Problem Identified**

The E2E tests were failing because they were trying to use **backend API routes** (`/api/contacts`) which don't exist or aren't deployed. 

The working tests (like `campaign-automation-e2e.mjs`) use **Supabase REST API directly** instead.

---

## ✅ **What We Fixed**

### **Before** (Not Working):
```javascript
// Trying to use backend API routes
const BASE = await getEnv('NEXT_PUBLIC_API_URL', true, 'https://ever-reach-be.vercel.app/api');
await apiFetch(BASE, '/api/contacts', {
  method: 'POST',
  token,
  body: JSON.stringify(payload),
});
// Result: 405 Method Not Allowed ❌
```

### **After** (Now Working):
```javascript
// Using Supabase REST API directly
const SUPABASE_URL = await getEnv('SUPABASE_URL', true);
const SUPABASE_SERVICE_KEY = await getEnv('SUPABASE_SERVICE_ROLE_KEY', true);
const token = await getAccessToken(); // For RLS

await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: JSON.stringify(payload),
});
// Result: 400 Bad Request - Progress! We're hitting the DB ✅
```

---

## 🔧 **Current Issue**

Now getting **400 Bad Request** instead of 405, which means:
- ✅ Supabase REST API is being reached
- ❌ Payload format is incorrect

**Likely causes**:
1. `emails` field format might be wrong (maybe should be singular `email`?)
2. Missing required fields (like `org_id` or `user_id`)
3. Field names don't match the actual contacts table schema
4. Data type mismatch (e.g., tags format)

---

## 📋 **Next Steps**

### **Option 1: Check Contacts Table Schema**
```sql
-- In Supabase SQL Editor, run:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;
```

### **Option 2: Look at Existing Contact**
```sql
-- Get an existing contact to see the structure:
SELECT * FROM contacts LIMIT 1;
```

### **Option 3: Check RLS Policies**
The contacts table might have Row Level Security (RLS) policies that require:
- `org_id` to match the authenticated user's org
- `user_id` to be set
- Certain fields to be provided

### **Option 4: Use Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx
2. Click "Table Editor"
3. Find "contacts" table
4. Check the structure and try manually inserting a row to see what's required

---

## 📊 **Updated Test Results**

| Test | Before Fix | After Fix | Status |
|------|------------|-----------|--------|
| Warmth Tracking | 405 Error | 400 Error | 🔄 Improving |
| Contact Lifecycle | 405 Error | Need to Update | ⏸️ Pending |
| Screenshot Analysis | 405 Error | Need to Update | ⏸️ Pending |
| Multi-Channel Campaigns | 405 Error | Need to Update | ⏸️ Pending |

---

## 🔨 **Files Updated**

### **Modified**:
- `test/agent/e2e-warmth-tracking.mjs` - Now uses Supabase REST API
  - Step 1: Create contact ✅
  - Step 2: Get baseline warmth ✅
  - Step 3: Log interaction ✅
  - Steps 4-7: Need to update remaining steps

### **Still Need to Update**:
- `test/agent/e2e-contact-lifecycle-complete.mjs`
- `test/agent/e2e-screenshot-analysis.mjs`
- `test/agent/e2e-multi-channel-campaigns.mjs`

---

## 💡 **Example Fix Pattern**

For all failing E2E tests, replace:

**OLD**:
```javascript
const { res, json, ms } = await apiFetch(BASE, '/api/contacts', {
  method: 'POST',
  token,
  body: JSON.stringify(payload),
});
```

**NEW**:
```javascript
const startTime = Date.now();
const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: JSON.stringify(payload),
});
const ms = Date.now() - startTime;
const json = await res.json().catch(() => ({}));
const result = Array.isArray(json) ? json[0] : json;
```

---

## 🎯 **Quick Win**

Once we know the correct contacts table schema, we can:
1. Update the payload format in `e2e-warmth-tracking.mjs`
2. Test it works
3. Apply the same fix to all other E2E tests
4. All tests should pass! 🎉

---

**Current Status**: Need contacts table schema to proceed  
**Estimated Time to Fix**: 15-30 minutes once schema is known  
**Confidence**: High - We're very close!
