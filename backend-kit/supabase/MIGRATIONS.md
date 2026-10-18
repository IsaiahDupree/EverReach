# Supabase Migrations Guide

Complete documentation for all database migrations in the EverReach Backend Starter Kit.

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Migration Inventory](#migration-inventory)
4. [Run Order](#run-order)
5. [How to Apply Migrations](#how-to-apply-migrations)
6. [Rollback Strategy](#rollback-strategy)
7. [Version Control & Naming](#version-control--naming)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Related Documentation](#related-documentation)

---

## Overview

The EverReach Backend Starter Kit uses Supabase as its database platform. This document tracks all database migrations, their purpose, and the order in which they must be applied.

**Current Migration Status:**
- Total Migrations: 1
- Initial Schema: `schema.sql`
- Migration Type: Single monolithic schema
- Status: Production ready

**Purpose:**
This guide ensures that:
- All database changes are tracked and documented
- Migrations can be applied in the correct order
- Team members understand what each migration does
- Rollback procedures are clear

---

## Migration Strategy

### Approach: Monolithic Initial Schema

The starter kit uses a **single monolithic schema file** for the initial database setup rather than incremental migrations. This approach is ideal for:

- ✅ New projects starting from scratch
- ✅ Consistent baseline across all environments
- ✅ Simplified initial setup
- ✅ Clear understanding of complete schema

### When to Use Incremental Migrations

As your project evolves, you should switch to incremental migrations for:
- Adding new tables
- Modifying existing columns
- Adding indexes
- Updating constraints
- Changing RLS policies

### Migration Tools

**Supabase CLI (Recommended for Production):**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize migrations
supabase init

# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Check migration status
supabase migration list
```

**SQL Editor (Development/Quick Testing):**
- Access via Supabase Dashboard → SQL Editor
- Good for: Quick changes, testing, development
- Not recommended for: Production, team collaboration

---

## Migration Inventory

### Complete List of Migrations

| # | Name | File | Description | Status | Date |
|---|------|------|-------------|--------|------|
| 1 | Initial Schema | `schema.sql` | Creates users, items, subscriptions tables with RLS | ✅ Applied | Current |

---

## Run Order

### Step-by-Step Migration Sequence

#### Migration 1: Initial Schema (`schema.sql`)

**Purpose:** Set up the complete database foundation for the application.

**What it creates:**

1. **Extensions:**
   - `uuid-ossp` - For UUID generation

2. **Tables:**
   - `public.users` - User profiles extending Supabase Auth
   - `public.subscriptions` - Subscription/tier management
   - `public.items` - Generic CRUD entity (customize to your needs)

3. **Enums:**
   - `subscription_tier` - Enum: free, basic, premium, enterprise
   - `subscription_status` - Enum: active, canceled, expired, trialing, incomplete

4. **Indexes:**
   - `idx_users_email` - User email lookup
   - `idx_users_created_at` - User creation date queries
   - `idx_subscriptions_user_id` - Subscription user lookup
   - `idx_subscriptions_stripe_customer` - Stripe customer lookup
   - `idx_subscriptions_status` - Subscription status filtering
   - `idx_subscriptions_tier` - Subscription tier filtering
   - `idx_items_user_id` - Items user lookup
   - `idx_items_status` - Items status filtering
   - `idx_items_created_at` - Items date queries
   - `idx_items_search` - Full-text search on title/description

5. **Functions:**
   - `handle_updated_at()` - Automatically updates updated_at timestamps
   - `has_subscription_tier()` - Check if user has required subscription tier
   - `handle_new_user()` - Creates profile and free subscription on signup

6. **Triggers:**
   - `users_updated_at` - Updates users.updated_at on changes
   - `subscriptions_updated_at` - Updates subscriptions.updated_at
   - `items_updated_at` - Updates items.updated_at
   - `on_auth_user_created` - Creates user profile when auth user signs up

7. **RLS Policies:**
   - Users can view/update/insert own profile
   - Users can view/insert own subscription
   - Service role can update subscriptions (for webhooks)
   - Users can CRUD own items

8. **Views:**
   - `user_profiles` - Combines users with subscription info

9. **Grants:**
   - Grants appropriate permissions to authenticated users

**Dependencies:** None (initial migration)

**Estimated Time:** 2-5 seconds

---

## How to Apply Migrations

### Method 1: Supabase SQL Editor (Quickstart)

**Best for:** Initial setup, development, testing

1. **Access SQL Editor:**
   - Go to your Supabase project dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Load schema.sql:**
   - Open `backend-kit/supabase/schema.sql` in your code editor
   - Copy the entire contents
   - Paste into the SQL Editor

3. **Execute:**
   - Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - Wait for "Success" message

4. **Verify:**
   - Go to "Table Editor"
   - Confirm you see: `users`, `subscriptions`, `items` tables

**Pros:**
- ✅ Simple, no CLI tools needed
- ✅ Visual feedback
- ✅ Works immediately

**Cons:**
- ❌ Manual process
- ❌ No version control integration
- ❌ Not suitable for automated deployments

---

### Method 2: Supabase CLI (Production)

**Best for:** Team projects, CI/CD, version control

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login:**
   ```bash
   supabase login
   ```

3. **Link project:**
   ```bash
   cd backend-kit
   supabase link --project-ref your-project-ref
   ```

4. **Initialize migrations:**
   ```bash
   supabase migration list
   ```

5. **Copy schema to migrations:**
   ```bash
   # Create initial migration
   supabase migration new initial_schema

   # Copy schema.sql content into the generated migration file
   cp supabase/schema.sql supabase/migrations/XXXXXX_initial_schema.sql
   ```

6. **Apply migration:**
   ```bash
   supabase db push
   ```

7. **Verify:**
   ```bash
   supabase db diff
   ```

**Pros:**
- ✅ Version controlled
- ✅ Automated
- ✅ Team collaboration
- ✅ Repeatable

**Cons:**
- ❌ Requires CLI setup
- ❌ More complex initially

---

### Method 3: Automated Deployment (CI/CD)

**Best for:** Production deployments, automated workflows

Example GitHub Actions workflow:

```yaml
name: Deploy Database Migrations

on:
  push:
    branches: [main]
    paths:
      - 'backend-kit/supabase/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Run migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          cd backend-kit
          supabase link --project-ref $SUPABASE_PROJECT_ID
          supabase db push
```

---

## Rollback Strategy

### Understanding Rollback Limitations

**Important:** The initial `schema.sql` creates the entire database structure. Rolling it back means **dropping all tables and losing all data**.

### Rollback Scenarios

#### Scenario 1: Schema Applied Incorrectly

If you applied the schema and need to start over:

```sql
-- WARNING: This deletes ALL data!
-- Run in Supabase SQL Editor

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS items_updated_at ON public.items;

-- Drop views
DROP VIEW IF EXISTS public.user_profiles;

-- Drop tables (cascade will remove dependent objects)
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.has_subscription_tier(subscription_tier);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop enums
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;

-- Drop extension (optional)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
```

After running this, you can reapply `schema.sql` from scratch.

---

#### Scenario 2: Future Incremental Migration Rollback

For future incremental migrations, create explicit "down" migrations:

**Example: Adding a column**

**Up migration** (`20250120120000_add_phone_to_users.sql`):
```sql
ALTER TABLE public.users ADD COLUMN phone_number TEXT;
```

**Down migration** (`20250120120000_add_phone_to_users_down.sql`):
```sql
ALTER TABLE public.users DROP COLUMN phone_number;
```

### Rollback Best Practices

1. **Backup First:**
   ```bash
   # Using Supabase CLI
   supabase db dump -f backup.sql
   ```

2. **Test Rollback in Staging:**
   - Never rollback production first
   - Verify rollback on staging/dev environment

3. **Document Rollback Steps:**
   - Include rollback SQL in migration comments
   - Test rollback procedure before applying migration

4. **Consider Data Loss:**
   - Dropping columns = permanent data loss
   - Dropping tables = permanent data loss
   - Plan data migrations carefully

---

## Version Control & Naming

### Migration Naming Convention

When you add new migrations, follow this pattern:

```
<timestamp>_<descriptive_name>.sql
```

**Examples:**
- `20250120150000_add_comments_table.sql`
- `20250121100000_add_user_preferences.sql`
- `20250122083000_update_rls_policies.sql`

### Timestamp Format

Use UTC timestamp: `YYYYMMDDHHmmss`

**Why timestamps?**
- Ensures chronological order
- Prevents naming conflicts
- Clear version history

### Generating Timestamps

```bash
# Mac/Linux
date -u +"%Y%m%d%H%M%S"

# Or use Supabase CLI (automatic)
supabase migration new your_migration_name
```

### Git Workflow

1. **Create branch:**
   ```bash
   git checkout -b migration/add-comments-table
   ```

2. **Create migration:**
   ```bash
   supabase migration new add_comments_table
   ```

3. **Write migration SQL**

4. **Test migration:**
   ```bash
   supabase db reset  # Reset to clean state
   supabase db push   # Apply all migrations
   ```

5. **Commit:**
   ```bash
   git add supabase/migrations/
   git commit -m "Add comments table migration"
   ```

6. **Document in this file:**
   - Update [Migration Inventory](#migration-inventory)
   - Add to [Run Order](#run-order)
   - Describe changes

---

## Best Practices

### 1. Always Create Idempotent Migrations

Use `IF EXISTS` / `IF NOT EXISTS`:

```sql
-- Good
CREATE TABLE IF NOT EXISTS public.comments (...);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Bad (fails if already exists)
CREATE TABLE public.comments (...);
ALTER TABLE public.users ADD COLUMN phone TEXT;
```

### 2. Never Modify Existing Migrations

Once a migration is applied:
- ✅ Create a new migration to fix issues
- ❌ Don't edit the original migration file

### 3. Test Migrations Before Production

```bash
# Test on local/dev environment
supabase db reset && supabase db push

# Test rollback
# (run your down migration)

# Test re-apply
supabase db push
```

### 4. Include Comments

```sql
-- Migration: Add phone number to users
-- Date: 2025-01-20
-- Author: Your Name
-- Purpose: Support phone-based notifications

ALTER TABLE public.users
ADD COLUMN phone_number TEXT;
```

### 5. Keep Migrations Small

- One logical change per migration
- Easier to rollback
- Easier to understand
- Less risk

### 6. Version Control Everything

```bash
# Always commit migrations
git add supabase/migrations/
git commit -m "Migration: [description]"
```

### 7. Document Breaking Changes

If a migration might break existing code:

```sql
-- WARNING: BREAKING CHANGE
-- This migration renames 'items' to 'tasks'
-- Update all API routes and frontend code before deploying

ALTER TABLE public.items RENAME TO tasks;
```

### 8. Use Transactions

Wrap related changes in transactions:

```sql
BEGIN;

CREATE TABLE public.comments (...);
ALTER TABLE public.items ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Rollback on any error
COMMIT;
```

### 9. Backup Before Destructive Changes

Before dropping columns/tables:

```bash
# Create backup
supabase db dump -f backup_before_drop_column.sql

# Apply migration
supabase db push
```

### 10. Test RLS Policies

After migration, verify RLS:

```sql
-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid';

SELECT * FROM your_table;  -- Should only see user's data
```

---

## Troubleshooting

### Common Issues

#### 1. Migration Fails: "relation already exists"

**Cause:** Migration was partially applied or run twice.

**Solution:**
```sql
-- Check what exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.your_table (...);
```

---

#### 2. Migration Fails: "permission denied"

**Cause:** Insufficient permissions.

**Solution:**
```bash
# Ensure you're using service role key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Or verify CLI is logged in
supabase login
```

---

#### 3. Migration Fails: "syntax error"

**Cause:** SQL syntax issue.

**Solution:**
- Test SQL in Supabase SQL Editor first
- Check for missing semicolons
- Verify Postgres syntax (not MySQL/SQLite)

---

#### 4. RLS Policy Blocks Migration

**Cause:** RLS preventing updates.

**Solution:**
```sql
-- Disable RLS temporarily (for migration only)
ALTER TABLE public.your_table DISABLE ROW LEVEL SECURITY;

-- Run your migration
-- ...

-- Re-enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
```

---

#### 5. Migration Successful But Changes Not Visible

**Cause:** Cache or connection pooling.

**Solution:**
```bash
# Refresh Supabase dashboard
# Or run query to verify
SELECT * FROM public.your_table LIMIT 1;

# Clear local cache
supabase db reset
```

---

#### 6. Trigger Not Firing After Migration

**Cause:** Trigger dropped or syntax error.

**Solution:**
```sql
-- Check existing triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Recreate trigger
DROP TRIGGER IF EXISTS your_trigger ON your_table;
CREATE TRIGGER your_trigger ...
```

---

#### 7. Can't Connect to Database

**Cause:** Wrong connection string or project paused.

**Solution:**
- Check Project Status in Supabase Dashboard
- Verify connection string in `.env`
- Ensure project is not paused (free tier limitation)

---

#### 8. Enum Type Conflict

**Cause:** Trying to create enum that already exists.

**Solution:**
```sql
-- Check existing enums
SELECT typname FROM pg_type WHERE typtype = 'e';

-- Use DO block for conditional creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'your_enum') THEN
    CREATE TYPE your_enum AS ENUM ('value1', 'value2');
  END IF;
END $$;
```

---

## Related Documentation

### Internal Documentation

- **[DATABASE_SETUP.md](../docs/DATABASE_SETUP.md)** - Complete database setup guide
- **[API_REFERENCE.md](../docs/API_REFERENCE.md)** - API endpoints documentation
- **[README.md](../README.md)** - Backend starter kit overview

### External Resources

- **[Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)** - Official migration documentation
- **[Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)** - Row Level Security guide
- **[PostgreSQL Documentation](https://www.postgresql.org/docs/)** - Database reference

---

## Summary

This guide documents the complete migration history for the EverReach Backend Starter Kit. As your project evolves:

1. ✅ Create new migrations for schema changes
2. ✅ Update this document with each migration
3. ✅ Test migrations before production
4. ✅ Always use version control
5. ✅ Document rollback procedures

**Current Status:** Initial schema applied and documented. Ready for incremental migrations as needed.

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or consult the [DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) guide.
