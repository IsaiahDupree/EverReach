# Product Requirements Document (PRD)
# EverReach Backend Starter Kit - Option A

## Executive Summary

Transform the existing EverReach backend codebase into a reusable API starter kit that developers can clone and customize with their own business logic while retaining production-ready infrastructure for Vercel or Render deployment.

---

## Product Vision

**One-liner:** A production-ready backend API template that developers clone, swap the business logic, and deploy to Vercel/Render in days instead of months.

**Target User:** Developers building mobile or web apps who need a scalable backend with auth, payments, and database integration.

**Value Proposition:** Skip months of backend infrastructure work. Get authentication, subscription management, webhook handling, and API architecture out of the box.

---

## Goals & Success Metrics

### Goals

1. **Reduce backend setup time** from weeks to hours
2. **Eliminate boilerplate** - auth, payments, CORS, rate limiting done
3. **Provide deployment flexibility** - Works on Vercel (serverless) or Render (container)
4. **Production-ready security** - RLS, input validation, rate limiting included

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to first deployment | < 30 minutes |
| Time to add custom endpoint | < 1 hour |
| Time to production deployment | < 1 week |
| Zero security vulnerabilities | 0 critical issues |

---

## Deployment Options

### Option 1: Vercel (Recommended for Serverless)

| Feature | Detail |
|---------|--------|
| **Architecture** | Serverless Functions |
| **Scaling** | Automatic, per-request |
| **Cold starts** | ~200-500ms |
| **Cost** | Free tier available, pay per invocation |
| **Best for** | Variable traffic, cost optimization |

### Option 2: Render (For Containers)

| Feature | Detail |
|---------|--------|
| **Architecture** | Docker containers |
| **Scaling** | Manual or auto-scale |
| **Cold starts** | None (always running) |
| **Cost** | $7/month minimum |
| **Best for** | Consistent traffic, long-running processes |

---

## Scope

### In Scope (What We Ship)

| Component | Description |
|-----------|-------------|
| **Authentication API** | JWT tokens, refresh, Supabase Auth integration |
| **User Management** | Profile CRUD, avatar upload, account deletion |
| **Subscription API** | RevenueCat webhooks, Stripe webhooks, tier management |
| **CRUD Endpoints** | Generic item API with pagination, filtering, search |
| **File Upload** | Supabase Storage integration |
| **Webhook Handlers** | Payment provider webhooks with signature verification |
| **Rate Limiting** | Per-user and per-IP rate limits |
| **CORS Configuration** | Production-ready CORS setup |
| **Error Handling** | Consistent error responses, logging |
| **Health Checks** | Endpoint health monitoring |
| **OpenAPI Spec** | Auto-generated API documentation |

### Out of Scope (What Users Build)

| Component | User Responsibility |
|-----------|---------------------|
| Business logic | Domain-specific endpoints |
| Data models | Their specific entities |
| Custom integrations | Third-party APIs for their use case |
| Background jobs | Cron jobs, queues (if needed) |

---

## Technical Architecture

### Current backend-vercel Structure

```
backend-vercel/
├── app/                          # Next.js App Router API
│   └── api/                      # API Routes
│       ├── auth/                 # Authentication endpoints
│       │   ├── login/            # POST /api/auth/login
│       │   ├── logout/           # POST /api/auth/logout
│       │   ├── refresh/          # POST /api/auth/refresh
│       │   └── me/               # GET /api/auth/me
│       ├── users/                # User management
│       │   ├── [id]/             # GET/PUT/DELETE /api/users/:id
│       │   └── profile/          # GET/PUT /api/users/profile
│       ├── items/                # Generic CRUD (REPLACE)
│       │   ├── route.ts          # GET/POST /api/items
│       │   └── [id]/             # GET/PUT/DELETE /api/items/:id
│       ├── subscriptions/        # Subscription management
│       │   ├── status/           # GET /api/subscriptions/status
│       │   └── tiers/            # GET /api/subscriptions/tiers
│       ├── webhooks/             # Payment webhooks
│       │   ├── stripe/           # POST /api/webhooks/stripe
│       │   └── revenuecat/       # POST /api/webhooks/revenuecat
│       ├── upload/               # File uploads
│       │   └── route.ts          # POST /api/upload
│       └── health/               # Health checks
│           └── route.ts          # GET /api/health
│
├── lib/                          # Shared libraries
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── admin.ts              # Admin client (service role)
│   ├── auth/                     # Auth utilities
│   │   ├── middleware.ts         # Auth middleware
│   │   └── jwt.ts                # JWT helpers
│   ├── payments/                 # Payment integrations
│   │   ├── stripe.ts             # Stripe client
│   │   └── revenuecat.ts         # RevenueCat client
│   ├── rate-limit/               # Rate limiting
│   │   └── index.ts              # Rate limiter
│   └── utils/                    # Utilities
│       ├── cors.ts               # CORS helper
│       ├── errors.ts             # Error handler
│       └── validation.ts         # Input validation
│
├── types/                        # TypeScript types
│   ├── api.ts                    # API types
│   ├── user.ts                   # User types
│   ├── item.ts                   # Item types (REPLACE)
│   └── subscription.ts           # Subscription types
│
├── middleware.ts                 # Next.js middleware
├── vercel.json                   # Vercel config
├── package.json                  # Dependencies
└── .env.example                  # Environment template
```

---

## API Endpoints Reference

### Authentication (Keep As-Is)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Email/password login | No |
| POST | `/api/auth/signup` | Create account | No |
| POST | `/api/auth/logout` | End session | Yes |
| POST | `/api/auth/refresh` | Refresh token | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/forgot-password` | Password reset email | No |
| POST | `/api/auth/reset-password` | Set new password | No |

### User Management (Keep As-Is)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/profile` | Get own profile | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| DELETE | `/api/users/profile` | Delete account | Yes |
| POST | `/api/upload/avatar` | Upload avatar | Yes |

### Items CRUD (Replace with Your Entity)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/items` | List items (paginated) | Yes |
| POST | `/api/items` | Create item | Yes |
| GET | `/api/items/:id` | Get single item | Yes |
| PUT | `/api/items/:id` | Update item | Yes |
| DELETE | `/api/items/:id` | Delete item | Yes |
| GET | `/api/items/search` | Search items | Yes |

### Subscriptions (Keep As-Is)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/subscriptions/status` | Get user's subscription | Yes |
| GET | `/api/subscriptions/tiers` | List available tiers | No |
| POST | `/api/subscriptions/checkout` | Create checkout session | Yes |
| POST | `/api/subscriptions/portal` | Billing portal URL | Yes |

### Webhooks (Keep As-Is)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/webhooks/stripe` | Stripe webhook | Signature |
| POST | `/api/webhooks/revenuecat` | RevenueCat webhook | Signature |

---

## Developer Handoff Guide

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **npm** or **bun** | Latest | Package manager |
| **Git** | Latest | Version control |
| **Vercel CLI** | Latest | `npm install -g vercel` |
| **VS Code** | Latest | Recommended IDE |

### Account Requirements

| Service | Required? | Purpose | Setup Time |
|---------|-----------|---------|------------|
| **Supabase** | ✅ Yes | Database, Auth | 5 min |
| **Vercel** | ✅ Yes | Hosting | 5 min |
| **Stripe** | For web payments | Payment processing | 15 min |
| **RevenueCat** | For mobile payments | iOS/Android subscriptions | 15 min |

---

### Step-by-Step Setup Instructions

#### Step 1: Clone & Install (5 minutes)

```bash
# Clone the backend starter
git clone -b backend-starter https://github.com/IsaiahDupree/EverReach.git my-backend
cd my-backend

# Install dependencies
npm install
```

#### Step 2: Supabase Setup (10 minutes)

1. **Create Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Save the database password

2. **Get API Keys:**
   - Settings → API
   - Copy: `Project URL`, `anon key`, `service_role key`

3. **Run Database Schema:**
   ```bash
   # In Supabase SQL Editor, run:
   # Contents of supabase/schema.sql
   ```

#### Step 3: Environment Configuration (5 minutes)

```bash
# Copy example env
cp .env.example .env.local

# Edit with your values
```

**Required Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payments (optional for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
REVENUECAT_API_KEY=sk_...
REVENUECAT_WEBHOOK_SECRET=...
```

#### Step 4: Run Locally (2 minutes)

```bash
# Start development server
npm run dev

# API available at http://localhost:3000/api
```

#### Step 5: Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Create account
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

### File Structure Reference

```
my-backend/
├── app/api/                      # 🌐 API ROUTES
│   ├── auth/                     # ✅ KEEP - Authentication
│   │   ├── login/route.ts        # Login endpoint
│   │   ├── signup/route.ts       # Signup endpoint
│   │   ├── logout/route.ts       # Logout endpoint
│   │   ├── refresh/route.ts      # Token refresh
│   │   ├── me/route.ts           # Current user
│   │   └── forgot-password/      # Password reset
│   ├── users/                    # ✅ KEEP - User management
│   │   └── profile/route.ts      # Profile CRUD
│   ├── items/                    # 🔧 REPLACE - Your entity
│   │   ├── route.ts              # List/Create
│   │   ├── [id]/route.ts         # Get/Update/Delete
│   │   └── search/route.ts       # Search
│   ├── subscriptions/            # ✅ KEEP - Payments
│   │   ├── status/route.ts       # Get status
│   │   └── tiers/route.ts        # List tiers
│   ├── webhooks/                 # ✅ KEEP - Webhooks
│   │   ├── stripe/route.ts       # Stripe webhook
│   │   └── revenuecat/route.ts   # RevenueCat webhook
│   ├── upload/                   # ✅ KEEP - File uploads
│   │   └── route.ts              # Upload handler
│   └── health/                   # ✅ KEEP - Health check
│       └── route.ts              # Health endpoint
│
├── lib/                          # 📚 SHARED LIBRARIES
│   ├── supabase/                 # ✅ KEEP - Database clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── admin.ts              # Admin client
│   ├── auth/                     # ✅ KEEP - Auth utilities
│   │   ├── middleware.ts         # Auth middleware
│   │   └── validate.ts           # Token validation
│   ├── payments/                 # ✅ KEEP - Payment utils
│   │   ├── stripe.ts             # Stripe helpers
│   │   └── revenuecat.ts         # RevenueCat helpers
│   └── utils/                    # ✅ KEEP - Utilities
│       ├── cors.ts               # CORS configuration
│       ├── errors.ts             # Error handling
│       ├── rate-limit.ts         # Rate limiting
│       └── validation.ts         # Input validation (Zod)
│
├── types/                        # 📝 TYPESCRIPT TYPES
│   ├── api.ts                    # ✅ KEEP - API response types
│   ├── user.ts                   # ✅ KEEP - User types
│   ├── item.ts                   # 🔧 REPLACE - Your entity
│   └── subscription.ts           # ✅ KEEP - Subscription types
│
├── supabase/                     # 🗄️ DATABASE
│   ├── schema.sql                # 🔧 CUSTOMIZE - Your schema
│   └── migrations/               # Database migrations
│
├── middleware.ts                 # ✅ KEEP - Global middleware
├── vercel.json                   # ✅ KEEP - Vercel config
├── next.config.js                # ✅ KEEP - Next.js config
├── package.json                  # Dependencies
└── .env.example                  # Environment template
```

---

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                           │
│                  (Mobile App / Web App / API)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    CORS     │  │ Rate Limit  │  │    Auth     │              │
│  │   Check     │  │   Check     │  │   Verify    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTE HANDLER                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    app/api/items/route.ts                  │  │
│  │                                                            │  │
│  │  1. Validate input (Zod)                                   │  │
│  │  2. Check permissions (subscription tier)                  │  │
│  │  3. Execute business logic                                 │  │
│  │  4. Return response                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     Auth     │  │   Database   │  │   Storage    │           │
│  │              │  │    (RLS)     │  │              │           │
│  │ • JWT verify │  │ • items      │  │ • avatars    │           │
│  │ • Sessions   │  │ • users      │  │ • uploads    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Creating a New Endpoint

#### Example: Add a `/api/tasks` endpoint

**Step 1: Create type definition**

```typescript
// types/task.ts
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
}
```

**Step 2: Create validation schema**

```typescript
// lib/validation/task.ts
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().datetime().optional(),
});
```

**Step 3: Create API route**

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/middleware';
import { CreateTaskSchema } from '@/lib/validation/task';
import { handleError } from '@/lib/utils/errors';

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) return handleError(error);
    
    return NextResponse.json({ data });
  });
}

// POST /api/tasks - Create task
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    
    // Validate input
    const result = CreateTaskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        ...result.data,
      })
      .select()
      .single();
    
    if (error) return handleError(error);
    
    return NextResponse.json({ data }, { status: 201 });
  });
}
```

**Step 4: Add database table**

```sql
-- supabase/migrations/add_tasks_table.sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tasks"
ON public.tasks FOR ALL
USING (auth.uid() = user_id);
```

---

### Deployment

#### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all required vars

# Deploy to production
vercel --prod
```

#### Deploy to Render

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

2. Create new Web Service on Render
3. Connect GitHub repo
4. Add environment variables
5. Deploy

---

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase admin key | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Backend URL | `https://api.yourapp.com` |
| `STRIPE_SECRET_KEY` | For Stripe | Stripe secret | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | For Stripe | Webhook signing | `whsec_...` |
| `REVENUECAT_API_KEY` | For mobile | RevenueCat key | `sk_...` |
| `REVENUECAT_WEBHOOK_SECRET` | For mobile | Webhook secret | `...` |
| `RATE_LIMIT_MAX` | Optional | Max requests/min | `100` |

---

### Customization Checklist

#### Day 1: Setup & Configuration

- [ ] Clone repository
- [ ] Install dependencies
- [ ] Create Supabase project
- [ ] Configure environment variables
- [ ] Run locally and test health endpoint

#### Day 2: Data Model

- [ ] Define your entity types in `types/`
- [ ] Create validation schemas in `lib/validation/`
- [ ] Update database schema in `supabase/schema.sql`
- [ ] Apply migrations to Supabase

#### Day 3: API Endpoints

- [ ] Rename/replace `items` endpoints with your entity
- [ ] Add any custom endpoints needed
- [ ] Test all CRUD operations
- [ ] Verify authentication works

#### Day 4: Payments (if needed)

- [ ] Configure Stripe/RevenueCat
- [ ] Set up webhook endpoints
- [ ] Test subscription flow
- [ ] Verify tier-based access

#### Day 5: Deployment

- [ ] Deploy to Vercel/Render
- [ ] Configure production environment variables
- [ ] Set up custom domain
- [ ] Test production endpoints

---

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired token | Check Supabase keys, token expiry |
| 403 Forbidden | RLS policy blocking | Check RLS policies in Supabase |
| CORS errors | Missing CORS headers | Verify `lib/utils/cors.ts` config |
| 500 Server Error | Unhandled exception | Check Vercel logs, add try/catch |
| Webhook failing | Invalid signature | Verify webhook secret matches |

---

### Security Checklist

- [ ] All endpoints use `withAuth` middleware
- [ ] Input validated with Zod schemas
- [ ] Rate limiting enabled
- [ ] CORS configured for allowed origins only
- [ ] Webhook signatures verified
- [ ] No secrets in client-side code
- [ ] RLS policies on all tables
- [ ] Service role key never exposed

---

### Support & Resources

| Resource | URL |
|----------|-----|
| Next.js App Router | https://nextjs.org/docs/app |
| Supabase Docs | https://supabase.com/docs |
| Vercel Docs | https://vercel.com/docs |
| Stripe API | https://stripe.com/docs/api |
| RevenueCat Docs | https://docs.revenuecat.com |

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Clean & Genericize** | 1-2 days | Item-based API |
| **Phase 2: Remove EverReach Logic** | 1 day | Clean starter |
| **Phase 3: Documentation** | 1 day | All guides |
| **Phase 4: QA & Test** | 1 day | Working starter |
| **Total** | **4-5 days** | Production-ready kit |

---

## Deliverables Checklist

### Code Changes

- [ ] Rename contact endpoints → item endpoints
- [ ] Simplify database schema to generic starter
- [ ] Remove EverReach-specific logic (warmth, goals, etc.)
- [ ] Add code comments with customization hints
- [ ] Create .env.example with all variables
- [ ] Keep infrastructure (auth, payments, rate limiting)

### Documentation

- [ ] QUICKSTART.md - 30-minute setup
- [ ] API_REFERENCE.md - All endpoints documented
- [ ] DEPLOYMENT.md - Vercel + Render guides
- [ ] CUSTOMIZATION.md - How to add endpoints
- [ ] SECURITY.md - Best practices

### Quality Assurance

- [ ] API runs on first clone
- [ ] All auth flows work
- [ ] Webhook handling works
- [ ] Rate limiting works
- [ ] No EverReach branding in responses

---

## Next Steps

1. **Approve this PRD**
2. Begin Phase 1: Clean & Genericize
3. Create new branch: `backend-starter`
4. Execute transformation
5. QA and document
6. Push to GitHub
