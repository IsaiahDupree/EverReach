# Backend Setup Guide

## Complete Vercel + Supabase Configuration

This guide covers deploying and configuring your backend API on Vercel with Supabase as your database.

---

## Overview

The backend consists of:
- **Vercel Serverless Functions** - API endpoints
- **Supabase** - Database, Auth, Storage
- **Webhooks** - Stripe, RevenueCat integrations

---

## Step 1: Supabase Project Setup

### 1.1 Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `everreach-production` (or your app name)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for initialization

### 1.2 Get API Keys

Navigate to **Settings → API**:

| Key | Use For | Example |
|-----|---------|---------|
| **Project URL** | API calls | `https://abc123.supabase.co` |
| **anon public** | Frontend client | `eyJhbG...` |
| **service_role** | Backend only (NEVER expose) | `eyJhbG...` |

### 1.3 Configure Authentication

Navigate to **Authentication → Providers**:

#### Email Auth (Required)
```
✅ Enable Email provider
✅ Confirm email: ON (recommended)
✅ Secure email change: ON
```

#### OAuth Providers (Optional)
```
Google:
  - Client ID: [from Google Cloud Console]
  - Client Secret: [from Google Cloud Console]
  - Authorized redirect: https://abc123.supabase.co/auth/v1/callback

Apple:
  - Service ID: [from Apple Developer]
  - Secret Key: [from Apple Developer]
```

### 1.4 Configure Email Templates

Navigate to **Authentication → Email Templates**:

Customize these templates:
- Confirmation email
- Password reset
- Magic link
- Email change

Example confirmation email:
```html
<h2>Welcome to EverReach!</h2>
<p>Click below to confirm your email:</p>
<a href="{{ .ConfirmationURL }}">Confirm Email</a>
```

---

## Step 2: Database Schema

### 2.1 Run Migrations

The schema is in `supabase/migrations/`. Apply it:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project (find ref in project settings)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 2.2 Core Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  warmth_score INTEGER DEFAULT 50,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT, -- 'stripe' or 'revenuecat'
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Row Level Security (RLS)

**Critical:** Enable RLS on all tables!

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can only see their own contacts
CREATE POLICY "Users can CRUD own contacts"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id);

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Step 3: Vercel Deployment

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `backend-vercel` (or your backend folder)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.vercel/output`

### 3.2 Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (⚠️ Keep secret!)

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat
REVENUECAT_API_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH_TOKEN=your-secret-token

# App URLs
FRONTEND_URL=https://your-app.com
```

### 3.3 API Routes Structure

```
backend-vercel/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── logout/route.ts
│       │   └── refresh/route.ts
│       │
│       ├── users/
│       │   ├── route.ts           # GET /api/users (list)
│       │   ├── me/route.ts        # GET /api/users/me
│       │   └── [id]/route.ts      # GET/PUT /api/users/:id
│       │
│       ├── contacts/
│       │   ├── route.ts           # GET/POST /api/contacts
│       │   ├── [id]/route.ts      # GET/PUT/DELETE /api/contacts/:id
│       │   └── import/route.ts    # POST /api/contacts/import
│       │
│       ├── webhooks/
│       │   ├── stripe/route.ts    # POST /api/webhooks/stripe
│       │   └── revenuecat/route.ts # POST /api/webhooks/revenuecat
│       │
│       └── health/route.ts        # GET /api/health
```

### 3.4 Example API Route

```typescript
// app/api/contacts/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Get user from auth header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Fetch contacts for this user
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  // Similar auth check...
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data }, { status: 201 });
}
```

---

## Step 4: Webhook Configuration

### 4.1 Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. URL: `https://your-api.vercel.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

5. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET`

### 4.2 RevenueCat Webhooks

1. Go to RevenueCat Dashboard → Project → Integrations → Webhooks
2. Add webhook URL: `https://your-api.vercel.app/api/webhooks/revenuecat`
3. Add Authorization header: `Bearer your-secret-token`
4. Enable events:
   - Initial Purchase
   - Renewal
   - Cancellation
   - Expiration

---

## Step 5: Security Patterns

This starter kit includes production-hardened security patterns from EverReach v1.1.0/v1.1.2.

### 5.1 Service Client Pattern (getServiceClient)

**Problem:** Directly using `createClient()` everywhere leaks environment variables and makes code harder to audit.

**Solution:** Always use `getServiceClient()` from `backend-vercel/lib/supabase.ts`:

```typescript
// ❌ BAD: Direct createClient
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ GOOD: Use getServiceClient
import { getServiceClient } from '@/lib/supabase';

const supabase = getServiceClient();
```

**Benefits:**
- **Centralized error handling**: Throws clear error if env vars missing
- **Audit trail**: All service-role access goes through one function
- **Easy to add logging**: Single place to add audit logs
- **Prevents leaks**: Never accidentally use anon key server-side

**When to use:**
- ✅ Cron jobs (bypass RLS)
- ✅ Webhook handlers (no user context)
- ✅ Admin operations
- ❌ User-facing API routes (use `createRlsClientFromRequest` instead)

---

### 5.2 Cron Authentication (verifyCron)

**Problem:** Vercel cron jobs are public by default - anyone can trigger them.

**Solution:** Call `verifyCron(req)` in all cron endpoints:

```typescript
import { verifyCron } from '@/lib/auth';

export async function GET(req: Request) {
  verifyCron(req); // ← Throws 401 if auth fails (fail-closed)

  // ... cron job logic
  return NextResponse.json({ success: true });
}
```

**Setup:**

1. Generate a strong secret:
```bash
openssl rand -base64 32
```

2. Add to `.env`:
```bash
CRON_SECRET=your_generated_secret_here
```

3. Configure Vercel cron to send header:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    }
  ]
}
```

**Why fail-closed:**
- If `CRON_SECRET` is missing → 500 error (forces you to fix it)
- If header is missing → 401 error (blocks unauthorized access)
- If secret is wrong → 401 error (prevents guessing)

---

### 5.3 Webhook Authentication

All webhook handlers must verify signatures or secrets.

#### Option A: Signature Verification (RevenueCat, Stripe)

```typescript
import { verifyWebhook } from '@/lib/auth';

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET!;
  await verifyWebhook(req, secret, 'x-revenuecat-signature');

  // ... webhook logic
}
```

#### Option B: Simple Secret (Custom webhooks)

```typescript
import { verifyWebhookSecret } from '@/lib/auth';

export async function POST(req: Request) {
  const secret = process.env.MY_WEBHOOK_SECRET!;
  verifyWebhookSecret(req, secret);

  // ... webhook logic
}
```

**Critical rules:**
- ✅ **Fail-closed**: Throw 401 if verification fails (don't return 200)
- ✅ **Validate first**: Check auth BEFORE parsing body or DB queries
- ❌ **Never skip**: "I'll add auth later" = security breach in production

**EverReach lesson:**
In v1.0.0, webhooks returned `200 OK` on auth failure to "be nice to the sender". This allowed unauthorized webhook triggers. v1.1.0 fixed this by failing-closed (401 on failure).

---

### 5.4 Error Sanitization

**Problem:** Exposing `error.message` in API responses leaks database schema, file paths, and internal logic.

**Solution:** Never expose raw error messages:

```typescript
// ❌ BAD: Exposes internal details
catch (error: any) {
  return NextResponse.json(
    { error: error.message },  // ← Leaks schema, paths, etc.
    { status: 500 }
  );
}

// ✅ GOOD: Generic error message
catch (error: any) {
  console.error('[API] Error:', error);  // Log for debugging
  return NextResponse.json(
    { error: 'Internal server error' },  // Generic message
    { status: 500 }
  );
}

// ✅ BETTER: Development-only details
catch (error: any) {
  console.error('[API] Error:', error);
  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,  // Only in dev
      }),
    },
    { status: 500 }
  );
}
```

**What gets leaked:**
- Database table/column names
- File system paths
- Environment variable names
- SQL queries
- Third-party API URLs

---

### 5.5 Cron Job Consolidation

**Problem:** Too many cron jobs = high Vercel function invocation costs.

**Solution:** Batch related tasks into single cron endpoints.

**Example - Before (20 cron jobs):**
```json
{
  "crons": [
    { "path": "/api/cron/cleanup-users", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-sessions", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-logs", "schedule": "0 0 * * *" },
    // ... 17 more daily tasks
  ]
}
```

**After (10 cron jobs, ~57% reduction):**
```json
{
  "crons": [
    { "path": "/api/cron/daily-cleanup", "schedule": "0 0 * * *" },
    // Handles users + sessions + logs in ONE function
  ]
}
```

**Implementation:**
```typescript
// backend-vercel/app/api/cron/daily-cleanup/route.ts
export async function GET(req: Request) {
  verifyCron(req);

  const supabase = getServiceClient();
  const results = [];

  // Run all cleanup tasks sequentially
  results.push(await cleanupExpiredSessions(supabase));
  results.push(await cleanupInactiveUsers(supabase));
  results.push(await cleanupOldLogs(supabase));

  return NextResponse.json({ results });
}
```

**EverReach stats:**
- Before: 27 separate cron endpoints
- After: 10 consolidated endpoints
- Savings: ~57% reduction in function calls

---

### 5.6 Row-Level Security (RLS) Best Practices

Enable RLS on ALL tables (except audit logs):

```sql
-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (for cron/webhooks)
CREATE POLICY "Service role can manage contacts"
  ON contacts FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Why RLS matters:**
- **Defense in depth**: Even if `getServiceClient()` leaks, users can't access other users' data
- **Audit compliance**: Prevents accidental cross-user data exposure
- **Zero-trust**: Don't trust application code to filter correctly

---

### 5.7 Security Checklist

Before deploying to production:

**Authentication:**
- [ ] All cron endpoints call `verifyCron()`
- [ ] All webhook endpoints verify signatures or secrets
- [ ] `CRON_SECRET` is set in production
- [ ] Webhook secrets are set (not placeholder values)

**Database:**
- [ ] All tables have RLS enabled
- [ ] Service role policies are restrictive (not `USING (true)` for user data)
- [ ] User-facing routes use `createRlsClientFromRequest()`, not `getServiceClient()`

**Error Handling:**
- [ ] No `error.message` exposed in API responses
- [ ] All errors logged to console (for debugging)
- [ ] Generic error messages returned to clients

**Secrets:**
- [ ] No secrets committed to git (check `.env.example`)
- [ ] All `process.env` accesses have fallbacks or validation
- [ ] Service role key only used in `getServiceClient()`

**Code Quality:**
- [ ] No `createClient()` calls outside `lib/supabase.ts`
- [ ] No `TODO` comments with security implications
- [ ] All webhook handlers fail-closed (401 on auth failure, not 200)

---

## Step 6: Testing

### Local Development

```bash
cd backend-vercel
npm install
npm run dev

# API available at http://localhost:3000
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Login (get token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get contacts (with token)
curl http://localhost:3000/api/contacts \
  -H "Authorization: Bearer eyJhbG..."
```

### Webhook Testing

Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token is valid and not expired |
| 403 Forbidden | Check RLS policies in Supabase |
| 500 Server Error | Check Vercel logs, verify env vars |
| Webhook fails | Verify webhook secret, check payload format |

---

## Next Steps

- [Database Guide →](04-DATABASE.md)
- [Authentication →](05-AUTHENTICATION.md)
- [Payments →](06-PAYMENTS.md)
