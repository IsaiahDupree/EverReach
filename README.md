# EverReach App Kit

## Production-Ready Full-Stack Starter with iOS, Backend, and Web Templates

Build production-ready apps with React Native, Next.js, and Supabase in days, not months. This monorepo contains three fully-integrated starter kits that work together or independently.

---

## Overview

**EverReach App Kit** is a comprehensive monorepo providing battle-tested starter templates for building modern full-stack applications. Whether you're building a mobile app, web app, or complete SaaS platform, these kits give you authentication, payments, and modern architecture out of the box.

### What's Included

This monorepo contains **three complete starter kits**:

1. **iOS/Mobile Starter** (`ios-starter/`) - React Native + Expo mobile app
2. **Backend API Starter** (`backend-kit/`) - Next.js serverless API
3. **Web App Starter** (`web-kit/`) - Next.js 14 web application

Each kit can be used independently or together as a complete full-stack solution.

---

## Quick Navigation

Jump directly to the starter kit you need:

| Starter Kit | Description | Documentation | Timeline |
|-------------|-------------|---------------|----------|
| **📱 iOS/Mobile** | React Native app with Expo, auth, subscriptions | [README](./ios-starter/README.md) \| [PRD](./PRD_IOS_STARTER_KIT.md) | 6-10 days |
| **🔧 Backend API** | Next.js API with Supabase, Stripe, webhooks | [README](./backend-kit/README.md) \| [PRD](./backend-kit/PRD_BACKEND_STARTER_KIT.md) | 4-5 days |
| **🌐 Web App** | Next.js 14 web app with Tailwind, shadcn/ui | [README](./web-kit/README.md) \| [PRD](./web-kit/PRD_WEB_STARTER_KIT.md) | 5-6 days |

**Full Documentation:** [Developer Handoff Guide](./DEVELOPER_HANDOFF.md)

---

## Architecture

### High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   iOS App       │  │   Web App       │  │   Admin Panel   │          │
│  │  (Expo/RN)      │  │  (Next.js)      │  │  (Next.js)      │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
└───────────┼─────────────────────┼─────────────────────┼─────────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                     │
│                    (Vercel Serverless / Render)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Auth     │  │    CRUD     │  │  Webhooks   │  │   Upload    │     │
│  │  Endpoints  │  │  Endpoints  │  │  Handlers   │  │  Handlers   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │      Auth       │  │    Database     │  │    Storage      │          │
│  │                 │  │   (PostgreSQL)  │  │                 │          │
│  │ • Email/Pass    │  │ • users         │  │ • avatars       │          │
│  │ • OAuth         │  │ • items         │  │ • uploads       │          │
│  │ • Magic Links   │  │ • subscriptions │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PAYMENT PROVIDERS                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │         Stripe              │  │       RevenueCat            │       │
│  │    (Web Payments)           │  │   (Mobile Payments)         │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Mobile** | React Native + Expo | iOS & Android apps |
| **Web** | Next.js 14 + Tailwind | Modern web application |
| **Backend** | Next.js API Routes | RESTful serverless API |
| **Database** | Supabase (PostgreSQL) | Data persistence + Auth |
| **Payments** | Stripe + RevenueCat | Subscriptions |
| **Deployment** | Vercel + EAS Build | Hosting + CI/CD |

---

## Starter Kit Details

### 📱 iOS/Mobile Starter Kit

**Location:** `ios-starter/`

**Tech Stack:** React Native, Expo, Supabase, RevenueCat

**Key Features:**
- Email/password auth + OAuth (Google, Apple)
- RevenueCat subscription management
- Tab + stack navigation with Expo Router
- Dark mode support
- Push notifications
- In-app developer guide overlay

**Documentation:** [ios-starter/README.md](./ios-starter/README.md)

**Quick Start:**
```bash
cd ios-starter
npm install
cp .env.example .env
# Configure .env with Supabase credentials
npm start
```

---

### 🔧 Backend API Starter Kit

**Location:** `backend-kit/`

**Tech Stack:** Next.js 14, Supabase, Stripe, RevenueCat, Zod

**Key Features:**
- RESTful API with TypeScript
- JWT authentication middleware
- Stripe & RevenueCat webhook handlers
- Rate limiting & CORS
- Input validation with Zod
- File upload to Supabase Storage

**Documentation:** [backend-kit/README.md](./backend-kit/README.md)

**Quick Start:**
```bash
cd backend-kit
npm install
cp .env.example .env.local
# Configure .env.local with Supabase credentials
npm run dev
```

---

### 🌐 Web App Starter Kit

**Location:** `web-kit/`

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, React Query, Stripe

**Key Features:**
- Authentication pages (login, signup)
- Dashboard with sidebar navigation
- Pricing page with Stripe checkout
- User settings & billing portal
- Dark mode with system detection
- SEO optimized (meta tags, sitemap, robots.txt)

**Documentation:** [web-kit/README.md](./web-kit/README.md)

**Quick Start:**
```bash
cd web-kit
npm install
cp .env.example .env.local
# Configure .env.local with Supabase credentials
npm run dev
```

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | 18+ | [Download](https://nodejs.org) |
| **npm** | Latest | Included with Node.js |
| **Git** | Latest | [Download](https://git-scm.com) |

### Required Accounts

| Service | Purpose | Cost | Setup Time |
|---------|---------|------|------------|
| **Supabase** | Database, Auth, Storage | Free tier available | 5 min |
| **Vercel** | Hosting (Backend + Web) | Free tier available | 5 min |
| **Stripe** (optional) | Web payments | 2.9% + $0.30/transaction | 15 min |
| **RevenueCat** (optional) | Mobile payments | Free up to $2.5K MTR | 15 min |
| **Expo** (optional) | Mobile builds | Free tier available | 5 min |

### Option A: Full Stack Setup (All 3 Kits)

For a complete mobile + web + backend solution:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IsaiahDupree/EverReach.git
   cd EverReach/app-kit
   ```

2. **Set up Supabase:**
   - Create a project at [supabase.com](https://supabase.com)
   - Run the schema from `backend-kit/supabase/schema.sql`
   - Note your Project URL and API keys

3. **Backend setup:**
   ```bash
   cd backend-kit
   npm install
   cp .env.example .env.local
   # Edit .env.local with Supabase credentials
   npm run dev
   ```

4. **Web setup:**
   ```bash
   cd ../web-kit
   npm install
   cp .env.example .env.local
   # Edit .env.local with Supabase credentials
   npm run dev
   ```

5. **iOS setup:**
   ```bash
   cd ../ios-starter
   npm install
   cp .env.example .env
   # Edit .env with Supabase credentials
   npm start
   ```

### Option B: Individual Kit Setup

Pick only the kit(s) you need and follow the README in that directory:

- [iOS Starter Setup](./ios-starter/README.md)
- [Backend Setup](./backend-kit/README.md)
- [Web Setup](./web-kit/README.md)

---

## Monorepo Structure

```
app-kit/
├── ios-starter/              # Mobile app (React Native + Expo)
│   ├── app/                  # Expo Router screens
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Supabase & RevenueCat clients
│   ├── README.md             # iOS-specific documentation
│   └── package.json
│
├── backend-kit/              # API backend (Next.js)
│   ├── app/api/              # API route handlers
│   ├── lib/                  # Auth, payments, utilities
│   ├── supabase/             # Database schema
│   ├── README.md             # Backend-specific documentation
│   └── package.json
│
├── web-kit/                  # Web frontend (Next.js 14)
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── hooks/                # React Query hooks
│   ├── lib/                  # Supabase & Stripe clients
│   ├── README.md             # Web-specific documentation
│   └── package.json
│
├── docs/                     # Shared documentation
├── __tests__/                # Root-level tests
├── DEVELOPER_HANDOFF.md      # Complete developer guide
├── PRD_IOS_STARTER_KIT.md    # iOS requirements doc
└── README.md                 # This file
```

---

## Documentation

### Essential Guides

| Guide | Description | Link |
|-------|-------------|------|
| **Developer Handoff** | Complete setup guide for all kits | [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) |
| **iOS PRD** | Full requirements for mobile starter | [PRD_IOS_STARTER_KIT.md](./PRD_IOS_STARTER_KIT.md) |
| **Backend PRD** | Full requirements for API starter | [backend-kit/PRD_BACKEND_STARTER_KIT.md](./backend-kit/PRD_BACKEND_STARTER_KIT.md) |
| **Web PRD** | Full requirements for web starter | [web-kit/PRD_WEB_STARTER_KIT.md](./web-kit/PRD_WEB_STARTER_KIT.md) |

### Kit-Specific Documentation

- **iOS/Mobile:** [ios-starter/README.md](./ios-starter/README.md)
- **Backend API:** [backend-kit/README.md](./backend-kit/README.md)
- **Web App:** [web-kit/README.md](./web-kit/README.md)

---

## Common Tasks

### Customizing for Your App

Each starter kit has placeholder content ("items") that you'll replace with your business logic:

1. **Replace the data model:**
   - `types/item.ts` → Your entity types
   - Database schema in `supabase/schema.sql`
   - API endpoints in `app/api/items/`

2. **Update branding:**
   - iOS: `app.json` (name, bundle ID, icons)
   - Web: `config/site.ts` (name, description, URLs)
   - Colors: `tailwind.config.ts` (web) or `constants/colors.ts` (iOS)

3. **Configure payments:**
   - Stripe Dashboard: Create products and prices
   - RevenueCat Dashboard: Configure offerings
   - Update environment variables with price IDs

See each kit's README for detailed customization guides.

---

## Deployment

| Kit | Recommended Platform | Deploy Command | Docs |
|-----|---------------------|----------------|------|
| **iOS** | EAS Build → App Store | `eas build --platform ios` | [Deployment Guide](./ios-starter/README.md#deployment) |
| **Backend** | Vercel | `vercel --prod` | [Deployment Guide](./backend-kit/README.md#deployment) |
| **Web** | Vercel | `vercel --prod` | [Deployment Guide](./web-kit/README.md#deployment) |

---

## Support & Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [RevenueCat Documentation](https://docs.revenuecat.com)

### Community
- [GitHub Issues](https://github.com/IsaiahDupree/EverReach/issues)
- Email: support@everreach.app

---

## License

See [LICENSE.md](./LICENSE.md) for terms.

---

**Ready to build?** Choose your starter kit above and get started in under 15 minutes.
