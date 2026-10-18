# Architecture Overview

## How Everything Connects

This guide explains the complete system architecture, why each piece exists, and how data flows through the application.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   iOS App    │  │  Android App │  │    Web App   │              │
│  │ (React Native)│  │(React Native)│  │ (Expo Web)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └─────────────────┼──────────────────┘                       │
│                           │                                          │
│                    ┌──────▼───────┐                                  │
│                    │  Expo Router │  ← File-based navigation         │
│                    │  + React Query│  ← Data fetching & caching      │
│                    └──────┬───────┘                                  │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ HTTPS API Calls
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Vercel Serverless                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ /api/auth   │  │ /api/users  │  │ /api/contacts│         │   │
│  │  │             │  │             │  │              │         │   │
│  │  │ - login     │  │ - profile   │  │ - CRUD       │         │   │
│  │  │ - register  │  │ - settings  │  │ - search     │         │   │
│  │  │ - logout    │  │ - subscription│ │ - import     │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │/api/messages│  │/api/payments│  │ /api/webhooks│         │   │
│  │  │             │  │             │  │              │         │   │
│  │  │ - templates │  │ - Stripe    │  │ - Stripe     │         │   │
│  │  │ - send      │  │ - RevenueCat│  │ - RevenueCat │         │   │
│  │  │ - history   │  │ - checkout  │  │ - Supabase   │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ PostgreSQL Connection
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Supabase                                │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  PostgreSQL  │  │  Supabase    │  │   Storage    │      │   │
│  │  │   Database   │  │    Auth      │  │   (Files)    │      │   │
│  │  │              │  │              │  │              │      │   │
│  │  │ - users      │  │ - Email/Pass │  │ - Avatars    │      │   │
│  │  │ - contacts   │  │ - OAuth      │  │ - Voice notes│      │   │
│  │  │ - messages   │  │ - Magic Link │  │ - Documents  │      │   │
│  │  │ - subscriptions│ │ - JWT tokens│  │              │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐                        │   │
│  │  │   Realtime   │  │Edge Functions│                        │   │
│  │  │              │  │              │                        │   │
│  │  │ - Live sync  │  │ - Custom     │                        │   │
│  │  │ - Presence   │  │   logic      │                        │   │
│  │  └──────────────┘  └──────────────┘                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why Each Technology?

### Frontend: Expo + React Native

| Choice | Why | Alternatives Considered |
|--------|-----|------------------------|
| **Expo** | Managed workflow, OTA updates, easy builds | Bare React Native |
| **React Native** | Single codebase for iOS, Android, Web | Flutter, Native |
| **Expo Router** | File-based routing, deep linking built-in | React Navigation |
| **React Query** | Caching, background refetch, optimistic updates | SWR, Redux |
| **NativeWind** | Tailwind CSS syntax in React Native | StyleSheet, Styled Components |

### Backend: Vercel Serverless

| Choice | Why | Alternatives Considered |
|--------|-----|------------------------|
| **Vercel** | Zero-config deploys, auto-scaling, edge network | AWS Lambda, Railway |
| **Serverless** | Pay-per-use, no server management | Express on VPS |
| **TypeScript** | Type safety, better DX | Plain JavaScript |
| **tRPC** | End-to-end type safety with frontend | REST, GraphQL |

### Database: Supabase

| Choice | Why | Alternatives Considered |
|--------|-----|------------------------|
| **Supabase** | PostgreSQL + Auth + Storage + Realtime in one | Firebase, PlanetScale |
| **PostgreSQL** | Relational, ACID compliant, mature | MongoDB, MySQL |
| **Row Level Security** | Database-level authorization | App-level auth only |
| **Realtime** | Live updates without polling | WebSockets manually |

### Payments: Stripe + RevenueCat

| Choice | Why | Alternatives Considered |
|--------|-----|------------------------|
| **Stripe** | Best DX, comprehensive API, web payments | PayPal, Paddle |
| **RevenueCat** | Handles Apple/Google IAP complexity | Manual StoreKit |
| **Superwall** | Paywall A/B testing, no code changes | Custom paywalls |

---

## Data Flow Examples

### Example 1: User Login

```
1. User taps "Login" button
   │
   ▼
2. App calls: POST /api/auth/login
   { email: "user@example.com", password: "***" }
   │
   ▼
3. Backend validates with Supabase Auth
   supabase.auth.signInWithPassword()
   │
   ▼
4. Supabase returns JWT token
   { access_token: "eyJ...", refresh_token: "..." }
   │
   ▼
5. Backend returns token to app
   │
   ▼
6. App stores token in SecureStore
   │
   ▼
7. App redirects to Home screen
   │
   ▼
8. React Query fetches user profile
   GET /api/users/me (with JWT in header)
```

### Example 2: Creating a Contact

```
1. User fills contact form and taps "Save"
   │
   ▼
2. React Query mutation:
   POST /api/contacts
   { name: "John Doe", email: "john@example.com" }
   │
   ▼
3. Backend validates request
   │
   ▼
4. Backend inserts into Supabase
   supabase.from('contacts').insert(data)
   │
   ▼
5. Database returns new contact with ID
   │
   ▼
6. Backend returns success
   { id: "uuid-123", name: "John Doe", ... }
   │
   ▼
7. React Query updates cache optimistically
   │
   ▼
8. UI shows new contact immediately
```

### Example 3: Processing a Subscription

```
1. User selects "Pro Plan" and taps "Subscribe"
   │
   ├─── [WEB] ──────────────────────────────────────┐
   │                                                 │
   ▼                                                 ▼
2a. Mobile: RevenueCat.purchasePackage()    2b. Web: Stripe Checkout
   │                                                 │
   ▼                                                 ▼
3a. Apple/Google processes payment          3b. Stripe processes card
   │                                                 │
   ▼                                                 ▼
4a. RevenueCat webhook fires               4b. Stripe webhook fires
   POST /api/webhooks/revenuecat               POST /api/webhooks/stripe
   │                                                 │
   └────────────────────┬────────────────────────────┘
                        │
                        ▼
5. Backend updates subscription in database
   UPDATE subscriptions SET tier = 'pro' WHERE user_id = ?
   │
   ▼
6. App receives subscription update via polling/realtime
   │
   ▼
7. UI unlocks premium features
```

---

## Folder Structure Explained

```
project/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (auth)/            # Auth group (login, register, forgot-password)
│   ├── (tabs)/            # Main tab navigation
│   │   ├── index.tsx      # Home tab
│   │   ├── contacts.tsx   # Contacts tab
│   │   └── settings.tsx   # Settings tab
│   ├── _layout.tsx        # Root layout (providers, themes)
│   └── +not-found.tsx     # 404 page
│
├── components/            # Reusable UI components
│   ├── ui/               # Base components (Button, Input, Card)
│   ├── forms/            # Form components (ContactForm, LoginForm)
│   └── layouts/          # Layout components (Header, TabBar)
│
├── lib/                  # Core utilities
│   ├── supabase.ts       # Supabase client initialization
│   ├── api.ts            # API client (fetch wrapper)
│   ├── storage.ts        # Secure storage helpers
│   └── utils.ts          # General utilities
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication state
│   ├── useContacts.ts    # Contacts CRUD operations
│   └── useSubscription.ts # Subscription state
│
├── services/             # Business logic
│   ├── auth.ts           # Auth service
│   ├── contacts.ts       # Contacts service
│   └── payments.ts       # Payment service
│
├── types/                # TypeScript type definitions
│   ├── database.ts       # Database table types
│   ├── api.ts            # API request/response types
│   └── navigation.ts     # Navigation param types
│
├── constants/            # App constants
│   ├── colors.ts         # Theme colors
│   ├── config.ts         # App configuration
│   └── endpoints.ts      # API endpoints
│
└── assets/               # Static assets
    ├── images/           # PNG, JPG images
    ├── fonts/            # Custom fonts
    └── icons/            # SVG icons
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Layer 1: HTTPS                                      │    │
│  │ All traffic encrypted in transit                    │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Layer 2: JWT Authentication                         │    │
│  │ Every API request requires valid token              │    │
│  │ Tokens expire after 1 hour                          │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Layer 3: Row Level Security (RLS)                   │    │
│  │ Users can only access their own data                │    │
│  │ Enforced at database level                          │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Layer 4: Input Validation                           │    │
│  │ All inputs sanitized and validated                  │    │
│  │ SQL injection prevention                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variable Security

| Variable Type | Where Stored | Can Expose? |
|--------------|--------------|-------------|
| `EXPO_PUBLIC_*` | Client bundle | ✅ Yes (public) |
| `SUPABASE_ANON_KEY` | Client | ✅ Yes (limited permissions) |
| `STRIPE_SECRET_KEY` | Server only | ❌ Never |
| `SUPABASE_SERVICE_ROLE` | Server only | ❌ Never |

---

## Scaling Considerations

### Current Capacity

| Resource | Limit | Notes |
|----------|-------|-------|
| Supabase (Free) | 500 MB database | Upgrade at ~10K users |
| Vercel (Free) | 100 GB bandwidth | Upgrade at ~50K requests/day |
| RevenueCat | Unlimited | Free up to $2.5K MRR |

### When to Scale

| Metric | Action Trigger | Solution |
|--------|---------------|----------|
| Database size > 400 MB | Upgrade Supabase | Pro tier ($25/mo) |
| API latency > 500ms | Add caching | Redis/Upstash |
| Build times > 10 min | Optimize | Code splitting |
| Users > 10K | All of above | Full audit |

---

## Next Steps

- [Backend Setup →](03-BACKEND-SETUP.md)
- [Database Guide →](04-DATABASE.md)
- [Authentication →](05-AUTHENTICATION.md)
