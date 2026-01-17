# Personal Profile Migration - Manual Completion Required

## Current Situation

✅ **Tables Created**: `compose_settings`, `persona_notes`  
⚠️ **Partial Schema**: Missing `linked_contacts` column on `persona_notes`  
❌ **Migration Blocked**: Can't auto-complete due to network/CLI limitations

## Quick Fix (2 minutes via SQL Editor)

### Step 1: Complete the Schema
Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

Paste and run:
```sql
-- Add missing column
ALTER TABLE persona_notes 
ADD COLUMN IF NOT EXISTS linked_contacts UUID[];

-- Create missing index
CREATE INDEX IF NOT EXISTS idx_persona_notes_contacts 
ON persona_notes USING GIN(linked_contacts);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'persona_notes'
ORDER BY ordinal_position;
```

Expected: Shows `linked_contacts` column with type `ARRAY`

### Step 2: Mark Migration as Complete
Still in SQL Editor, run:
```sql
-- Mark migration as applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20251026152352', 'personal_profile_api', ARRAY['-- Applied manually via SQL Editor'])
ON CONFLICT (version) DO NOTHING;

SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE version = '20251026152352';
```

Expected: Returns one row showing the migration is recorded

### Step 3: Verify Complete Schema
```sql
-- Check all expected tables/columns exist
SELECT 
    'compose_settings' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compose_settings') as exists
UNION ALL
SELECT 
    'persona_notes',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persona_notes')
UNION ALL
SELECT
    'persona_notes.linked_contacts',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persona_notes' AND column_name = 'linked_contacts')
UNION ALL
SELECT
    'profiles.display_name',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name')
UNION ALL
SELECT
    'profiles.preferences',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences');
```

Expected: All rows show `exists = true`

## Step 4: Test the API

From PowerShell in `backend-vercel`:
```powershell
# Test unauthenticated (should work)
$env:API_BASE = "https://ever-reach-be.vercel.app"
node test/profile-smoke.mjs
# Expect: ✅ Unauthenticated GET /v1/me returns 401
```

## Why Manual?

Network connectivity issues prevent automated execution:
- ❌ PowerShell can't resolve `bvhqolnytimehzpwdiqd.supabase.co`
- ❌ psql pooler auth fails ("Tenant or user not found")
- ❌ Supabase CLI `db execute` doesn't support piped SQL with credentials
- ✅ **SQL Editor works** (uses your session credentials)

## After Completion

Once the schema is fixed manually:
1. ✅ All tables will be complete
2. ✅ Migration will be recorded in history
3. ✅ API endpoints will work fully
4. ✅ CLI will recognize migration as applied

**Total time**: ~2 minutes in SQL Editor

---

## Alternative: Wait for Network Fix

If network/DNS resolves later, you can try:
```powershell
cd backend-vercel
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
supabase db push -p "everreach123!@#"
```

But for now, **SQL Editor is the fastest path** ✅
