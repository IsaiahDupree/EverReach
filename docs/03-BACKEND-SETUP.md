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

## Step 5: Testing

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
