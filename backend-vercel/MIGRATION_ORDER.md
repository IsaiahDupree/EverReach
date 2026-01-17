# 🚀 Database Migration Order & Best Practices

## 📋 Migration Execution Order

### **Phase 1: Base Schema (REQUIRED)**
```
File: supabase-future-schema.sql
Status: ⚠️ Run this FIRST
```

**Creates:**
- Core tables (organizations, users, people, interactions)
- Base RLS policies
- Essential indexes

**Run in Supabase SQL Editor:**
```
https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
```

---

### **Phase 2: Public API System (REQUIRED)**
```
File: backend-vercel/migrations/public-api-system.sql
Status: ✅ Fixed - ready to run
```

**Creates:**
- API infrastructure (api_keys, webhooks, outbox)
- Helper functions (verify_api_key, has_scope, emit_webhook_event)
- Base indexes and RLS

**Improvements Made:**
- ✅ Fixed `org_id` → `organization_id` (matches base schema)
- ✅ Fixed `contacts` → `people` (matches base schema)
- ✅ Moved inline INDEX definitions outside CREATE TABLE
- ✅ Fixed partial index syntax errors

**Run After:** Phase 1 completes successfully

---

### **Phase 3: Best Practices Improvements (RECOMMENDED)**
```
File: backend-vercel/migrations/public-api-improvements.sql
Status: ✅ Production-ready patterns
```

**Adds:**
- ✅ Soft deletes (`deleted_at` columns) - recovery + auditability
- ✅ Auto-update triggers (`touch_updated_at()`) - no manual timestamps
- ✅ Audit trail (`audit_trail` table) - immutable change log
- ✅ Data validation (CHECK constraints) - defense in depth
- ✅ Better indexes (CONCURRENTLY, partial) - faster, zero-downtime
- ✅ Tighter RLS (tenant-scoped, soft-delete aware) - secure by default

**Run After:** Phase 2 completes successfully

---

### **Phase 4: E2E Test Policies (OPTIONAL)**
```
File: backend-vercel/migrations/enable-e2e-test-data.sql
Status: ✅ Fixed - ready for testing
```

**Creates:**
- Service role policies for E2E tests
- Allows test data creation

**Improvements Made:**
- ✅ Fixed `contacts` → `people` table references

**Run After:** Phase 3 completes (or Phase 2 if skipping improvements)

**Only run if:** You want to enable E2E tests

---

## 🎯 Complete Setup Workflow

### 1. Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql
```

### 2. Run Migrations in Order

**Migration 1: Base Schema**
```sql
-- Copy/paste: supabase-future-schema.sql
-- Wait for: Success message
-- ✅ Check: SELECT COUNT(*) FROM organizations; (should work)
```

**Migration 2: Public API System**
```sql
-- Copy/paste: backend-vercel/migrations/public-api-system.sql
-- Wait for: Success message
-- ✅ Check: SELECT COUNT(*) FROM api_keys; (should work)
```

**Migration 3: Best Practices (RECOMMENDED)**
```sql
-- Copy/paste: backend-vercel/migrations/public-api-improvements.sql
-- Wait for: Success message
-- ✅ Check: SELECT COUNT(*) FROM audit_trail; (should work)
```

**Migration 4: E2E Test Policies (if testing)**
```sql
-- Copy/paste: backend-vercel/migrations/enable-e2e-test-data.sql
-- Wait for: Success message
-- ✅ Test: Try creating a test organization
```

### 3. Verify Everything Works
```sql
-- Copy/paste: backend-vercel/scripts/verify-database.sql
-- Expected: All ✅ green checkmarks
```

### 4. Update Environment Variables
```bash
# In backend-vercel/.env
TEST_SKIP_E2E=false  # Enable E2E tests
```

### 5. Run E2E Tests
```bash
cd backend-vercel
npm run test:e2e:public-api
```

---

## 📊 What Gets Created

### Tables (13 total)

**From Base Schema (9):**
- organizations
- users
- organization_memberships
- people (contacts)
- interactions
- voice_notes
- relationship_scores
- tasks
- pipelines

**From Public API System (8):**
- api_keys
- api_rate_limits
- api_audit_logs
- webhooks
- webhook_deliveries
- automation_rules
- outbox
- segments

**From Improvements (1):**
- audit_trail

### Helper Functions (4)

1. `verify_api_key(key_hash)` → Returns organization_id, scopes, api_key_id
2. `has_scope(scopes[], required_scope)` → Boolean
3. `emit_webhook_event(org_id, event_type, payload)` → Void
4. `touch_updated_at()` → Trigger function
5. `audit_changes()` → Trigger function
6. `soft_delete(table_name, record_id)` → Boolean

### Indexes (40+)

- Tenant-scoped compound indexes
- Partial indexes for active/non-deleted rows
- Time-series indexes for audit queries
- Foreign key indexes
- Unique constraints

### RLS Policies (30+)

- Tenant isolation (organization-scoped)
- Soft-delete filtering (deleted_at IS NULL)
- Role-based access (future: admin vs member)
- Service role test data policies

---

## 🔒 Security Features

### 1. Row-Level Security (RLS)
- ✅ Enabled on all tables
- ✅ Default-deny (explicit USING clauses)
- ✅ Tenant isolation (can't see other org's data)
- ✅ Soft-delete filtering (can't see deleted rows)

### 2. Audit Trail
- ✅ Immutable change log
- ✅ Tracks INSERT/UPDATE/DELETE
- ✅ Stores old/new data snapshots
- ✅ Records actor (auth.uid())
- ✅ Tenant-scoped visibility

### 3. Data Validation
- ✅ CHECK constraints (not just app code)
- ✅ NOT NULL where required
- ✅ Foreign keys with ON DELETE CASCADE
- ✅ UNIQUE constraints

### 4. Soft Deletes
- ✅ Recovery possible
- ✅ Audit trail intact
- ✅ Hidden via RLS
- ✅ Can be purged later

---

## 🧪 Testing Checklist

After running all migrations:

- [ ] Verify base tables exist: `SELECT * FROM organizations LIMIT 1;`
- [ ] Verify API tables exist: `SELECT * FROM api_keys LIMIT 1;`
- [ ] Verify audit trail exists: `SELECT * FROM audit_trail LIMIT 1;`
- [ ] Verify helper functions: `SELECT verify_api_key('test');`
- [ ] Verify RLS enabled: Check pg_tables.rowsecurity
- [ ] Verify triggers working: Update a row, check updated_at
- [ ] Verify soft deletes: Set deleted_at, confirm hidden via SELECT
- [ ] Run verification script: `verify-database.sql`
- [ ] Run E2E tests: `npm run test:e2e:public-api`

---

## 📖 Documentation Created

1. **DATABASE_MIGRATIONS_CHECKLIST.md** - All schemas with verification tests
2. **MIGRATION_BEST_PRACTICES_AUDIT.md** - What's right/wrong, how to fix
3. **public-api-improvements.sql** - Production-ready enhancements
4. **verify-database.sql** - Automated verification script
5. **MIGRATION_ORDER.md** (this file) - Execution guide

---

## 🚦 Ready to Deploy?

✅ **YES** - Run migrations in order (1→2→3→4)

⚠️ **WAIT** - If you want to review changes first, read:
- MIGRATION_BEST_PRACTICES_AUDIT.md (what changed and why)
- public-api-improvements.sql (what gets added)

❌ **NO** - If base schema conflicts with existing data:
- Review supabase-future-schema.sql
- Check for existing tables
- Consider data migration strategy

---

## 🎉 After Successful Migration

Your database will have:
- ✅ Multi-tenant isolation
- ✅ Soft deletes (recovery)
- ✅ Audit trail (compliance)
- ✅ Auto-timestamps (DX)
- ✅ Data validation (integrity)
- ✅ Optimized indexes (speed)
- ✅ Tight RLS (security)
- ✅ E2E test support (quality)

**You're ready to build! 🚀**
