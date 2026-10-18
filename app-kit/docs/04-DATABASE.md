# Database Guide

## Supabase PostgreSQL Complete Reference

This guide covers the database schema, queries, migrations, and best practices.

---

## Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                           │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐                      │
│  │    users     │────<│   contacts   │                      │
│  │              │     │              │                      │
│  │ id (PK)      │     │ id (PK)      │                      │
│  │ email        │     │ user_id (FK) │                      │
│  │ full_name    │     │ name         │                      │
│  │ avatar_url   │     │ email        │                      │
│  │ created_at   │     │ phone        │                      │
│  └──────┬───────┘     │ warmth_score │                      │
│         │             └──────────────┘                      │
│         │                                                    │
│         │             ┌──────────────┐                      │
│         └────────────<│subscriptions │                      │
│                       │              │                      │
│                       │ id (PK)      │                      │
│                       │ user_id (FK) │                      │
│                       │ tier         │                      │
│                       │ status       │                      │
│                       │ provider     │                      │
│                       └──────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Tables

### Users Table

```sql
CREATE TABLE public.users (
  -- Primary key linked to Supabase Auth
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile information
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  
  -- Subscription (denormalized for quick access)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'expired')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON public.users(email);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Contacts Table

```sql
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  
  -- Relationship tracking
  warmth INTEGER DEFAULT 30 CHECK (warmth >= 0 AND warmth <= 100),
  warmth_band TEXT DEFAULT 'cool' CHECK (warmth_band IN ('hot', 'warm', 'neutral', 'cool', 'cold')),
  warmth_mode TEXT DEFAULT 'medium' CHECK (warmth_mode IN ('fast', 'medium', 'slow')),
  amplitude NUMERIC DEFAULT 0,
  warmth_anchor_score NUMERIC DEFAULT 30,
  warmth_anchor_at TIMESTAMPTZ DEFAULT NOW(),
  warmth_last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  relationship_type TEXT DEFAULT 'contact' CHECK (relationship_type IN ('contact', 'lead', 'customer', 'partner', 'friend', 'family')),
  
  -- Notes and metadata
  notes TEXT,
  tags TEXT[], -- Array of tags
  custom_fields JSONB DEFAULT '{}',
  
  -- Activity tracking
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_warmth ON public.contacts(user_id, warmth DESC);
CREATE INDEX idx_contacts_name ON public.contacts(user_id, name);
CREATE INDEX idx_contacts_tags ON public.contacts USING GIN(tags);

-- Trigger for updated_at
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Subscriptions Table

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing')),
  
  -- Provider info (Stripe or RevenueCat)
  provider TEXT CHECK (provider IN ('stripe', 'revenuecat', 'manual')),
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one subscription per user
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

---

## Row Level Security (RLS)

**Critical: Always enable RLS on tables with user data!**

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Contacts policies
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Common Queries

### Get User with Subscription

```typescript
const { data: user } = await supabase
  .from('users')
  .select(`
    *,
    subscription:subscriptions(*)
  `)
  .eq('id', userId)
  .single();
```

### Get Contacts with Pagination

```typescript
const PAGE_SIZE = 20;

const { data: contacts, count } = await supabase
  .from('contacts')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .order('warmth_score', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### Search Contacts

```typescript
const { data: contacts } = await supabase
  .from('contacts')
  .select('*')
  .eq('user_id', userId)
  .or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
  .limit(20);
```

### Filter by Tags

```typescript
const { data: contacts } = await supabase
  .from('contacts')
  .select('*')
  .eq('user_id', userId)
  .contains('tags', ['vip', 'customer']);
```

### Update Warmth Score (via EWMA)

```typescript
// Warmth is computed server-side via EWMA. To update, call the recompute endpoint:
// POST /api/v1/contacts/:id/warmth/recompute
// Or update amplitude directly after an interaction:
const { data } = await supabase
  .from('contacts')
  .update({ 
    warmth: newScore,
    warmth_band: newBand,
    warmth_last_updated_at: new Date().toISOString()
  })
  .eq('id', contactId)
  .eq('user_id', userId) // Security check
  .select()
  .single();
```

---

## Migrations

### Creating Migrations

```bash
# Create new migration
supabase migration new add_contact_tags

# This creates: supabase/migrations/[timestamp]_add_contact_tags.sql
```

### Example Migration

```sql
-- supabase/migrations/20240115000000_add_contact_tags.sql

-- Add tags column
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add index for tag queries
CREATE INDEX IF NOT EXISTS idx_contacts_tags 
ON public.contacts USING GIN(tags);

-- Backfill existing contacts with empty tags
UPDATE public.contacts 
SET tags = '{}' 
WHERE tags IS NULL;
```

### Applying Migrations

```bash
# Push to remote database
supabase db push

# Or reset and reapply all
supabase db reset
```

---

## Database Functions

### Auto-create User Profile

```sql
-- Automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Also create default subscription
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Warmth EWMA Decay (Recommended)

Warmth scores use an **EWMA (Exponentially Weighted Moving Average)** model:

```
score = BASE + amplitude × e^(-λ × daysSinceUpdate)
```

- **BASE** = 30 (neglected contacts settle here)
- **λ** depends on `warmth_mode`: fast=0.138629, medium=0.085998, slow=0.046210
- **Impulse weights** (added to amplitude on interaction): meeting=9, call=7, email=5, sms=4, note=3
- **Bands**: hot≥80, warm≥60, neutral≥40, cool≥20, cold<20

The daily cron job recomputes warmth for all contacts using this formula.
See `backend/lib/warmth-ewma.ts` for the `computeWarmthFromAmplitude()` implementation.

```sql
-- Legacy pg_cron approach (simple linear decay — NOT recommended, use EWMA cron instead)
-- The EWMA approach is handled by a Vercel cron route: /api/cron/daily-warmth
-- It reads amplitude + warmth_last_updated_at and applies exponential decay.
SELECT cron.schedule('daily-warmth', '0 3 * * *', $$
  -- Trigger the Vercel cron endpoint instead of inline SQL
  -- See backend/app/api/cron/daily-warmth/route.ts
$$);
```

---

## Performance Tips

1. **Always use indexes** for columns in WHERE clauses
2. **Use `select('column1, column2')** instead of `select('*')` when possible
3. **Paginate** large result sets
4. **Use RLS** instead of app-level filtering
5. **Denormalize** frequently accessed data (like subscription tier on users table)

---

## Backup & Recovery

### Enable Point-in-Time Recovery

1. Supabase Dashboard → Database → Backups
2. Enable PITR (Pro plan required)

### Manual Backup

```bash
# Using pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Restore

```bash
# Using psql
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Next Steps

- [Authentication →](05-AUTHENTICATION.md)
- [Payments →](06-PAYMENTS.md)
