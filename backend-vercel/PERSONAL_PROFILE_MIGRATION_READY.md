# Personal Profile API - Migration Ready ✅

## Status: Schema Reviewed & Fixed

All migration files have been reviewed and fixed for idempotency:

### ✅ Fixed Issues
- **Table names**: Changed `user_profiles` → `profiles` throughout
- **Indexes**: Added `IF NOT EXISTS` to all index creations
- **Policies**: Added `DROP POLICY IF EXISTS` before creating RLS policies  
- **Triggers**: Added `DROP TRIGGER IF EXISTS` before creating triggers
- **Syntax**: Fixed standalone `RAISE NOTICE` in rollback file

### 📋 Migration Files Ready

1. **Personal Profile API** (`migrations/personal-profile-api.sql`)
   - ✅ `compose_settings` table (AI composition preferences)
   - ✅ `persona_notes` table (voice memos, screenshots, notes)
   - ✅ `profiles` table updates (`display_name`, `preferences`)
   - ✅ Helper functions (`get_or_create_compose_settings`, `search_persona_notes`)
   - ✅ RLS policies for security
   - ✅ Indexes for performance

2. **Fixed Supporting Migrations**
   - ✅ `20251014001539_ai_goal_inference.sql` - Table names corrected
   - ✅ `20251014025000_fix_interactions_occurred_at_rollback.sql` - Syntax fixed

## How to Run Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/bvhqolnytimehzpwdiqd
2. Navigate to **SQL Editor**
3. Copy contents of `backend-vercel/migrations/personal-profile-api.sql`
4. Paste and click **Run**

### Option 2: Direct psql Connection
```powershell
# From backend-vercel directory
$env:PGPASSWORD = "everreach123!@#"
psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 -U postgres.bvhqolnytimehzpwdiqd -d postgres -f migrations/personal-profile-api.sql
```

### Option 3: Supabase CLI (if linked properly)
```powershell
cd backend-vercel
supabase db push
```

## What Gets Created

### Tables

#### 1. `compose_settings`
```sql
- user_id (PK, UUID)
- default_tone (TEXT)
- default_length (TEXT)
- signature (TEXT)
- brand_voice (JSONB)
- email_settings (JSONB)
- sms_settings (JSONB)
- created_at, updated_at
```

**Purpose**: Store AI composition preferences per user

#### 2. `persona_notes`
```sql
- id (PK, UUID)
- user_id (FK → auth.users)
- type (text|voice|screenshot)
- title, body_text, transcription
- audio_url, image_url
- tags (TEXT[])
- linked_contacts (UUID[])
- created_at, updated_at
```

**Purpose**: Personal notes, voice memos, screenshots linked to contacts

#### 3. `profiles` (Updates)
```sql
+ display_name (TEXT)
+ preferences (JSONB)
```

**Purpose**: Enhanced user profile fields

### Helper Functions

1. **`get_or_create_compose_settings(user_id)`**
   - Returns compose settings for user
   - Creates default if doesn't exist

2. **`search_persona_notes(user_id, type, contact_id, tag, limit)`**
   - Search/filter persona notes
   - Supports filtering by type, contact, tag

### Security (RLS Policies)

- ✅ Users can only view/edit their own data
- ✅ Service role has full access (for cron jobs)
- ✅ All tables have RLS enabled

### Performance (Indexes)

- ✅ `idx_persona_notes_user` - User lookups
- ✅ `idx_persona_notes_type` - Type filtering
- ✅ `idx_persona_notes_tags` - GIN index for tag searches
- ✅ `idx_persona_notes_contacts` - GIN index for contact links
- ✅ `idx_persona_notes_created` - Chronological sorting

## API Endpoints Already Implemented ✅

### `/v1/me` (Profile)
- **GET** - Fetch user profile with display_name and preferences
- **PATCH** - Update display_name and preferences

### `/v1/me/compose-settings` (AI Composition)
- **GET** - Fetch compose settings (auto-creates if missing)
- **PATCH** - Update compose settings

### `/v1/me/persona-notes` (Notes)
- **GET** - List all persona notes (with filters)
- **POST** - Create new persona note

### `/v1/me/persona-notes/[id]` (Individual Note)
- **GET** - Fetch single note
- **PATCH** - Update note
- **DELETE** - Delete note

## Next Steps

1. **Run Migration** (choose Option 1, 2, or 3 above)
2. **Verify Tables** - Check Supabase dashboard for new tables
3. **Create E2E Tests** - Similar to existing tests in `web/test`
4. **Test Endpoints** - Verify all CRUD operations work

## Migration is Idempotent ✅

All SQL uses:
- `CREATE TABLE IF NOT EXISTS`
- `ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before policy creation
- `DROP TRIGGER IF EXISTS` before trigger creation
- `CREATE OR REPLACE FUNCTION`

**Safe to run multiple times!**

## Schema File Location

```
backend-vercel/migrations/personal-profile-api.sql
```

Total: 169 lines of carefully crafted SQL 🎯
