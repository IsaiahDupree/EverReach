# Migration Status: 006_social_channels

## Status: READY (Pending Manual Application)

The migration file `migrations/006_social_channels.sql` has been created and is ready to apply.

## Issue Discovered

The backend-vercel codebase references a `contacts` table, but the connected Supabase project (ivhfuhxorppptyuofbgq) uses `crm_contacts` instead.

## Two Options:

### Option 1: Apply to EverReach-specific Supabase project (recommended)
If EverReach has its own Supabase project separate from the shared ACTP one:
1. Switch `SUPABASE_URL` and keys to point to the EverReach project
2. Ensure the `contacts` table exists (may need base schema migration first)
3. Apply `006_social_channels.sql`

### Option 2: Adapt to use crm_contacts
Modify all backend code to use `crm_contacts` instead of `contacts`:
1. Update all API routes to query `crm_contacts`
2. Modify the migration to target `crm_contacts`
3. Apply the adapted migration

## Migration Contents

The migration creates:
- ✅ `social_channels` JSONB column on contacts table (object structure, not array)
- ✅ JSONB path indexes for instagram, twitter, linkedin, tiktok, facebook
- ✅ `social_sync_log` table with proper foreign keys and indexes
- ✅ Documentation comments

## Verification Steps (once applied)

```sql
-- Check contacts table has social_channels column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name = 'social_channels';

-- Check indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'contacts'
AND indexname LIKE 'idx_contacts_%_handle';

-- Check social_sync_log table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'social_sync_log'
);
```

## Date: 2026-03-15
