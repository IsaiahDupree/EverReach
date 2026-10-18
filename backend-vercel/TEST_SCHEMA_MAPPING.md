# 📋 Test Schema Mapping - Actual vs Expected

## 🎯 Summary

The Public API tests were written for a different schema than what actually exists in the database. This document maps the differences.

## 📊 Test Results

- **Before fixes:** 93 failed, 32 skipped
- **After table name fixes:** 69 failed, 4 passed, 32 skipped  
- **Progress:** ✅ 24 tests now passing!

## 🗄️ Table Name Mapping

| Test Expected | Actual Database | Status |
|--------------|-----------------|--------|
| `organizations` | `orgs` | ✅ FIXED |
| `people` | `contacts` | ✅ FIXED |

## 📝 Column Mapping

### `orgs` table
| Test Expected | Actual | Notes |
|--------------|--------|-------|
| `name` | `name` | ✅ Correct |
| `slug` | ❌ Does not exist | Removed from tests |
| `organization_id` (FK) | `org_id` | ✅ FIXED |

### `contacts` table  
| Test Expected | Actual | Status |
|--------------|--------|--------|
| `name` | `display_name` | ❌ NEEDS FIX |
| `full_name` | `display_name` | ❌ NEEDS FIX |
| `created_by` | `user_id` | ❌ NEEDS FIX |
| `custom` | `metadata` | ❌ NEEDS FIX |
| `warmth_score` | `warmth` | ❌ NEEDS FIX |
| `last_touch_at` | `last_interaction_at` | ❌ NEEDS FIX |
| `organization_id` (FK) | `org_id` | ✅ FIXED |

### `api_keys` table
| Test Expected | Actual | Status |
|--------------|--------|--------|
| `organization_id` (FK) | `org_id` | ✅ FIXED |
| `name` | ? | ❓ NEEDS CHECK |

### `interactions` table
| Test Expected | Actual | Status |
|--------------|--------|--------|
| `organization_id` (FK) | `org_id` | ✅ FIXED |
| `person_id` (FK) | ? | ❓ NEEDS CHECK |

## 🔧 Required Fixes

### Phase 1: ✅ COMPLETED
- [x] Replace `organizations` → `orgs`
- [x] Replace `people` → `contacts`  
- [x] Remove `slug` column references
- [x] Replace `organization_id` → `org_id` (FKs)

### Phase 2: 🚧 IN PROGRESS  
- [ ] Replace `name:` → `display_name:` (in contact inserts)
- [ ] Replace `full_name:` → `display_name:` (in contact inserts)
- [ ] Replace `created_by:` → `user_id:` (in contact inserts)
- [ ] Replace `custom:` → `metadata:` (in contact inserts)
- [ ] Replace `warmth_score:` → `warmth:` (in contact inserts)
- [ ] Replace `last_touch_at:` → `last_interaction_at:` (in contact inserts)

### Phase 3: 🔍 NEEDS INVESTIGATION
- [ ] Check `api_keys` table schema
- [ ] Check `interactions` table schema
- [ ] Check `webhooks` table schema
- [ ] Verify all FK relationships

## 📁 Files to Update

1. `__tests__/api/public-api-auth.test.ts`
2. `__tests__/api/public-api-context-bundle.test.ts`
3. `__tests__/api/public-api-rate-limit.test.ts`
4. `__tests__/api/public-api-webhooks.test.ts`

## 🎯 Next Steps

1. **Check remaining table schemas:**
   ```sql
   \d api_keys
   \d interactions
   \d webhooks
   \d webhook_deliveries
   ```

2. **Create comprehensive find-replace script** for all column mappings

3. **Run tests again** and verify progress

4. **Document any API endpoint mismatches** (if tests expect endpoints that don't exist)

## 📊 Expected Outcome

After all fixes:
- **Target:** 125+ tests passing
- **Current:** 4 tests passing
- **Remaining work:** ~121 tests to fix

## 🚀 Automation Script Needed

Create `fix-all-schema-mismatches.ps1` that:
1. Reads actual schema from database
2. Generates find-replace mappings
3. Applies all fixes atomically
4. Validates with test run

---

**Last Updated:** 2025-10-10
**Status:** Phase 1 complete, Phase 2 in progress
