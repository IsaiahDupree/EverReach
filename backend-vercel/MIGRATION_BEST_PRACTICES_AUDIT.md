# Migration Best Practices Audit & Improvements

## 🎯 Current State vs. Best Practices

### ✅ What We're Doing Right

1. **UUID Primary Keys** - Using `gen_random_uuid()` ✅
2. **Multi-tenancy** - All tables have `organization_id` ✅
3. **RLS Enabled** - Security policies in place ✅
4. **Timestamps** - Have `created_at` and `updated_at` ✅
5. **Foreign Keys** - Proper relationships with ON DELETE CASCADE ✅
6. **IF NOT EXISTS** - Non-destructive table creation ✅

### ❌ What Needs Improvement

#### 1. **Missing `updated_at` Triggers**
**Issue:** We have `updated_at` columns but no auto-update triggers

**Fix Needed:**
```sql
-- Create reusable trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

-- Apply to every table with updated_at
CREATE TRIGGER t_api_keys_touch
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER t_webhooks_touch
BEFORE UPDATE ON webhooks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ... etc for all tables
```

#### 2. **Missing Soft Deletes**
**Issue:** Hard deletes everywhere - no recovery possible

**Fix Needed:**
```sql
-- Add to critical tables (api_keys, webhooks, automation_rules)
ALTER TABLE api_keys ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE webhooks ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE automation_rules ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update RLS policies to hide soft-deleted rows
CREATE POLICY "hide deleted keys"
  ON api_keys FOR SELECT
  USING (deleted_at IS NULL);
```

#### 3. **Indexes Not Created CONCURRENTLY**
**Issue:** Will lock tables in production

**Fix Needed:**
```sql
-- Change all CREATE INDEX to:
CREATE INDEX CONCURRENTLY idx_api_keys_org 
ON api_keys (organization_id);

CREATE INDEX CONCURRENTLY idx_api_keys_hash 
ON api_keys (key_hash) 
WHERE revoked = false AND deleted_at IS NULL;
```

#### 4. **Missing Partial Indexes for Hot Queries**
**Issue:** Indexing inactive/deleted rows wastes space

**Fix Needed:**
```sql
-- Active-only indexes
CREATE INDEX CONCURRENTLY idx_api_keys_active
ON api_keys (organization_id, created_at DESC)
WHERE revoked = false AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_webhooks_enabled
ON webhooks (organization_id, url)
WHERE enabled = true AND deleted_at IS NULL;
```

#### 5. **RLS Policies Not Tenant-Scoped Properly**
**Issue:** Policies check user ownership, not tenant isolation

**Current (Weak):**
```sql
USING (organization_id IN (
  SELECT organization_id FROM people WHERE created_by = auth.uid() LIMIT 1
))
```

**Should Be (Strong):**
```sql
USING (
  organization_id = (auth.jwt() ->> 'organization_id')::uuid
  AND deleted_at IS NULL
)
```

#### 6. **Missing CHECK Constraints**
**Issue:** Data validation only in app code

**Fix Needed:**
```sql
-- API keys
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_name_not_empty 
  CHECK (length(trim(name)) > 0);

-- Webhooks
ALTER TABLE webhooks
  ADD CONSTRAINT webhooks_url_format
  CHECK (url ~* '^https?://');

ALTER TABLE webhooks
  ADD CONSTRAINT webhooks_has_events
  CHECK (array_length(events, 1) > 0);

-- Outbox
ALTER TABLE outbox
  ADD CONSTRAINT outbox_recipient_not_empty
  CHECK (length(trim(recipient)) > 0);
```

#### 7. **Missing Audit Trail Triggers**
**Issue:** No automatic audit logging

**Fix Needed:**
```sql
CREATE TABLE public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_trail (
    table_name, record_id, action, old_data, new_data, changed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
    auth.uid()
  );
  RETURN NEW;
END $$;

-- Apply to sensitive tables
CREATE TRIGGER t_api_keys_audit
AFTER INSERT OR UPDATE OR DELETE ON api_keys
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
```

#### 8. **Index Column Order Wrong**
**Issue:** Indexes don't match query patterns

**Current:**
```sql
CREATE INDEX idx_api_keys_active ON api_keys (organization_id, revoked);
```

**Should Be:**
```sql
-- Match WHERE org = X ORDER BY created_at DESC pattern
CREATE INDEX CONCURRENTLY idx_api_keys_by_org_date
ON api_keys (organization_id, created_at DESC)
WHERE revoked = false AND deleted_at IS NULL;
```

#### 9. **Missing TIMESTAMPTZ DEFAULT**
**Issue:** Some timestamps don't have defaults

**Fix:**
```sql
-- Ensure all timestamp columns have defaults
ALTER TABLE api_keys 
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE api_keys 
  ALTER COLUMN updated_at SET DEFAULT NOW();
```

#### 10. **Service Role Policies Too Broad**
**Issue:** E2E policies allow service role to do anything

**Current:**
```sql
CREATE POLICY "Service role can insert organizations"
ON organizations FOR INSERT TO service_role WITH CHECK (true);
```

**Should Be:**
```sql
-- Only allow test data with specific naming pattern
CREATE POLICY "Service role can insert test orgs"
ON organizations FOR INSERT TO service_role
WITH CHECK (
  name LIKE 'E2E Test Org%' OR 
  slug LIKE 'e2e-test-%'
);
```

---

## 🛠️ Migration Strategy

### Phase 1: Add Missing Infrastructure (Safe, Non-Blocking)

```sql
-- 1. Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

-- 2. Add soft delete columns (nullable, won't break existing queries)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Add audit trail table
CREATE TABLE IF NOT EXISTS public.audit_trail ( ... );
```

### Phase 2: Add Triggers (Safe, Auto-Applied)

```sql
-- Apply triggers to all tables
CREATE TRIGGER t_api_keys_touch
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER t_api_keys_audit
AFTER INSERT OR UPDATE OR DELETE ON api_keys
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
```

### Phase 3: Add Constraints (Two-Step with NOT VALID)

```sql
-- Step 1: Add constraint without validating
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_name_not_empty 
  CHECK (length(trim(name)) > 0) NOT VALID;

-- Step 2: Validate in separate transaction (can be canceled if too slow)
ALTER TABLE api_keys VALIDATE CONSTRAINT api_keys_name_not_empty;
```

### Phase 4: Improve Indexes (Concurrent, No Locks)

```sql
-- Create better indexes concurrently
CREATE INDEX CONCURRENTLY idx_api_keys_org_date
ON api_keys (organization_id, created_at DESC)
WHERE revoked = false AND deleted_at IS NULL;

-- Drop old indexes after new ones are built
DROP INDEX IF EXISTS idx_api_keys_org; -- old one
```

### Phase 5: Update RLS Policies (Atomic Swap)

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their org's API keys" ON api_keys;

-- Create new, tighter policies
CREATE POLICY "tenant_can_read_active_keys"
  ON api_keys FOR SELECT
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
    AND deleted_at IS NULL
  );
```

---

## 📋 Quick Wins Checklist

- [ ] Add `touch_updated_at()` trigger function
- [ ] Apply update triggers to all tables with `updated_at`
- [ ] Add `deleted_at` columns to api_keys, webhooks, automation_rules, outbox
- [ ] Update RLS policies to filter `deleted_at IS NULL`
- [ ] Add CHECK constraints for data validation
- [ ] Rebuild indexes with CONCURRENTLY
- [ ] Add partial indexes for hot queries
- [ ] Create audit_trail table + triggers
- [ ] Improve RLS to use JWT claims directly
- [ ] Add NOT NULL constraints where appropriate

---

## 🚀 Recommended Next Migration

Create: `public-api-improvements-v2.sql`

This will be a **forward-only, zero-downtime** migration that adds:
1. Soft deletes
2. Update triggers
3. Audit trail
4. Better constraints
5. Improved indexes (CONCURRENTLY)
6. Tighter RLS policies

**Want me to generate this migration now?**

