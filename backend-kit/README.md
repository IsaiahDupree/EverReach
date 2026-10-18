# EverReach Backend Starter Kit

A production-ready backend API template built with Next.js 14 App Router, Supabase, Stripe, and RevenueCat. Clone it, customize it, and deploy to Vercel or Render in days instead of months.

## Overview

This starter kit provides a complete backend infrastructure for mobile and web applications with:

- **Authentication**: JWT-based auth with Supabase (email/password, OAuth, magic links)
- **Database**: PostgreSQL with Row Level Security (RLS) via Supabase
- **Payments**: Stripe (web) and RevenueCat (mobile) subscription handling
- **File Upload**: Supabase Storage integration
- **Security**: Rate limiting, CORS, input validation, webhook signature verification
- **API Architecture**: RESTful endpoints with Next.js API routes
- **Type Safety**: Full TypeScript support throughout

**Target Users**: Developers building mobile or web apps who need a scalable backend with auth, payments, and database integration.

**Value Proposition**: Skip months of backend infrastructure work. Get authentication, subscription management, webhook handling, and API architecture out of the box.

---

## Prerequisites

Before getting started, ensure you have:

| Requirement | Version | Purpose | Installation |
|-------------|---------|---------|--------------|
| **Node.js** | 18+ | Runtime environment | [Download](https://nodejs.org) |
| **npm** | Latest | Package manager | Included with Node.js |
| **Git** | Latest | Version control | [Download](https://git-scm.com) |
| **Vercel CLI** (optional) | Latest | Deployment tool | `npm install -g vercel` |

### Account Requirements

| Service | Required? | Purpose | Setup Time |
|---------|-----------|---------|------------|
| **Supabase** | ✅ Yes | Database, Auth | 5 min |
| **Vercel** | ✅ Yes | Hosting | 5 min |
| **Stripe** | Optional | Web payments | 15 min |
| **RevenueCat** | Optional | Mobile subscriptions | 15 min |

---

## Quick Start

Get up and running in under 30 minutes:

### Step 1: Clone & Install (5 minutes)

```bash
# Clone the repository
git clone https://github.com/IsaiahDupree/EverReach.git
cd EverReach/backend-kit

# Install dependencies
npm install
```

### Step 2: Supabase Setup (10 minutes)

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name and secure password
   - Wait for project to finish setting up (~2 minutes)

2. **Get API Keys:**
   - Navigate to Settings → API
   - Copy the following values:
     - `Project URL`
     - `anon public` (anon key)
     - `service_role` (service role key - keep this secret!)

3. **Run Database Schema:**
   - Go to the SQL Editor in Supabase dashboard
   - Copy the contents of `supabase/schema.sql`
   - Paste and run in the SQL Editor

### Step 3: Environment Configuration (5 minutes)

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your values
# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_APP_URL (use http://localhost:3000 for development)
```

**Minimum Required Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run Development Server (2 minutes)

```bash
# Start the development server
npm run dev

# Server will be running at http://localhost:3000
```

### Step 5: Verify Installation

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected"}

# Create a test account
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Expected response:
# {"data":{"user":{...},"session":{...}}}
```

---

## Environment Setup

### Development Environment

The `.env.local` file contains all configuration for your backend. See `.env.example` for a complete template with detailed comments.

**Core Variables (Required):**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (safe for client) | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (**server only!**) | `eyJhbGc...` |
| `NEXT_PUBLIC_APP_URL` | Your backend API URL | `http://localhost:3000` |

**Payment Variables (Optional):**

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | For web payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For Stripe webhooks |
| `STRIPE_PRICE_*` | Stripe price IDs for tiers | For subscription tiers |
| `REVENUECAT_API_KEY` | RevenueCat API key | For mobile payments |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook secret | For RevenueCat webhooks |

**Configuration Variables (Optional):**

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_MAX` | Max requests per minute | `100` |
| `NODE_ENV` | Environment mode | `development` |
| `ENABLE_ERROR_DETAILS` | Show detailed errors | `true` in dev |

### Production Environment

For production deployments, set these variables in your hosting platform:

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all other required variables
```

**Render:**
- Navigate to your service settings
- Add environment variables in the "Environment" tab
- Restart the service after adding variables

---

## Available Scripts

Run these commands in the `backend-kit` directory:

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm run dev` | Start development server at http://localhost:3000 |
| **Build** | `npm run build` | Build production bundle |
| **Start** | `npm run start` | Start production server (after build) |
| **Test** | `npm run test` | Run unit tests with Jest |
| **Test Watch** | `npm run test:watch` | Run tests in watch mode |
| **Test Coverage** | `npm run test:coverage` | Generate test coverage report |
| **Lint** | `npm run lint` | Run ESLint for code quality |
| **Type Check** | `npm run type-check` | Run TypeScript type checking |

### Usage Examples

```bash
# Development workflow
npm run dev                 # Start dev server with hot reload

# Testing workflow
npm run test                # Run all tests once
npm run test:watch          # Run tests on file changes
npm run test:coverage       # Generate coverage report

# Production build
npm run build               # Build for production
npm run start               # Start production server

# Code quality
npm run lint                # Check for linting errors
npm run type-check          # Verify TypeScript types
```

---

## Architecture

### High-Level Overview

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
│  │                  app/api/*/route.ts                        │  │
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

### Project Structure

```
backend-kit/
├── app/                          # Next.js App Router
│   └── api/                      # API Routes
│       ├── auth/                 # ✅ KEEP - Authentication endpoints
│       │   ├── login/            # POST /api/auth/login
│       │   ├── signup/           # POST /api/auth/signup
│       │   ├── logout/           # POST /api/auth/logout
│       │   ├── refresh/          # POST /api/auth/refresh
│       │   ├── me/               # GET /api/auth/me
│       │   └── forgot-password/  # POST /api/auth/forgot-password
│       ├── users/                # ✅ KEEP - User management
│       │   └── profile/          # GET/PUT/DELETE /api/users/profile
│       ├── items/                # 🔧 CUSTOMIZE - Replace with your entity
│       │   ├── route.ts          # GET/POST /api/items
│       │   ├── [id]/route.ts     # GET/PUT/DELETE /api/items/:id
│       │   └── search/route.ts   # GET /api/items/search
│       ├── subscriptions/        # ✅ KEEP - Subscription management
│       │   ├── status/           # GET /api/subscriptions/status
│       │   ├── tiers/            # GET /api/subscriptions/tiers
│       │   ├── checkout/         # POST /api/subscriptions/checkout
│       │   └── portal/           # POST /api/subscriptions/portal
│       ├── webhooks/             # ✅ KEEP - Payment webhooks
│       │   ├── stripe/           # POST /api/webhooks/stripe
│       │   └── revenuecat/       # POST /api/webhooks/revenuecat
│       ├── upload/               # ✅ KEEP - File uploads
│       │   └── route.ts          # POST /api/upload
│       └── health/               # ✅ KEEP - Health check
│           └── route.ts          # GET /api/health
│
├── lib/                          # Shared libraries
│   ├── supabase/                 # Supabase clients
│   │   ├── server.ts             # Server-side client
│   │   └── admin.ts              # Admin client (service role)
│   ├── auth/                     # Auth utilities
│   │   ├── middleware.ts         # Auth middleware (withAuth)
│   │   └── validate.ts           # Token validation
│   ├── payments/                 # Payment integrations
│   │   ├── stripe.ts             # Stripe client & helpers
│   │   └── revenuecat.ts         # RevenueCat client & helpers
│   ├── utils/                    # Utilities
│   │   ├── cors.ts               # CORS configuration
│   │   ├── errors.ts             # Error handling
│   │   ├── rate-limit.ts         # Rate limiting
│   │   └── validation.ts         # Input validation helpers
│   └── validation/               # Zod schemas
│       └── item.ts               # 🔧 CUSTOMIZE - Item validation
│
├── types/                        # TypeScript types
│   ├── api.ts                    # API response types
│   ├── user.ts                   # User types
│   ├── item.ts                   # 🔧 CUSTOMIZE - Item types
│   └── subscription.ts           # Subscription types
│
├── supabase/                     # Database
│   └── schema.sql                # 🔧 CUSTOMIZE - Database schema
│
├── __tests__/                    # Unit tests
│
├── docs/                         # Documentation
│   └── API_REFERENCE.md          # API endpoint documentation
│
├── .env.example                  # Environment template
├── next.config.js                # Next.js configuration
├── vercel.json                   # Vercel deployment config
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── jest.config.js                # Jest test config
```

### API Endpoints

**Authentication** (no auth required):
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/signup` - Create account
- `POST /api/auth/forgot-password` - Request password reset

**Authentication** (auth required):
- `POST /api/auth/logout` - End session
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

**User Management** (auth required):
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `DELETE /api/users/profile` - Delete account

**Items CRUD** (auth required - customize for your use case):
- `GET /api/items` - List items (paginated)
- `POST /api/items` - Create item
- `GET /api/items/:id` - Get single item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/search` - Search items

**Subscriptions** (auth required):
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/checkout` - Create checkout session
- `POST /api/subscriptions/portal` - Get billing portal URL

**Subscriptions** (public):
- `GET /api/subscriptions/tiers` - List available tiers

**Webhooks** (signature verification):
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/revenuecat` - RevenueCat webhook handler

**File Upload** (auth required):
- `POST /api/upload` - Upload file to Supabase Storage

**Health Check** (public):
- `GET /api/health` - API health status

See `docs/API_REFERENCE.md` for complete endpoint documentation.

---

## Deployment

### Deploy to Vercel (Recommended)

Vercel provides serverless deployment with automatic scaling:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
# ... add all required variables from .env.example

# Deploy to production
vercel --prod
```

**After Deployment:**
1. Update `NEXT_PUBLIC_APP_URL` to your production URL
2. Configure webhook URLs in Stripe and RevenueCat dashboards
3. Test all endpoints in production environment

### Deploy to Render (Alternative)

Render provides container-based deployment:

1. **Create Dockerfile** (if not already present):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Create new Web Service on Render:**
   - Connect your GitHub repository
   - Choose "Docker" as runtime
   - Add all environment variables from `.env.example`
   - Click "Create Web Service"

3. **Configure:**
   - Set `NEXT_PUBLIC_APP_URL` to your Render URL
   - Configure webhooks in payment provider dashboards
   - Test endpoints

### Post-Deployment Checklist

- [ ] All environment variables set correctly
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Can create account via `/api/auth/signup`
- [ ] Can login via `/api/auth/login`
- [ ] Database queries work (test with `/api/items`)
- [ ] Webhook URLs configured in Stripe/RevenueCat
- [ ] CORS settings allow your frontend domain
- [ ] Rate limiting is active
- [ ] Error logging is working

---

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| `401 Unauthorized` | Invalid or expired JWT token | Check Supabase keys, verify token hasn't expired |
| `403 Forbidden` | RLS policy blocking access | Check RLS policies in Supabase SQL Editor |
| `CORS errors` | Missing or incorrect CORS config | Verify allowed origins in `lib/utils/cors.ts` |
| `500 Server Error` | Unhandled exception in route | Check Vercel logs or console for stack trace |
| `Webhook failing` | Invalid signature verification | Verify webhook secret matches provider dashboard |
| `Database connection failed` | Incorrect Supabase credentials | Check `NEXT_PUBLIC_SUPABASE_URL` and keys |
| `Module not found` | Missing dependencies | Run `npm install` |
| `Type errors` | TypeScript configuration issue | Run `npm run type-check` to see details |

### Database Issues

**Problem: RLS policies blocking queries**
```sql
-- Check policies in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'items';

-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
```

**Problem: Migration not applied**
```bash
# Verify migrations in Supabase dashboard
# Navigate to Database → Migrations
# Ensure all migrations are applied
```

### Authentication Issues

**Problem: Token expired**
```bash
# Tokens expire after 1 hour by default
# Use refresh token to get new access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

**Problem: Cannot create account**
```bash
# Check Supabase Auth settings
# Navigate to Authentication → Settings
# Ensure email confirmations are disabled for development
```

### Webhook Issues

**Problem: Stripe webhook returns 400**
```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

**Problem: RevenueCat webhook fails**
```bash
# Verify webhook secret in .env.local matches RevenueCat dashboard
# Check request logs in RevenueCat dashboard → Integrations → Webhooks
```

### Development Tips

- Enable detailed error logging by setting `ENABLE_ERROR_DETAILS=true`
- Use `npm run test:watch` during development to catch issues early
- Check Vercel logs for production errors: `vercel logs`
- Use Supabase dashboard SQL Editor to test queries directly
- Test webhooks locally with ngrok: `ngrok http 3000`

### Getting Help

If you're still stuck:

1. Check existing API endpoint tests in `__tests__/` for examples
2. Review the PRD: `PRD_BACKEND_STARTER_KIT.md`
3. Check Supabase logs in dashboard → Logs
4. Enable verbose logging in `next.config.js`
5. Search for similar issues in the repository

---

## Next Steps

Now that your backend is running, here's what to do next:

### For Development

1. **Customize the Item Entity** (see `types/item.ts`, `app/api/items/`)
   - Replace "items" with your domain entity (e.g., "tasks", "posts", "contacts")
   - Update database schema in `supabase/schema.sql`
   - Update validation schemas in `lib/validation/`

2. **Add Custom Endpoints**
   - Copy the pattern from `app/api/items/route.ts`
   - Use `withAuth` middleware for protected routes
   - Add Zod validation for request bodies
   - Write tests in `__tests__/`

3. **Configure Payments** (if needed)
   - Set up Stripe products and prices
   - Configure webhook endpoints
   - Test subscription flow end-to-end

### For Production

1. **Security Hardening**
   - Review and update CORS allowed origins
   - Set appropriate rate limits
   - Enable RLS policies on all tables
   - Rotate secrets regularly

2. **Monitoring**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Configure uptime monitoring
   - Set up alerts for failed webhooks

3. **Performance**
   - Add database indexes for frequently queried fields
   - Configure caching for expensive queries
   - Set up CDN for static assets

### Resources

| Resource | URL |
|----------|-----|
| Next.js App Router Docs | https://nextjs.org/docs/app |
| Supabase Documentation | https://supabase.com/docs |
| Vercel Deployment Docs | https://vercel.com/docs |
| Stripe API Reference | https://stripe.com/docs/api |
| RevenueCat Docs | https://docs.revenuecat.com |
| Zod Validation | https://zod.dev |

---

## License

This starter kit is provided as-is for building your own applications. Customize freely for your use case.
