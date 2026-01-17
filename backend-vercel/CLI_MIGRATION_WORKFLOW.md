# CLI-Based Migration Workflow

## ✅ Solution Implemented

We now have a complete CLI-based workflow for migrations with verification.

## The Problem We Solved

- **Before**: Had to manually paste SQL into Supabase SQL Editor
- **After**: Fully automated CLI workflow with verification

## Files Created

1. **`supabase/migrations/20251026154500_fix_persona_notes_column.sql`**
   - Idempotent repair migration
   - Adds missing `linked_contacts` column
   - Creates missing GIN index
   - Includes self-verification

2. **`scripts/migrate-and-verify.ps1`**
   - Automated migration push
   - Shows pending migrations
   - Runs verification checks
   - Reports success/failure

## How to Use (Future Migrations)

### 1. Create a New Migration

```powershell
# Create timestamped migration file
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
New-Item "supabase\migrations\${timestamp}_your_feature_name.sql"
```

### 2. Write Idempotent SQL

Always use:
- `CREATE TABLE IF NOT EXISTS`
- `ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DO $$ BEGIN ... IF NOT EXISTS ... END $$;` for complex checks

Example:
```sql
-- Add new column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'new_field'
    ) THEN
        ALTER TABLE contacts ADD COLUMN new_field TEXT;
        RAISE NOTICE 'Added new_field column';
    ELSE
        RAISE NOTICE 'Column already exists';
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_contacts_new_field 
ON contacts(new_field);
```

### 3. Run Migration with Verification

```powershell
cd backend-vercel
.\scripts\migrate-and-verify.ps1
```

This will:
1. Show pending migrations
2. Push to Supabase
3. Verify schema elements exist
4. Report success/failure

### 4. Check Migration History

```powershell
# See what's been applied
supabase migration list

# See pending migrations
supabase db push --dry-run -p "everreach123!@#"
```

## What We Fixed Today

### Initial Problem
- `persona_notes` table created WITHOUT `linked_contacts` column
- Migration kept failing on index creation
- Couldn't verify schema state

### Solution Applied
1. Created repair migration (`20251026154500_fix_persona_notes_column.sql`)
2. Migration adds column if missing (idempotent)
3. Creates index if missing (idempotent)
4. Includes self-verification in SQL

### Result
```
✅ Migration successful: Column and index are present
```

## Verification Methods

### Method 1: During Migration (Automatic)
The migration SQL includes verification:
```sql
DO $$
BEGIN
    IF col_exists AND idx_exists THEN
        RAISE NOTICE '✅ Migration successful';
    ELSE
        RAISE EXCEPTION 'Migration failed';
    END IF;
END $$;
```

### Method 2: Manual Check via CLI
```powershell
# Check specific table
supabase db execute --sql "SELECT * FROM information_schema.tables WHERE table_name='persona_notes';"

# Check specific column
supabase db execute --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='persona_notes';"

# Check indexes
supabase db execute --sql "SELECT indexname FROM pg_indexes WHERE tablename='persona_notes';"
```

### Method 3: Smoke Tests
```powershell
$env:API_BASE = "https://ever-reach-be.vercel.app"
node test/profile-smoke.mjs
```

## Best Practices

### ✅ DO
- Always make migrations idempotent
- Include verification in the migration SQL
- Test migrations locally first (if using local Supabase)
- Use descriptive migration names with timestamps
- Add comments explaining what the migration does

### ❌ DON'T
- Don't create migrations that fail if run twice
- Don't use `DROP` without `IF EXISTS`
- Don't assume clean state
- Don't skip verification
- Don't delete old migrations (breaks history)

## Troubleshooting

### Migration Fails
```powershell
# See detailed error
supabase db push --debug -p "everreach123!@#"

# Check current schema state
supabase db execute --sql "SELECT * FROM information_schema.tables WHERE table_schema='public';"
```

### Need to Rollback
Create a new migration that reverses changes:
```sql
-- Example rollback
ALTER TABLE contacts DROP COLUMN IF EXISTS new_field;
DROP INDEX IF EXISTS idx_contacts_new_field;
```

### Schema Out of Sync
```powershell
# Pull current schema from remote
supabase db pull

# Compare with local
supabase db diff
```

## Complete Workflow Example

```powershell
# 1. Create migration
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
New-Item "supabase\migrations\${timestamp}_add_social_links.sql"

# 2. Write SQL (in editor)
# ... add idempotent SQL ...

# 3. Run migration
.\scripts\migrate-and-verify.ps1

# 4. Verify with smoke tests
$env:API_BASE = "https://ever-reach-be.vercel.app"
node test/profile-smoke.mjs

# 5. Commit
git add supabase/migrations/${timestamp}_add_social_links.sql
git commit -m "feat: add social links to contacts"
```

## Environment Variables

Required for CLI:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
```

Database password (for push):
```
everreach123!@#
```

## Summary

✅ **No more manual SQL pasting**
✅ **Fully automated via CLI**
✅ **Built-in verification**
✅ **Idempotent migrations**
✅ **Clear error reporting**
✅ **Repeatable workflow**

The migration system is now production-ready and maintainable! 🚀
