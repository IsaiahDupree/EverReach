# EverReach App Kit Architecture

Complete architecture documentation for the EverReach App Kit - a production-ready starter kit with iOS (React Native/Expo), Backend (Next.js API), and Web (Next.js) templates.

## Table of Contents

- [System Overview Diagram](#system-overview-diagram)
- [Technology Stack](#technology-stack)
- [Three-Tier Architecture](#three-tier-architecture)
- [Authentication Flow](#authentication-flow)
- [Data Flow](#data-flow)
- [Payment and Subscription Flow](#payment-and-subscription-flow)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)
- [Scaling Considerations](#scaling-considerations)

---

## System Overview Diagram

The EverReach App Kit is built as a three-tier architecture with mobile clients (iOS), web clients, and a unified backend API, all connected to a Supabase database and payment providers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   iOS App       │  │   Web App       │  │   Admin Panel   │          │
│  │  (Expo/RN)      │  │  (Next.js)      │  │  (Next.js)      │          │
│  │                 │  │                 │  │                 │          │
│  │ • Auth screens  │  │ • Landing       │  │ • Analytics     │          │
│  │ • Tab nav       │  │ • Pricing       │  │ • User mgmt     │          │
│  │ • Items CRUD    │  │ • Dashboard     │  │ • Reports       │          │
│  │ • Subscriptions │  │ • Settings      │  │                 │          │
│  │ • Dark mode     │  │ • Billing       │  │                 │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
└───────────┼─────────────────────┼─────────────────────┼─────────────────┘
            │                     │                     │
            │        HTTPS / JWT Auth                   │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                     │
│                    (Vercel Serverless / Render)                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js API Routes                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │    Auth     │  │    Users    │  │    Items    │             │   │
│  │  │  Endpoints  │  │  Endpoints  │  │  Endpoints  │             │   │
│  │  │             │  │             │  │             │             │   │
│  │  │ • login     │  │ • profile   │  │ • list      │             │   │
│  │  │ • signup    │  │ • update    │  │ • create    │             │   │
│  │  │ • logout    │  │ • delete    │  │ • update    │             │   │
│  │  │ • refresh   │  │             │  │ • delete    │             │   │
│  │  │ • me        │  │             │  │ • search    │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │Subscription │  │   Upload    │  │  Webhooks   │             │   │
│  │  │  Endpoints  │  │  Endpoints  │  │  Handlers   │             │   │
│  │  │             │  │             │  │             │             │   │
│  │  │ • status    │  │ • files     │  │ • Stripe    │             │   │
│  │  │ • tiers     │  │ • avatars   │  │ • RevenueCat│             │   │
│  │  │ • checkout  │  │             │  │             │             │   │
│  │  │ • portal    │  │             │  │             │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐       │   │
│  │  │              Middleware Layer                        │       │   │
│  │  │  • JWT validation   • Rate limiting                  │       │   │
│  │  │  • CORS            • Input validation                │       │   │
│  │  │  • Error handling  • Request logging                 │       │   │
│  │  └─────────────────────────────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ PostgreSQL Protocol
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Supabase Platform                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │      Auth       │  │    Database     │  │    Storage      │  │   │
│  │  │                 │  │   (PostgreSQL)  │  │                 │  │   │
│  │  │ • Email/Pass    │  │                 │  │ • avatars/      │  │   │
│  │  │ • OAuth (Google)│  │ Tables:         │  │ • uploads/      │  │   │
│  │  │ • OAuth (Apple) │  │ • users         │  │ • documents/    │  │   │
│  │  │ • Magic Links   │  │ • items         │  │                 │  │   │
│  │  │ • JWT tokens    │  │ • subscriptions │  │ Policies:       │  │   │
│  │  │                 │  │ • profiles      │  │ • User access   │  │   │
│  │  │                 │  │                 │  │ • File size     │  │   │
│  │  │                 │  │ RLS Policies:   │  │                 │  │   │
│  │  │                 │  │ • User isolation│  │                 │  │   │
│  │  │                 │  │ • Role-based    │  │                 │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                       │   │
│  │  │    Realtime     │  │ Edge Functions  │                       │   │
│  │  │                 │  │                 │                       │   │
│  │  │ • Live updates  │  │ • Custom logic  │                       │   │
│  │  │ • Presence      │  │ • Scheduled jobs│                       │   │
│  │  │ • Broadcast     │  │                 │                       │   │
│  │  └─────────────────┘  └─────────────────┘                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Webhooks
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PAYMENT PROVIDERS                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │         Stripe              │  │       RevenueCat            │       │
│  │    (Web Payments)           │  │   (Mobile Payments)         │       │
│  │                             │  │                             │       │
│  │ • Checkout sessions         │  │ • iOS App Store IAP         │       │
│  │ • Subscription management   │  │ • Google Play IAP           │       │
│  │ • Customer portal           │  │ • Cross-platform sync       │       │
│  │ • Webhooks (events)         │  │ • Webhooks (events)         │       │
│  │ • Payment methods           │  │ • Entitlements              │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Technologies

| Component | Technology | Purpose | Why Chosen |
|-----------|-----------|---------|------------|
| **iOS Mobile** | React Native + Expo | Native mobile app | Cross-platform, OTA updates, managed workflow |
| **Web App** | Next.js 14 App Router | Web frontend | SSR, SEO, modern React patterns |
| **UI Framework** | Tailwind CSS + shadcn/ui | Styling & components | Utility-first CSS, accessible components |
| **State Management** | React Query (TanStack Query) | Server state & caching | Automatic caching, refetching, optimistic updates |
| **Navigation (iOS)** | Expo Router | File-based routing | Deep linking, type-safe navigation |
| **Navigation (Web)** | Next.js App Router | File-based routing | SSR, layouts, route groups |
| **Forms** | React Hook Form | Form handling | Performance, validation, minimal re-renders |
| **Validation** | Zod | Schema validation | Type inference, runtime validation |
| **Theme** | next-themes (Web), Context (iOS) | Dark mode | System preference detection, persistence |

### Backend Technologies

| Component | Technology | Purpose | Why Chosen |
|-----------|-----------|---------|------------|
| **API Framework** | Next.js API Routes | REST API endpoints | Serverless, TypeScript, easy deployment |
| **Runtime** | Node.js 18+ | Server execution | LTS, modern features, Vercel optimized |
| **Authentication** | Supabase Auth | User management | Built-in OAuth, JWT, magic links |
| **Middleware** | Custom middleware | Auth, CORS, rate limit | Request processing, security |
| **Validation** | Zod | Input validation | Type-safe schemas, error messages |
| **Error Handling** | Custom error util | Consistent errors | Standard format, logging |

### Database & Storage

| Component | Technology | Purpose | Why Chosen |
|-----------|-----------|---------|------------|
| **Database** | Supabase PostgreSQL | Primary data store | Managed PostgreSQL, real-time, RLS |
| **ORM** | Supabase Client | Database queries | Generated types, real-time subscriptions |
| **File Storage** | Supabase Storage | Avatars, uploads | S3-compatible, RLS policies, CDN |
| **Caching** | React Query | Client-side cache | Automatic invalidation, background refetch |

### Payment Technologies

| Component | Technology | Purpose | Why Chosen |
|-----------|-----------|---------|------------|
| **Web Payments** | Stripe | Credit card processing | Best-in-class API, webhooks, portal |
| **Mobile Payments** | RevenueCat | iOS/Android IAP | Handles App Store/Play Store complexity |
| **Webhook Processing** | Next.js API Routes | Payment event handling | Serverless, automatic scaling |

### DevOps & Deployment

| Component | Technology | Purpose | Why Chosen |
|-----------|-----------|---------|------------|
| **Backend Hosting** | Vercel | API deployment | Zero-config, edge network, auto-scaling |
| **Web Hosting** | Vercel | Static + SSR hosting | Same platform as API, preview deploys |
| **iOS Distribution** | EAS (Expo App Services) | Build & deploy iOS app | Managed builds, OTA updates |
| **CI/CD** | GitHub Actions | Automated testing | Free for public repos, flexible |
| **Monitoring** | Vercel Analytics | Performance tracking | Built-in, real user monitoring |

---

## Three-Tier Architecture

### 1. iOS Starter Kit (Mobile Client)

**Directory**: `ios-starter/`

**Tech Stack**: React Native, Expo, Expo Router, Supabase Client, RevenueCat

**Key Features**:
- File-based navigation with Expo Router
- Email/password authentication + OAuth (Google, Apple)
- Tab navigation (Home, Search, Settings)
- Items list and detail screens with CRUD operations
- Subscription paywall with RevenueCat integration
- User profile management
- Dark mode support with ThemeProvider
- Secure storage for tokens (expo-secure-store)
- DevMode overlay for developer guidance

**Project Structure**:
```
ios-starter/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth stack (login, signup, forgot-password)
│   ├── (tabs)/            # Tab navigation (home, search, settings)
│   ├── item/[id].tsx      # Item detail (dynamic route)
│   ├── profile.tsx        # Profile screen
│   ├── paywall.tsx        # Subscription paywall
│   └── _layout.tsx        # Root layout with providers
├── components/            # React components
│   ├── auth/             # OAuth buttons
│   ├── common/           # Button, Input, Card, LoadingSpinner
│   ├── items/            # ItemCard, ItemForm
│   └── dev/              # DevModeOverlay
├── hooks/                # Custom hooks
│   ├── useAuth.ts        # Auth state and methods
│   ├── useItems.ts       # Items CRUD with React Query
│   ├── useUser.ts        # User profile operations
│   └── useSubscription.ts # Subscription status
├── lib/                  # Core utilities
│   ├── supabase.ts       # Supabase client setup
│   └── revenuecat.ts     # RevenueCat SDK setup
├── providers/            # Context providers
│   ├── AuthProvider.tsx  # Auth context
│   └── ThemeProvider.tsx # Theme context
├── types/                # TypeScript types
│   ├── item.ts
│   ├── user.ts
│   └── subscription.ts
└── constants/            # Configuration
    ├── colors.ts         # Theme colors
    └── config.ts         # App config (DEV_MODE, API URLs)
```

**Timeline**: 6-10 days to customize

### 2. Backend Starter Kit (API Server)

**Directory**: `backend-kit/`

**Tech Stack**: Next.js API Routes, Supabase (server), Stripe, RevenueCat webhooks

**Key Features**:
- RESTful API endpoints for auth, users, items, subscriptions
- JWT authentication middleware
- Supabase server-side client with service role
- Rate limiting per user and per IP
- CORS configuration for allowed origins
- Input validation with Zod schemas
- Stripe webhook handler for web subscriptions
- RevenueCat webhook handler for mobile subscriptions
- File upload endpoint with Supabase Storage
- Health check endpoint
- Consistent error handling

**Project Structure**:
```
backend-kit/
├── app/api/              # API routes
│   ├── auth/            # Authentication endpoints
│   │   ├── login/route.ts
│   │   ├── signup/route.ts
│   │   ├── logout/route.ts
│   │   ├── refresh/route.ts
│   │   ├── me/route.ts
│   │   └── forgot-password/route.ts
│   ├── users/           # User management
│   │   └── profile/route.ts (GET, PUT, DELETE)
│   ├── items/           # Items CRUD
│   │   ├── route.ts (GET list, POST create)
│   │   ├── [id]/route.ts (GET, PUT, DELETE)
│   │   └── search/route.ts
│   ├── subscriptions/   # Subscription management
│   │   ├── status/route.ts
│   │   ├── tiers/route.ts
│   │   ├── checkout/route.ts
│   │   └── portal/route.ts
│   ├── webhooks/        # Payment webhooks
│   │   ├── stripe/route.ts
│   │   └── revenuecat/route.ts
│   ├── upload/route.ts  # File uploads
│   └── health/route.ts  # Health check
├── lib/                 # Core libraries
│   ├── supabase/       # Supabase clients
│   │   ├── server.ts   # Server client
│   │   └── admin.ts    # Admin client (service role)
│   ├── auth/
│   │   └── middleware.ts # withAuth middleware
│   ├── utils/
│   │   ├── cors.ts     # CORS helper
│   │   ├── errors.ts   # Error responses
│   │   ├── rate-limit.ts # Rate limiting
│   │   └── validation.ts # Zod helpers
│   └── validation/
│       └── item.ts      # Item schemas
├── types/               # TypeScript types
│   ├── api.ts
│   ├── database.ts
│   └── webhooks.ts
└── supabase/            # Database
    └── schema.sql       # Database schema
```

**Timeline**: 4-5 days to customize

### 3. Web Starter Kit (Web Frontend)

**Directory**: `web-kit/`

**Tech Stack**: Next.js 14, Tailwind CSS, shadcn/ui, React Query, Stripe

**Key Features**:
- Marketing pages (landing, pricing)
- Dashboard with sidebar navigation
- Items list with data table and pagination
- Item detail page with edit/delete
- User settings and profile management
- Billing page with Stripe checkout
- Authentication pages (login, signup)
- Dark mode with next-themes
- SEO optimization (metadata, sitemap, robots.txt)
- Stripe webhook handler
- Server and client Supabase clients
- Auth middleware for protected routes

**Project Structure**:
```
web-kit/
├── app/                  # App Router pages
│   ├── (marketing)/     # Marketing layout
│   │   ├── page.tsx     # Landing page
│   │   └── pricing/page.tsx
│   ├── (dashboard)/     # Dashboard layout
│   │   ├── dashboard/page.tsx
│   │   ├── items/
│   │   │   ├── page.tsx      # Items list
│   │   │   └── [id]/page.tsx # Item detail
│   │   └── settings/
│   │       ├── page.tsx       # Settings
│   │       └── billing/page.tsx # Billing
│   ├── (auth)/          # Auth layout
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── api/             # API routes
│   │   └── stripe/webhook/route.ts
│   ├── layout.tsx       # Root layout
│   ├── sitemap.ts       # Sitemap generation
│   └── robots.ts        # Robots.txt
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Navbar, Sidebar, Footer
│   ├── billing/        # PricingCards, CheckoutButton
│   ├── providers/      # QueryProvider, ThemeProvider
│   └── theme-toggle.tsx
├── hooks/              # React Query hooks
│   ├── use-auth.ts
│   ├── use-items.ts
│   └── use-subscription.ts
├── lib/                # Utilities
│   ├── supabase/       # Supabase clients
│   │   ├── client.ts   # Browser client
│   │   └── server.ts   # Server client
│   └── stripe/
│       └── client.ts   # Stripe.js client
├── config/             # Configuration
│   ├── site.ts         # Site metadata
│   └── nav.ts          # Navigation config
├── types/              # TypeScript types
└── middleware.ts       # Auth middleware
```

**Timeline**: 5-6 days to customize

---

## Authentication Flow

The authentication system uses Supabase Auth with JWT tokens, supporting multiple authentication methods.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Authentication Flow                                 │
└─────────────────────────────────────────────────────────────────────────┘

USER ACTION: Enter email & password → Tap "Login"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT (iOS App or Web App)                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  1. Form Validation                                                │  │
│  │     • Email format check                                           │  │
│  │     • Password minimum length                                      │  │
│  │     • Display inline errors                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  2. API Call                                                       │  │
│  │     POST /api/auth/login                                           │  │
│  │     {                                                              │  │
│  │       "email": "user@example.com",                                 │  │
│  │       "password": "hashed_password"                                │  │
│  │     }                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API (Next.js)                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  3. Input Validation (Zod)                                         │  │
│  │     • Validate email format                                        │  │
│  │     • Validate password is present                                 │  │
│  │     • Return 400 if invalid                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  4. Supabase Auth Call                                             │  │
│  │     const { data, error } =                                        │  │
│  │       await supabase.auth.signInWithPassword({                     │  │
│  │         email, password                                            │  │
│  │       })                                                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPABASE (Auth Service)                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  5. Verify Credentials                                             │  │
│  │     • Look up user by email                                        │  │
│  │     • Compare password hash (bcrypt)                               │  │
│  │     • Check if email is confirmed                                  │  │
│  │     • Check if account is locked                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  6. Generate JWT Tokens                                            │  │
│  │     • access_token (expires in 1 hour)                             │  │
│  │     • refresh_token (expires in 30 days)                           │  │
│  │     • Include user metadata in claims                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ Return tokens
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  7. Return Response                                                │  │
│  │     {                                                              │  │
│  │       "access_token": ${PRESERVATION_RUNTIME_SECRET}  │  │
│  │       "refresh_token": "v2.local...",                              │  │
│  │       "user": {                                                    │  │
│  │         "id": "uuid",                                              │  │
│  │         "email": "user@example.com"                                │  │
│  │       }                                                            │  │
│  │     }                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP 200
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT                                                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  8. Store Tokens Securely                                          │  │
│  │     iOS: SecureStore.setItemAsync('access_token', token)           │  │
│  │     Web: Cookie (httpOnly for refresh_token)                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  9. Update Auth Context                                            │  │
│  │     • Set user in context/state                                    │  │
│  │     • Set loading to false                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  10. Navigate to Dashboard                                         │  │
│  │     router.push('/(tabs)')  // iOS                                 │  │
│  │     router.push('/dashboard')  // Web                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

SUBSEQUENT REQUESTS: Include access_token in Authorization header

┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT → API Request                                                   │
│  GET /api/items                                                         │
│  Headers:                                                               │
│    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...       │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API (withAuth Middleware)                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  1. Extract token from Authorization header                        │  │
│  │  2. Verify JWT signature with Supabase                             │  │
│  │  3. Check expiration (if expired, return 401)                      │  │
│  │  4. Attach user to request object                                  │  │
│  │  5. Continue to route handler                                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

TOKEN REFRESH: When access_token expires

┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT detects 401 Unauthorized                                        │
│  │                                                                       │
│  ▼                                                                       │
│  POST /api/auth/refresh                                                 │
│  Body: { refresh_token }                                                │
│  │                                                                       │
│  ▼                                                                       │
│  BACKEND calls supabase.auth.refreshSession()                           │
│  │                                                                       │
│  ▼                                                                       │
│  Returns new access_token and refresh_token                             │
│  │                                                                       │
│  ▼                                                                       │
│  CLIENT stores new tokens and retries original request                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Supported Auth Methods**:
- Email/Password (primary method)
- OAuth: Google Sign-In
- OAuth: Apple Sign In (iOS only)
- Magic Links (passwordless email)

**Security Features**:
- JWT tokens with 1-hour expiration
- Refresh tokens for session persistence
- Secure token storage (SecureStore on iOS, httpOnly cookies on web)
- Row Level Security (RLS) policies enforce user isolation
- Rate limiting on login endpoint to prevent brute force
- HTTPS-only communication
- CSRF protection on web

---

## Data Flow

The data flow pattern is consistent across all entities (items, users, subscriptions). Here's an example using the Items CRUD flow.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Data Flow: Creating an Item                          │
└─────────────────────────────────────────────────────────────────────────┘

USER ACTION: Fill form → Tap "Create Item"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT (React Query Mutation)                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  const { mutate } = useCreateItem()                                │  │
│  │                                                                    │  │
│  │  mutate({                                                          │  │
│  │    title: "New Item",                                              │  │
│  │    description: "Item description",                                │  │
│  │    category: "work"                                                │  │
│  │  })                                                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Optimistic Update (Optional)                                      │  │
│  │  • Add item to cache immediately                                   │  │
│  │  • Show in UI with pending state                                   │  │
│  │  • Will rollback if request fails                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  HTTP Request                                                      │  │
│  │  POST /api/items                                                   │  │
│  │  Headers:                                                          │  │
│  │    Authorization: Bearer {access_token}                            │  │
│  │    Content-Type: application/json                                  │  │
│  │  Body:                                                             │  │
│  │    { title, description, category }                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API (/api/items/route.ts POST handler)                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  1. withAuth Middleware                                            │  │
│  │     • Validate JWT token                                           │  │
│  │     • Extract user.id from token                                   │  │
│  │     • Attach to request                                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  2. Rate Limiting                                                  │  │
│  │     • Check user's request count                                   │  │
│  │     • Return 429 if exceeded                                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  3. Input Validation (Zod)                                         │  │
│  │     const CreateItemSchema = z.object({                            │  │
│  │       title: z.string().min(1).max(100),                           │  │
│  │       description: z.string().optional(),                          │  │
│  │       category: z.enum(['work', 'personal'])                       │  │
│  │     })                                                             │  │
│  │                                                                    │  │
│  │     • Return 400 with errors if invalid                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  4. Database Insert                                                │  │
│  │     const { data, error } =                                        │  │
│  │       await supabase                                               │  │
│  │         .from('items')                                             │  │
│  │         .insert({                                                  │  │
│  │           ...validatedData,                                        │  │
│  │           user_id: request.user.id,                                │  │
│  │           created_at: new Date()                                   │  │
│  │         })                                                         │  │
│  │         .select()                                                  │  │
│  │         .single()                                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPABASE DATABASE                                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  5. Row Level Security (RLS) Check                                 │  │
│  │     • Policy: "Users can insert their own items"                   │  │
│  │     • Verify user_id matches authenticated user                    │  │
│  │     • Allow insert if policy passes                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  6. Insert Row                                                     │  │
│  │     INSERT INTO items (id, user_id, title, description, ...)      │  │
│  │     VALUES (uuid_generate_v4(), ?, ?, ?, ...)                      │  │
│  │     RETURNING *                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  7. Return Created Row                                             │  │
│  │     {                                                              │  │
│  │       id: "uuid-123",                                              │  │
│  │       user_id: "user-uuid",                                        │  │
│  │       title: "New Item",                                           │  │
│  │       description: "Item description",                             │  │
│  │       category: "work",                                            │  │
│  │       created_at: "2024-01-20T12:00:00Z"                           │  │
│  │     }                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  8. Return Response                                                │  │
│  │     return NextResponse.json(data, { status: 201 })                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP 201
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT (React Query)                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  9. onSuccess Callback                                             │  │
│  │     • Update cache with server response                            │  │
│  │     • Invalidate 'items' query to refetch                          │  │
│  │     • Show success toast                                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  10. UI Update                                                     │  │
│  │     • New item appears in list                                     │  │
│  │     • Form resets                                                  │  │
│  │     • Modal closes (if applicable)                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

READING DATA (GET /api/items):

CLIENT → GET /api/items?page=1&limit=20
   │
   ▼
BACKEND → withAuth middleware → Supabase query with RLS
   │
   ▼
DATABASE → Enforces RLS: WHERE user_id = authenticated_user_id
   │
   ▼
BACKEND → Returns { items: [...], total, page }
   │
   ▼
CLIENT → React Query caches data → UI renders list

UPDATING DATA (PUT /api/items/:id):

CLIENT → PUT /api/items/uuid-123 with updated fields
   │
   ▼
BACKEND → Validate ID and input → Supabase update
   │
   ▼
DATABASE → RLS checks ownership → Updates if authorized
   │
   ▼
CLIENT → Invalidates cache → Refetches → UI updates

DELETING DATA (DELETE /api/items/:id):

CLIENT → DELETE /api/items/uuid-123
   │
   ▼
BACKEND → Validate ID → Supabase delete
   │
   ▼
DATABASE → RLS checks ownership → Deletes if authorized
   │
   ▼
CLIENT → Removes from cache → UI updates immediately
```

**Key Principles**:
1. **JWT Authentication**: Every API request includes JWT token in Authorization header
2. **Row Level Security**: Database enforces user isolation at the data layer
3. **Optimistic Updates**: UI updates immediately, rolls back on failure
4. **Cache Invalidation**: React Query automatically refetches stale data
5. **Type Safety**: Zod schemas validate input, TypeScript ensures type correctness
6. **Error Handling**: Consistent error format across all endpoints

---

## Payment and Subscription Flow

The app supports two payment providers: **Stripe** (for web) and **RevenueCat** (for iOS/Android mobile).

```
┌─────────────────────────────────────────────────────────────────────────┐
│               Payment Flow: Web (Stripe) vs Mobile (RevenueCat)         │
└─────────────────────────────────────────────────────────────────────────┘

USER ACTION: View pricing → Select "Pro Plan" → Tap "Subscribe"
    │
    ├─── [WEB FLOW] ───────────────┐
    │                               │
    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  WEB CLIENT                 │   │  MOBILE CLIENT              │
│  (Stripe Checkout)          │   │  (RevenueCat)               │
└─────────────────────────────┘   └─────────────────────────────┘

═══════════════════════════════   ═══════════════════════════════
     WEB FLOW (Stripe)                 MOBILE FLOW (RevenueCat)
═══════════════════════════════   ═══════════════════════════════

1. Create Checkout Session           1. Fetch Offerings
   │                                     │
   POST /api/subscriptions/checkout     RevenueCat.getOfferings()
   Body: { priceId: "price_123" }       │
   │                                     ▼
   ▼                                  2. Show Paywall
2. Backend calls Stripe API              │
   stripe.checkout.sessions.create({     Available packages displayed
     customer: stripeCustomerId,          │
     line_items: [{ price: priceId }],    ▼
     mode: 'subscription',             3. Purchase Package
     success_url: '/success',             │
     cancel_url: '/pricing'               RevenueCat.purchasePackage(pkg)
   })                                     │
   │                                      ▼
   ▼                                   4. Native Payment Sheet
3. Return Checkout URL                   │
   { url: "https://checkout.stripe..."  iOS: StoreKit payment sheet
   │                                     Android: Google Play billing
   ▼                                     │
4. Redirect to Stripe                    ▼
   │                                   5. User Confirms Payment
   User enters card info                 │
   Stripe processes payment              Apple/Google processes payment
   │                                     │
   ▼                                      ▼
5. Stripe Webhook Fires               6. RevenueCat Receives Event
   │                                     │
   POST /api/webhooks/stripe             RevenueCat webhook fires
   Event: checkout.session.completed     │
   │                                      ▼
   ▼                                   7. Webhook to Backend
6. Backend Updates Database               │
   │                                     POST /api/webhooks/revenuecat
   Verify webhook signature              Event type: INITIAL_PURCHASE
   │                                     │
   const { customer, subscription } =    ▼
     event.data.object                 8. Backend Updates Database
   │                                     │
   UPDATE subscriptions                  Verify RevenueCat signature
   SET                                   │
     tier = 'pro',                       const { app_user_id, product_id,
     stripe_subscription_id = id,          entitlements } = event
     status = 'active',                  │
     current_period_end = ...            UPDATE subscriptions
   WHERE                                 SET
     user_id = customer.metadata.userId    tier = 'pro',
   │                                       revenuecat_subscriber_id = id,
   ▼                                       status = 'active',
7. Redirect User to Success Page          entitlements = ...
   │                                     WHERE
   User sees confirmation                  user_id = app_user_id
   │                                     │
   ▼                                      ▼
8. Client Fetches Updated Status       9. Client Refetches Status
   │                                     │
   GET /api/subscriptions/status         GET /api/subscriptions/status
   Returns: { tier: 'pro', ... }         Returns: { tier: 'pro', ... }
   │                                     │
   ▼                                      ▼
9. UI Updates                          10. UI Updates
   Premium features unlocked             Premium features unlocked

═══════════════════════════════   ═══════════════════════════════
```

### Subscription Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Subscription State Management                       │
└─────────────────────────────────────────────────────────────────────────┘

DATABASE: subscriptions table

columns:
  - id (uuid)
  - user_id (uuid, FK to users)
  - tier (enum: 'free', 'pro', 'premium')
  - status (enum: 'active', 'canceled', 'past_due', 'trialing')
  - stripe_subscription_id (text, nullable)
  - stripe_customer_id (text, nullable)
  - revenuecat_subscriber_id (text, nullable)
  - current_period_start (timestamp)
  - current_period_end (timestamp)
  - cancel_at_period_end (boolean)
  - created_at (timestamp)
  - updated_at (timestamp)

RLS Policies:
  - Users can SELECT their own subscription
  - Only backend (service role) can INSERT/UPDATE

WEBHOOK EVENTS HANDLED:

Stripe:
  ✓ checkout.session.completed    → Create/activate subscription
  ✓ customer.subscription.updated → Update tier/status
  ✓ customer.subscription.deleted → Cancel subscription
  ✓ invoice.payment_failed        → Mark past_due

RevenueCat:
  ✓ INITIAL_PURCHASE              → Create subscription
  ✓ RENEWAL                       → Update expiration
  ✓ CANCELLATION                  → Mark for cancellation
  ✓ EXPIRATION                    → Set status to canceled
  ✓ PRODUCT_CHANGE                → Update tier

CLIENT CHECKS:

const { data: subscription } = useSubscription()

if (subscription.tier === 'pro' || subscription.tier === 'premium') {
  // Show premium features
} else {
  // Show paywall or limit features
}
```

### Billing Portal (Web Only)

```
USER → Clicks "Manage Billing"
   │
   ▼
POST /api/subscriptions/portal
   │
   ▼
BACKEND → stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: '/settings/billing'
})
   │
   ▼
REDIRECT to Stripe Billing Portal
   │
   User can:
   • Update payment method
   • Cancel subscription
   • View invoices
   • Download receipts
   │
   ▼
Changes sync via webhooks
```

### Restore Purchases (Mobile Only)

```
USER → Taps "Restore Purchases"
   │
   ▼
RevenueCat.restorePurchases()
   │
   ▼
RevenueCat checks with Apple/Google
   │
   ▼
Returns current entitlements
   │
   ▼
APP updates local state
   │
   ▼
UI shows restored subscription
```

---

## Deployment Architecture

### Production Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION INFRASTRUCTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────┐
│   END USERS   │
└───────┬───────┘
        │
        ├──── [iOS App] ─────────────────────────────────────┐
        │                                                     │
        │                                                     ▼
        │                                            ┌─────────────────┐
        │                                            │  App Store      │
        │                                            │                 │
        │                                            │  Built with EAS │
        │                                            │  Version: 1.0.x │
        │                                            │  OTA Updates    │
        │                                            └─────────────────┘
        │
        ├──── [Web App] ──────────────────────────────────────┐
        │                                                      │
        │                                                      ▼
        │                                             ┌─────────────────┐
        │                                             │ Vercel (Web)    │
        │                                             │                 │
        │                                             │ Edge Network    │
        │                                             │ SSR + Static    │
        │                                             │ Custom domain   │
        │                                             └─────────────────┘
        │
        └──── [API Requests] ─────────────────────────────────┐
                                                               │
                                                               ▼
                                                     ┌─────────────────┐
                                                     │ Vercel (API)    │
                                                     │                 │
                                                     │ Serverless Fns  │
                                                     │ Auto-scaling    │
                                                     │ Edge Functions  │
                                                     └────────┬────────┘
                                                              │
                  ┌───────────────────────────────────────────┼────────┐
                  │                                           │        │
                  ▼                                           ▼        ▼
         ┌─────────────────┐                        ┌─────────────────────┐
         │    Supabase     │                        │  Payment Providers  │
         │                 │                        │                     │
         │ • PostgreSQL    │                        │  ┌───────────────┐  │
         │ • Auth          │                        │  │    Stripe     │  │
         │ • Storage       │                        │  │  (Web Subs)   │  │
         │ • Realtime      │                        │  └───────────────┘  │
         │                 │                        │                     │
         │ Region: US-East │                        │  ┌───────────────┐  │
         │ Backup: Daily   │                        │  │  RevenueCat   │  │
         └─────────────────┘                        │  │ (Mobile Subs) │  │
                                                    │  └───────────────┘  │
                                                    └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            DEPLOYMENT WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

IOS APP (Expo EAS):

  Developer → git push → GitHub
      │
      ▼
  GitHub Actions (CI)
      │
      ├─ Run tests
      ├─ Type check
      └─ Linting
      │
      ▼
  EAS Build (if tests pass)
      │
      ├─ eas build --platform ios --profile production
      ├─ Compiles native code
      ├─ Uploads to Apple TestFlight
      │
      ▼
  Manual Review & Submit
      │
      └─ Review in App Store Connect
         Submit for review
         │
         ▼
      App Store (Live)

  OTA Updates (for JS changes only):
      │
      eas update --branch production
      │
      ▼
  Users get updates without App Store review

WEB APP (Vercel):

  Developer → git push → GitHub
      │
      ▼
  Vercel (Auto-deploy)
      │
      ├─ Detects push to main branch
      ├─ Builds Next.js app
      ├─ Runs tests
      ├─ Optimizes assets
      ├─ Generates static pages
      │
      ▼
  Deploy to Edge Network
      │
      ├─ Deploy to 70+ edge locations
      ├─ Update DNS
      ├─ Issue SSL certificate
      │
      ▼
  Live (https://your-domain.com)

BACKEND API (Vercel Serverless):

  Developer → git push → GitHub
      │
      ▼
  Vercel (Auto-deploy)
      │
      ├─ Builds API routes
      ├─ Creates serverless functions
      ├─ Sets environment variables
      │
      ▼
  Deploy to Edge Network
      │
      └─ Each API route is a separate function
         Auto-scales based on traffic
         │
         ▼
  Live (https://api.your-domain.com)

DATABASE (Supabase):

  Migrations managed manually or via Supabase CLI

  Local → Write migration SQL
      │
      ▼
  supabase db push
      │
      ▼
  Production database updated
      │
      ▼
  Run seed data if needed
```

### Environment Variables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENT CONFIGURATION                         │
└─────────────────────────────────────────────────────────────────────────┘

IOS APP (.env):
  EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY}
  EXPO_PUBLIC_API_URL=https://api.your-domain.com
  EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=rcb_xxx
  DEV_MODE=false (production)

WEB APP (.env.local):
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
  NEXT_PUBLIC_API_URL=https://api.your-domain.com

BACKEND API (.env - Vercel):
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
  SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY} (secret!)
  STRIPE_SECRET_KEY=sk_live_xxx (secret!)
  STRIPE_WEBHOOK_SECRET=whsec_xxx (secret!)
  REVENUECAT_WEBHOOK_SECRET=xxx (secret!)
  ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
  NODE_ENV=production

Stored in:
  • iOS: eas.json (secrets) + .env (public)
  • Web: Vercel Dashboard (secrets) + .env.local (local dev)
  • Backend: Vercel Dashboard (all secrets)
```

### Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MONITORING STACK                                │
└─────────────────────────────────────────────────────────────────────────┘

APPLICATION MONITORING:

  Vercel Analytics
    ├─ Real User Monitoring (RUM)
    ├─ Core Web Vitals
    ├─ Page load times
    └─ API response times

  Sentry (optional)
    ├─ Error tracking
    ├─ Performance monitoring
    ├─ Session replay
    └─ Release tracking

DATABASE MONITORING:

  Supabase Dashboard
    ├─ Database size
    ├─ Active connections
    ├─ Query performance
    ├─ Storage usage
    └─ API usage

PAYMENT MONITORING:

  Stripe Dashboard
    ├─ Revenue tracking
    ├─ Failed payments
    ├─ Churn rate
    └─ MRR/ARR

  RevenueCat Dashboard
    ├─ Active subscribers
    ├─ Trial conversions
    ├─ Revenue per user
    └─ Retention cohorts

UPTIME MONITORING:

  Vercel Status Page
    └─ Uptime percentage
        Edge network status

  Custom Health Check
    └─ GET /api/health
        Returns database status
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────┘

Layer 1: TRANSPORT SECURITY
  ┌────────────────────────────────────────────────────┐
  │  HTTPS / TLS 1.3                                   │
  │  • All traffic encrypted in transit                │
  │  • Automatic certificate management (Vercel)       │
  │  • HSTS headers enabled                            │
  │  • Certificate pinning (mobile app)                │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Layer 2: AUTHENTICATION
  ┌────────────────────────────────────────────────────┐
  │  JWT Tokens (Supabase Auth)                        │
  │  • Access token expires in 1 hour                  │
  │  • Refresh token expires in 30 days                │
  │  • Tokens signed with HS256 algorithm              │
  │  • User ID and metadata in claims                  │
  │  • Secure storage on client (SecureStore/cookies)  │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Layer 3: AUTHORIZATION
  ┌────────────────────────────────────────────────────┐
  │  Row Level Security (RLS)                          │
  │  • Database-enforced access control                │
  │  • Users can only access their own data            │
  │  • Policies checked on every query                 │
  │  • Cannot be bypassed by API                       │
  │                                                    │
  │  Example Policy:                                   │
  │  CREATE POLICY "Users can read own items"          │
  │  ON items FOR SELECT                               │
  │  USING (auth.uid() = user_id);                     │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Layer 4: INPUT VALIDATION
  ┌────────────────────────────────────────────────────┐
  │  Zod Schemas + SQL Parameterization                │
  │  • All inputs validated against schemas            │
  │  • Type coercion and sanitization                  │
  │  • SQL injection prevention (parameterized queries)│
  │  • XSS prevention (React escapes by default)       │
  │  • CSRF protection (SameSite cookies)              │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Layer 5: RATE LIMITING
  ┌────────────────────────────────────────────────────┐
  │  Per-User and Per-IP Limits                        │
  │  • Login: 5 attempts per 15 minutes                │
  │  • API: 100 requests per minute per user           │
  │  • Webhooks: Verify signatures                     │
  │  • 429 response when exceeded                      │
  └────────────────────────────────────────────────────┘
                      │
                      ▼
Layer 6: SECRETS MANAGEMENT
  ┌────────────────────────────────────────────────────┐
  │  Environment Variables                             │
  │  • Secrets never in code                           │
  │  • Service role key only on backend                │
  │  • Webhook secrets validated                       │
  │  • API keys rotated regularly                      │
  └────────────────────────────────────────────────────┘
```

### Threat Mitigation

| Threat | Mitigation | Implementation |
|--------|-----------|----------------|
| **SQL Injection** | Parameterized queries | Supabase client uses prepared statements |
| **XSS** | Output escaping | React escapes by default, DOMPurify for HTML |
| **CSRF** | SameSite cookies | Refresh token cookies set with SameSite=Lax |
| **Brute Force** | Rate limiting | Login endpoint limited to 5 attempts/15min |
| **Token Theft** | Short expiration | Access token expires in 1 hour |
| **MITM** | HTTPS only | Strict-Transport-Security header |
| **Unauthorized Access** | RLS policies | Database enforces user isolation |
| **Data Leaks** | Environment vars | Secrets in Vercel/EAS, not in code |

---

## Scaling Considerations

### Current Capacity (Free Tiers)

| Resource | Limit | When to Upgrade |
|----------|-------|----------------|
| **Supabase Free** | 500 MB database, 1 GB file storage | ~10K users or 400 MB used |
| **Vercel Hobby** | 100 GB bandwidth, 100 GB-hrs compute | ~50K requests/day |
| **RevenueCat** | Free up to $2.5K MRR | When MRR > $2.5K/month |
| **Stripe** | No limits, pay per transaction | N/A (scales automatically) |

### Scaling Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SCALING ROADMAP                                 │
└─────────────────────────────────────────────────────────────────────────┘

Stage 1: MVP (0-1K users) [Current State]
  ├─ Supabase Free Tier
  ├─ Vercel Hobby
  ├─ RevenueCat Free
  └─ Cost: ~$0/month

Stage 2: Early Growth (1K-10K users)
  ├─ Supabase Pro ($25/mo)
  │   • 8 GB database
  │   • 100 GB file storage
  │   • Daily backups
  │
  ├─ Vercel Pro ($20/mo)
  │   • 1 TB bandwidth
  │   • Unlimited team members
  │   • Custom domains
  │
  ├─ RevenueCat Starter ($250/mo above $2.5K MRR)
  │
  └─ Cost: ~$300-500/month

Stage 3: Scale (10K-100K users)
  ├─ Supabase Team ($599/mo)
  │   • 50 GB database
  │   • Point-in-time recovery
  │   • Read replicas
  │
  ├─ Vercel Enterprise
  │   • Dedicated support
  │   • SLA guarantees
  │   • Advanced analytics
  │
  ├─ Add Redis Cache (Upstash)
  │   • Cache frequently accessed data
  │   • Session storage
  │   • Rate limiting state
  │
  ├─ CDN for assets (Cloudflare)
  │   • Image optimization
  │   • Edge caching
  │
  └─ Cost: ~$2K-5K/month

Stage 4: Enterprise (100K+ users)
  ├─ Dedicated Supabase instance
  ├─ Vercel Enterprise with SLA
  ├─ Multiple database read replicas
  ├─ Microservices architecture
  ├─ Dedicated DevOps team
  └─ Cost: Custom pricing
```

### Performance Optimization

| Metric | Target | Optimization Strategy |
|--------|--------|----------------------|
| **API Response Time** | < 200ms p95 | Add Redis caching, optimize queries, use indexes |
| **Page Load Time** | < 2s FCP | Code splitting, image optimization, lazy loading |
| **Database Query Time** | < 50ms | Add indexes, use EXPLAIN ANALYZE, denormalize if needed |
| **Build Time** | < 5 min | Incremental builds, caching dependencies |
| **Bundle Size (iOS)** | < 50 MB | Remove unused dependencies, use Hermes |
| **Bundle Size (Web)** | < 1 MB JS | Code splitting, tree shaking, compress |

---

## Next Steps

For detailed implementation guides, see:
- [Backend Setup Guide](./backend-kit/README.md)
- [Web Starter Guide](./web-kit/README.md)
- [iOS Starter Guide](./ios-starter/README.md)
- [Developer Handoff](./DEVELOPER_HANDOFF.md)

For specific topics:
- [Database Schema & Migrations](./backend-kit/supabase/MIGRATIONS.md)
- [Authentication Setup](./docs/05-AUTHENTICATION.md)
- [Payment Integration](./docs/06-PAYMENTS.md)
- [Deployment Guide](./docs/07-DEPLOYMENT.md)
