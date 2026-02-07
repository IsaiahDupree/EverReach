# Database Setup Guide

Complete guide to setting up Supabase database for the EverReach Backend Starter Kit.

---

## Table of Contents

1. [Overview](#overview)
2. [Creating a Supabase Project](#creating-a-supabase-project)
3. [Database Schema](#database-schema)
4. [Running Migrations](#running-migrations)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Environment Variables](#environment-variables)
7. [Edge Functions](#edge-functions)
8. [Customization](#customization)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The EverReach Backend Starter Kit uses Supabase as its database and authentication provider. This guide walks you through setting up your Supabase project, configuring the database schema, and connecting it to your backend API.

**What You'll Set Up:**
- PostgreSQL database with RLS enabled
- User authentication system
- Subscription management tables
- Generic CRUD entity (items)
- Database triggers and functions
- Row Level Security policies

**Time Required:** 15-30 minutes

---

## Creating a Supabase Project

### Step 1: Sign Up for Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Create an account using GitHub, Google, or email

### Step 2: Create a New Project

1. From the Supabase dashboard, click "New Project"
2. Fill in project details:
   - **Name:** Your app name (e.g., "my-app-production")
   - **Database Password:** Generate a strong password (save this securely!)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free tier is fine for development

3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

### Step 3: Get Your API Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon/public key:** `eyJ...` (for client-side)
   - **service_role key:** `eyJ...` (for backend admin operations)

⚠️ **Important:** Never expose your `service_role` key in client-side code or public repositories!

---

## Database Schema

The starter kit includes three main tables:

### Table Structure

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│    users     │──┬───│  subscriptions   │      │    items     │
└──────────────┘  │   └──────────────────┘      └──────────────┘
                  │                               ↑
                  └───────────────────────────────┘
```

### 1. users table

Extends Supabase Auth with profile information:

| Column       | Type         | Description              |
|--------------|--------------|--------------------------|
| `id`         | UUID         | Primary key, references auth.users |
| `email`      | TEXT         | User email (unique)      |
| `full_name`  | TEXT         | User's full name         |
| `avatar_url` | TEXT         | Profile picture URL      |
| `created_at` | TIMESTAMPTZ  | Account creation time    |
| `updated_at` | TIMESTAMPTZ  | Last update time         |

**RLS Policies:**
- Users can view own profile
- Users can update own profile
- Users can insert own profile

### 2. subscriptions table

Manages user subscription status:

| Column                   | Type                 | Description                    |
|--------------------------|----------------------|--------------------------------|
| `id`                     | UUID                 | Primary key                    |
| `user_id`                | UUID                 | References users.id            |
| `tier`                   | subscription_tier    | Enum: free, basic, premium, enterprise |
| `status`                 | subscription_status  | Enum: active, canceled, expired, trialing, incomplete |
| `stripe_customer_id`     | TEXT                 | Stripe customer ID (web)       |
| `stripe_subscription_id` | TEXT                 | Stripe subscription ID         |
| `revenuecat_subscriber_id` | TEXT               | RevenueCat subscriber ID (mobile) |
| `current_period_start`   | TIMESTAMPTZ          | Subscription period start      |
| `current_period_end`     | TIMESTAMPTZ          | Subscription period end        |
| `trial_end`              | TIMESTAMPTZ          | Trial period end               |
| `canceled_at`            | TIMESTAMPTZ          | Cancellation timestamp         |
| `metadata`               | JSONB                | Additional data                |
| `created_at`             | TIMESTAMPTZ          | Record creation time           |
| `updated_at`             | TIMESTAMPTZ          | Last update time               |

**RLS Policies:**
- Users can view own subscription
- Users can insert own subscription
- Service role can update subscriptions (for webhooks)

### 3. items table

Generic CRUD entity - **customize this to your needs**:

| Column        | Type         | Description              |
|---------------|--------------|--------------------------|
| `id`          | UUID         | Primary key              |
| `user_id`     | UUID         | References users.id      |
| `title`       | TEXT         | Item title               |
| `description` | TEXT         | Item description         |
| `status`      | TEXT         | Item status              |
| `metadata`    | JSONB        | Additional data          |
| `created_at`  | TIMESTAMPTZ  | Record creation time     |
| `updated_at`  | TIMESTAMPTZ  | Last update time         |

**RLS Policies:**
- Users can view own items
- Users can create own items
- Users can update own items
- Users can delete own items

---

## Running Migrations

### Step 1: Access SQL Editor

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"

### Step 2: Run the Schema Migration

1. Open the schema file at `supabase/schema.sql` in your project
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 3: Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see:
   - `users`
   - `subscriptions`
   - `items`

### Step 4: Check Indexes

Run this query to verify indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

You should see indexes for performance optimization:
- `idx_users_email`
- `idx_users_created_at`
- `idx_subscriptions_user_id`
- `idx_subscriptions_stripe_customer`
- `idx_items_user_id`
- `idx_items_status`
- `idx_items_search` (full-text search)

---

## Row Level Security (RLS)

### What is Row Level Security?

Row Level Security (RLS) is PostgreSQL's feature that restricts which rows users can access in database tables. It's **critical** for multi-tenant applications.

### RLS Policies in This Schema

#### Users Table Policies

1. **"Users can view own profile"**
   - Allows: `SELECT`
   - Condition: `auth.uid() = id`

2. **"Users can update own profile"**
   - Allows: `UPDATE`
   - Condition: `auth.uid() = id`

3. **"Users can insert own profile"**
   - Allows: `INSERT`
   - Condition: `auth.uid() = id`

#### Subscriptions Table Policies

1. **"Users can view own subscription"**
   - Allows: `SELECT`
   - Condition: `auth.uid() = user_id`

2. **"Users can insert own subscription"**
   - Allows: `INSERT`
   - Condition: `auth.uid() = user_id`

3. **"Service role can update subscriptions"**
   - Allows: `UPDATE`
   - Condition: Always true (requires service role key)
   - Used by: Webhook handlers

#### Items Table Policies

1. **"Users can view own items"** - `SELECT` with `auth.uid() = user_id`
2. **"Users can create own items"** - `INSERT` with `auth.uid() = user_id`
3. **"Users can update own items"** - `UPDATE` with `auth.uid() = user_id`
4. **"Users can delete own items"** - `DELETE` with `auth.uid() = user_id`

### Testing RLS Policies

```sql
-- Test as authenticated user
SELECT * FROM public.users WHERE id = auth.uid();

-- This should return only YOUR items
SELECT * FROM public.items;

-- This should fail (no permission to view other users' items)
SELECT * FROM public.items WHERE user_id != auth.uid();
```

---

## Environment Variables

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database (optional - for direct connections)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Where to Find These Values

1. **Project URL & Keys:**
   - Supabase Dashboard → Project Settings → API

2. **Database URL:**
   - Supabase Dashboard → Project Settings → Database
   - Look for "Connection string" under "Connection pooling"

### Connection String

The full connection string format:

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

⚠️ **Security Warning:**
- `NEXT_PUBLIC_*` variables are exposed to browsers
- `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed client-side
- Use service role key ONLY in backend API routes

---

## Edge Functions

Supabase Edge Functions are optional but useful for:
- Custom authentication logic
- Scheduled tasks (cron jobs)
- Database webhooks
- Complex business logic

### Setting Up Edge Functions (Optional)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Create a function:
   ```bash
   supabase functions new my-function
   ```

5. Deploy:
   ```bash
   supabase functions deploy my-function
   ```

For this starter kit, Edge Functions are **not required** - all logic runs in Next.js API routes.

---

## Customization

### Replacing the Items Table

The `items` table is a generic placeholder. Replace it with your actual entity:

#### Example: Replace items with "tasks"

1. **Update table name:**
   ```sql
   CREATE TABLE IF NOT EXISTS public.tasks (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

     -- Your custom fields
     title TEXT NOT NULL,
     description TEXT,
     due_date TIMESTAMPTZ,
     priority TEXT DEFAULT 'medium',
     completed BOOLEAN DEFAULT false,

     -- Keep these
     metadata JSONB DEFAULT '{}'::jsonb,
     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
   );
   ```

2. **Update RLS policies** (replace "items" with "tasks")

3. **Update backend code:**
   - Rename `types/item.ts` → `types/task.ts`
   - Rename `app/api/items/` → `app/api/tasks/`
   - Update references throughout the codebase

4. **Update frontend code:**
   - Update API calls
   - Update types
   - Update UI components

### Adding Custom Fields

To add fields to existing tables:

```sql
-- Add a custom field to users
ALTER TABLE public.users
ADD COLUMN phone_number TEXT;

-- Add a custom field to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN referral_code TEXT UNIQUE;
```

### Adding New Tables

```sql
-- Example: Add a comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view comments on their items"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = comments.item_id
      AND items.user_id = auth.uid()
    )
  );
```

---

## Security Best Practices

### 1. Always Enable RLS

```sql
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
```

Never skip this step! Without RLS, users can access all data.

### 2. Test Policies Thoroughly

```sql
-- Test as different users
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

SELECT * FROM public.items;
```

### 3. Use Service Role Sparingly

The `service_role` key bypasses all RLS policies. Only use it for:
- Webhook handlers (Stripe, RevenueCat)
- Admin operations
- Background jobs

Never expose it client-side!

### 4. Validate Input

Always validate data in your API routes before database operations:

```typescript
// In your API route
const schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const validated = schema.parse(req.body);
```

### 5. Use Prepared Statements

Supabase client automatically uses prepared statements, protecting against SQL injection.

### 6. Audit Tables Regularly

```sql
-- Check tables without RLS
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND NOT (tablename IN (
  SELECT tablename
  FROM pg_policies
));
```

---

## Triggers

The schema includes several triggers for automation:

### 1. Updated_at Trigger

Automatically updates the `updated_at` timestamp:

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

Applied to: `users`, `subscriptions`, `items`

### 2. New User Trigger

Automatically creates user profile and free subscription when someone signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This runs automatically when a user signs up via Supabase Auth.

---

## Troubleshooting

### Common Issues

#### 1. "relation 'public.users' does not exist"

**Cause:** Schema migration didn't run successfully.

**Solution:**
- Go to SQL Editor
- Run the entire `supabase/schema.sql` file
- Check for error messages

#### 2. "permission denied for table users"

**Cause:** RLS policies not properly configured.

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS if needed
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

#### 3. "new row violates row-level security policy"

**Cause:** Trying to insert data that doesn't match RLS policy.

**Solution:**
- Ensure `auth.uid()` matches `user_id` in your insert
- Check policy conditions match your data

#### 4. Service Role Key Not Working

**Cause:** Using wrong key or key not set in environment.

**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Get fresh key from Project Settings → API
- Restart your development server

#### 5. Trigger Not Firing

**Cause:** Trigger syntax error or not created properly.

**Solution:**
```sql
-- Check existing triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Recreate trigger if missing
DROP TRIGGER IF EXISTS trigger_name ON table_name;
-- Then run CREATE TRIGGER statement again
```

#### 6. Cannot Connect to Database

**Cause:** Wrong connection string or network issue.

**Solution:**
- Check Project Status in Supabase dashboard
- Verify connection string format
- Try direct connection vs pooler:
  - Direct: `db.xxxxx.supabase.co:5432`
  - Pooler: `aws-0-[region].pooler.supabase.com:5432`

#### 7. Subscription Tiers Enum Error

**Cause:** Enum types not created.

**Solution:**
```sql
-- Create enums if missing
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'trialing', 'incomplete');
```

---

## Next Steps

After setting up your database:

1. ✅ Configure environment variables in `.env.local`
2. ✅ Test database connection from your backend
3. ✅ Verify RLS policies work correctly
4. ✅ Customize the `items` table for your use case
5. ✅ Set up Stripe/RevenueCat webhooks
6. ✅ Deploy to production

**Related Documentation:**
- [API Reference](./API_REFERENCE.md) - Backend API endpoints
- [Authentication Guide](../../docs/05-AUTHENTICATION.md) - Auth setup
- [Payments Guide](../../docs/06-PAYMENTS.md) - Stripe & RevenueCat setup

---

## Support

Need help?
- 📚 [Supabase Documentation](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)
- 🐛 [GitHub Issues](https://github.com/IsaiahDupree/EverReach/issues)
