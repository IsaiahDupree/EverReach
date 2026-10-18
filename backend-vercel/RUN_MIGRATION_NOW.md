# Run Personal Profile Migration - Quick Guide

## Step 1: Run Migration (via SQL Editor)

1. **Open migration file**: `backend-vercel/migrations/personal-profile-api.sql`
2. **Copy all contents** (169 lines)
3. **Go to**: https://supabase.com/dashboard/project/bvhqolnytimehzpwdiqd/sql/new
4. **Paste** the SQL
5. **Click "Run"**

**Expected output**: Several NOTICE messages (these are safe - they mean "already exists, skipping"):
- `relation "compose_settings" already exists, skipping` (if already run before)
- `column "display_name" of relation "profiles" already exists, skipping` (if already run before)

**Final rows**: Should show count from compose_settings and persona_notes tables.

---

## Step 2: Verify Schema (via SQL Editor)

1. **Open verification file**: `backend-vercel/scripts/verify-personal-profile.sql`
2. **Copy all contents**
3. **Go to**: https://supabase.com/dashboard/project/bvhqolnytimehzpwdiqd/sql/new
4. **Paste** the SQL
5. **Click "Run"**

**Expected output**: Multiple rows showing:
- ✅ `table:compose_settings` → ok: true
- ✅ `table:persona_notes` → ok: true  
- ✅ `column:profiles.display_name` → ok: true
- ✅ `column:profiles.preferences` → ok: true
- ✅ `rls:compose_settings` → ok: true
- ✅ `rls:persona_notes` → ok: true
- ✅ Policy names listed for both tables
- ✅ All 5 indexes present

**If any show ok: false**, the migration didn't run correctly.

---

## Step 3: Run Smoke Tests (PowerShell)

### Option A: Unauthenticated test only
```powershell
cd backend-vercel
$env:API_BASE = "https://ever-reach-be.vercel.app"
node test/profile-smoke.mjs
```

**Expected**: `✅ Unauthenticated GET /v1/me returns 401`

### Option B: Full authenticated tests

First, get a test JWT:
```powershell
.\get-test-token.ps1
# Copy the JWT from output
```

Then run tests:
```powershell
$env:API_BASE = "https://ever-reach-be.vercel.app"
$env:TEST_JWT = "eyJhbGc..." # Paste your JWT here
node test/profile-smoke.mjs
```

**Expected output**:
```
✅ Unauthenticated GET /v1/me returns 401
✅ GET /v1/me returns profile with preferences
✅ GET /v1/me/compose-settings returns settings
✅ POST/GET persona-notes works

All smoke tests passed.
```

---

## Troubleshooting

### Migration fails with "already exists"
- **This is OK!** The migration is idempotent. NOTICE messages are informational.
- Only ERROR messages are problems.

### Verification shows ok: false
- Re-run the migration SQL
- Check for ERROR messages in migration output

### Smoke tests fail with 500 errors
- Check verification - likely missing tables/columns
- Check API logs in Vercel dashboard

### Smoke tests fail with 401 (when authenticated)
- JWT expired - get a new one with `.\get-test-token.ps1`
- Wrong API_BASE - verify it's `https://ever-reach-be.vercel.app`

---

## Summary

1. ✅ Paste migration SQL → Run in SQL Editor
2. ✅ Paste verification SQL → Run in SQL Editor → Check all ok: true
3. ✅ Run `node test/profile-smoke.mjs` → All tests pass

**Total time**: ~2 minutes

---

## Files Referenced

- Migration: `backend-vercel/migrations/personal-profile-api.sql`
- Verification: `backend-vercel/scripts/verify-personal-profile.sql`
- Smoke tests: `backend-vercel/test/profile-smoke.mjs`
- Get JWT: `backend-vercel/get-test-token.ps1`
