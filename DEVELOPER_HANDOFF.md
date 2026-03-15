# EverReach App Kit - Developer Handoff Guide

## Overview

This document provides a complete handoff guide for developers who want to use the EverReach App Kit to build their own applications. The kit includes three starter templates covering mobile, backend, and web development.

---

## Quick Links

| Starter Kit | PRD Location | Target Platform |
|-------------|--------------|-----------------|
| **iOS/Mobile** | [PRD_IOS_STARTER_KIT.md](./PRD_IOS_STARTER_KIT.md) | React Native / Expo |
| **Backend API** | [backend-kit/PRD_BACKEND_STARTER_KIT.md](./backend-kit/PRD_BACKEND_STARTER_KIT.md) | Vercel / Render |
| **Web App** | [web-kit/PRD_WEB_STARTER_KIT.md](./web-kit/PRD_WEB_STARTER_KIT.md) | Next.js / Vercel |

---

## What's Included

### 1. iOS/Mobile Starter Kit (795 lines)

**Technology Stack:**
- React Native with Expo
- Expo Router for navigation
- Supabase for backend
- RevenueCat for subscriptions
- TypeScript

**Key Features:**
- ✅ Authentication (email, OAuth, Apple Sign In)
- ✅ Subscription management with RevenueCat
- ✅ Tab and stack navigation
- ✅ Settings and profile screens
- ✅ Dark mode support
- ✅ Push notifications setup
- ✅ In-app DevModeOverlay for customization guidance

**Timeline:** 6-10 days to customize and deploy

---

### 2. Backend API Starter Kit (726 lines)

**Technology Stack:**
- Next.js API Routes (App Router)
- Supabase (PostgreSQL + Auth)
- Stripe for web payments
- RevenueCat for mobile payments
- TypeScript + Zod validation

**Key Features:**
- ✅ RESTful API endpoints
- ✅ JWT authentication
- ✅ Webhook handlers (Stripe, RevenueCat)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Input validation
- ✅ Error handling

**Deployment Options:**
- Vercel (serverless, recommended)
- Render (container-based)

**Timeline:** 4-5 days to customize and deploy

---

### 3. Web App Starter Kit (683 lines)

**Technology Stack:**
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- React Query (TanStack)
- Supabase Auth
- Stripe Checkout

**Key Features:**
- ✅ Authentication pages
- ✅ Dashboard layout with sidebar
- ✅ Pricing page with Stripe checkout
- ✅ User settings and billing
- ✅ Dark mode
- ✅ Responsive design
- ✅ SEO optimized

**Timeline:** 5-6 days to customize and deploy

---

## Architecture Overview

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
│  │                             │  │                             │       │
│  │ • Checkout Sessions         │  │ • iOS Subscriptions         │       │
│  │ • Customer Portal           │  │ • Android Subscriptions     │       │
│  │ • Webhooks                  │  │ • Webhooks                  │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites (All Platforms)

### Required Accounts

| Service | Purpose | Cost | Setup Time |
|---------|---------|------|------------|
| **Supabase** | Database, Auth, Storage | Free tier available | 5 min |
| **Vercel** | Hosting (Backend + Web) | Free tier available | 5 min |
| **Stripe** | Web payments | 2.9% + $0.30/transaction | 15 min |
| **RevenueCat** | Mobile payments | Free up to $2.5K MTR | 15 min |
| **Apple Developer** | iOS App Store | $99/year | 1-2 days |
| **Google Play** | Android Play Store | $25 one-time | 1 day |
| **Expo** | Mobile builds | Free tier available | 5 min |

### Development Tools

| Tool | Version | Required For |
|------|---------|--------------|
| Node.js | 18+ | All |
| npm/pnpm/bun | Latest | All |
| Git | Latest | All |
| VS Code | Latest | Recommended IDE |
| Xcode | 15+ | iOS development |
| Android Studio | Latest | Android development |

---

## Getting Started

### Option A: Full Stack (All 3 Platforms)

```bash
# 1. Clone the repository
git clone https://github.com/IsaiahDupree/EverReach.git
cd EverReach

# 2. Set up backend first
git checkout backend-starter
cd backend
npm install
cp .env.example .env.local
# Configure environment variables
npm run dev

# 3. Set up web app
git checkout web-starter
cd web
npm install
cp .env.example .env.local
# Configure environment variables
npm run dev

# 4. Set up mobile app
git checkout ios-starter
cd mobile
npm install
cp .env.example .env
# Configure environment variables
npx expo start
```

### Option B: Mobile Only

```bash
git clone -b ios-starter https://github.com/IsaiahDupree/EverReach.git my-app
cd my-app
npm install
cp .env.example .env
npx expo start
```

### Option C: Web Only

```bash
git clone -b web-starter https://github.com/IsaiahDupree/EverReach.git my-web
cd my-web
npm install
cp .env.example .env.local
npm run dev
```

### Option D: Backend Only

```bash
git clone -b backend-starter https://github.com/IsaiahDupree/EverReach.git my-api
cd my-api
npm install
cp .env.example .env.local
npm run dev
```

---

## Common Customization Tasks

### 1. Rebrand the App

| File | What to Change |
|------|----------------|
| `app.json` (mobile) | App name, bundle ID, icons |
| `config/site.ts` (web) | Site name, description, URLs |
| `tailwind.config.ts` | Brand colors |
| `public/images/` | Logo, favicon, OG images |

### 2. Replace the Data Model

| Platform | Files to Modify |
|----------|-----------------|
| Mobile | `types/item.ts`, `hooks/useItems.ts`, `app/(tabs)/index.tsx` |
| Backend | `types/item.ts`, `app/api/items/route.ts`, `lib/validation/item.ts` |
| Web | `types/item.ts`, `hooks/use-items.ts`, `app/(dashboard)/items/page.tsx` |

### 3. Update Subscription Tiers

| Platform | Where to Configure |
|----------|-------------------|
| Mobile | RevenueCat Dashboard + `constants/config.ts` |
| Web | Stripe Dashboard + `STRIPE_*_PRICE_ID` env vars |
| Backend | Webhook handlers + database schema |

---

## Environment Variables Summary

### Supabase (All Platforms)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Backend only
```

### Stripe (Web + Backend)

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### RevenueCat (Mobile)

```bash
REVENUECAT_API_KEY_IOS=appl_...
REVENUECAT_API_KEY_ANDROID=goog_...
REVENUECAT_WEBHOOK_SECRET=...
```

### App URLs

```bash
NEXT_PUBLIC_APP_URL=https://yourapp.com
EXPO_PUBLIC_API_URL=https://api.yourapp.com
```

---

## Deployment Checklist

### Pre-Launch

- [ ] All environment variables set for production
- [ ] Database schema applied to production Supabase
- [ ] RLS policies enabled on all tables
- [ ] Stripe/RevenueCat configured for production
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics enabled (PostHog/Vercel)

### Mobile Specific

- [ ] App icons and splash screens created
- [ ] App Store Connect listing complete
- [ ] Google Play Console listing complete
- [ ] Privacy policy URL set
- [ ] Terms of service URL set
- [ ] Screenshots for all device sizes

### Web Specific

- [ ] SEO meta tags configured
- [ ] Open Graph images created
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Lighthouse score > 90

---

## Support Resources

### Documentation

| Resource | URL |
|----------|-----|
| Expo Docs | https://docs.expo.dev |
| Next.js Docs | https://nextjs.org/docs |
| Supabase Docs | https://supabase.com/docs |
| Stripe Docs | https://stripe.com/docs |
| RevenueCat Docs | https://docs.revenuecat.com |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com |

### App Kit Documentation

| Guide | Location |
|-------|----------|
| Getting Started | [docs/01-GETTING-STARTED.md](./docs/01-GETTING-STARTED.md) |
| Architecture | [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md) |
| Backend Setup | [docs/03-BACKEND-SETUP.md](./docs/03-BACKEND-SETUP.md) |
| Database | [docs/04-DATABASE.md](./docs/04-DATABASE.md) |
| Authentication | [docs/05-AUTHENTICATION.md](./docs/05-AUTHENTICATION.md) |
| Payments | [docs/06-PAYMENTS.md](./docs/06-PAYMENTS.md) |
| Deployment | [docs/07-DEPLOYMENT.md](./docs/07-DEPLOYMENT.md) |
| Customization | [docs/08-CUSTOMIZATION.md](./docs/08-CUSTOMIZATION.md) |
| Troubleshooting | [docs/09-TROUBLESHOOTING.md](./docs/09-TROUBLESHOOTING.md) |
| Security | [docs/10-SECURITY.md](./docs/10-SECURITY.md) |
| Testing | [docs/11-TESTING.md](./docs/11-TESTING.md) |
| Monetization | [docs/12-MONETIZATION.md](./docs/12-MONETIZATION.md) |
| Analytics | [docs/13-ANALYTICS.md](./docs/13-ANALYTICS.md) |
| Scaling | [docs/14-SCALING.md](./docs/14-SCALING.md) |

---

## Timeline Summary

| Starter Kit | Customization Time | First Deploy |
|-------------|-------------------|--------------|
| iOS/Mobile | 6-10 days | 2-3 weeks (with App Store review) |
| Backend API | 4-5 days | 1-2 days |
| Web App | 5-6 days | 1-2 days |
| **Full Stack** | **10-14 days** | **3-4 weeks** |

---

## Next Steps

1. **Choose your platform(s)** - Mobile, Web, or Full Stack
2. **Read the relevant PRD** - Detailed requirements and file structure
3. **Set up accounts** - Supabase, Vercel, Stripe, RevenueCat
4. **Clone and configure** - Follow the setup instructions
5. **Customize** - Replace placeholder content with your business logic
6. **Deploy** - Launch to production

---

## Contact & Support

- **Email:** support@everreach.app
- **Discord:** [Coming Soon]
- **GitHub Issues:** https://github.com/IsaiahDupree/EverReach/issues
