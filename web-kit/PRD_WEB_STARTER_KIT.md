# Product Requirements Document (PRD)
# EverReach Web App Starter Kit - Option A

## Executive Summary

Transform the existing EverReach web frontend codebase into a reusable web app starter kit that developers can clone and customize with their own business logic while retaining production-ready infrastructure.

---

## Product Vision

**One-liner:** A production-ready React/Next.js web app template that developers clone, swap the business logic, and deploy in days instead of months.

**Target User:** Developers building SaaS products, dashboards, or web applications who need auth, payments, and modern UI out of the box.

**Value Proposition:** Skip months of frontend infrastructure work. Get authentication, Stripe payments, responsive UI, and deployment-ready architecture immediately.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14+ (App Router) | React framework with SSR |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui | Accessible component library |
| **State** | React Query (TanStack) | Server state management |
| **Auth** | Supabase Auth | Authentication |
| **Database** | Supabase (PostgreSQL) | Backend as a service |
| **Payments** | Stripe | Web subscriptions |
| **Deployment** | Vercel | Hosting platform |

---

## Goals & Success Metrics

### Goals

1. **Reduce frontend setup time** from weeks to hours
2. **Provide modern UI** - Dark mode, responsive, accessible
3. **Include payment integration** - Stripe checkout ready
4. **Production-ready** - SEO, performance, security

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to first run | < 15 minutes |
| Lighthouse score | > 90 |
| Time to customize | < 1 week |
| Time to production | < 2 weeks |

---

## Scope

### In Scope (What We Ship)

| Component | Description |
|-----------|-------------|
| **Authentication** | Login, signup, forgot password, OAuth |
| **User Dashboard** | Profile, settings, account management |
| **Subscription UI** | Pricing page, checkout, billing portal |
| **Navigation** | Responsive navbar, sidebar, mobile menu |
| **UI Components** | Buttons, forms, modals, tables, cards |
| **Dark Mode** | System preference + toggle |
| **Landing Page** | Hero, features, pricing, CTA |
| **SEO** | Meta tags, sitemap, robots.txt |
| **Error Pages** | 404, 500, error boundaries |

### Out of Scope (What Users Build)

| Component | User Responsibility |
|-----------|---------------------|
| Business logic | Core app functionality |
| Data models | Their specific entities |
| Custom pages | App-specific views |
| Branding | Logo, colors, copy |

---

## Technical Architecture

### Project Structure

```
web-frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   │   ├── login/page.tsx        # ✅ KEEP - Login page
│   │   ├── signup/page.tsx       # ✅ KEEP - Signup page
│   │   ├── forgot-password/      # ✅ KEEP - Password reset
│   │   └── layout.tsx            # Auth layout
│   ├── (dashboard)/              # Protected app routes
│   │   ├── dashboard/page.tsx    # 🔧 CUSTOMIZE - Main dashboard
│   │   ├── items/                # 🔧 REPLACE - Your entity
│   │   │   ├── page.tsx          # List view
│   │   │   └── [id]/page.tsx     # Detail view
│   │   ├── settings/page.tsx     # ✅ KEEP - User settings
│   │   ├── billing/page.tsx      # ✅ KEEP - Subscription
│   │   └── layout.tsx            # Dashboard layout with sidebar
│   ├── (marketing)/              # Public pages
│   │   ├── page.tsx              # 🔧 CUSTOMIZE - Landing page
│   │   ├── pricing/page.tsx      # ✅ KEEP - Pricing page
│   │   ├── about/page.tsx        # 🔧 CUSTOMIZE - About page
│   │   └── layout.tsx            # Marketing layout
│   ├── api/                      # API routes
│   │   ├── auth/                 # ✅ KEEP - Auth endpoints
│   │   ├── stripe/               # ✅ KEEP - Stripe webhooks
│   │   └── items/                # 🔧 REPLACE - Your API
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # ✅ KEEP - shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/                   # ✅ KEEP - Layout components
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   └── mobile-nav.tsx
│   ├── auth/                     # ✅ KEEP - Auth components
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── oauth-buttons.tsx
│   ├── billing/                  # ✅ KEEP - Billing components
│   │   ├── pricing-cards.tsx
│   │   ├── checkout-button.tsx
│   │   └── subscription-status.tsx
│   └── items/                    # 🔧 REPLACE - Your components
│       ├── item-card.tsx
│       ├── item-form.tsx
│       └── item-list.tsx
│
├── lib/                          # Utilities
│   ├── supabase/                 # ✅ KEEP - Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── stripe/                   # ✅ KEEP - Stripe utilities
│   │   └── client.ts
│   └── utils/                    # ✅ KEEP - Helpers
│       ├── cn.ts                 # Class names utility
│       └── format.ts             # Formatters
│
├── hooks/                        # Custom hooks
│   ├── use-auth.ts               # ✅ KEEP - Auth hook
│   ├── use-subscription.ts       # ✅ KEEP - Subscription hook
│   └── use-items.ts              # 🔧 REPLACE - Your data hook
│
├── types/                        # TypeScript types
│   ├── user.ts                   # ✅ KEEP - User types
│   ├── subscription.ts           # ✅ KEEP - Subscription types
│   └── item.ts                   # 🔧 REPLACE - Your entity types
│
├── config/                       # Configuration
│   ├── site.ts                   # 🔧 CUSTOMIZE - Site metadata
│   └── nav.ts                    # 🔧 CUSTOMIZE - Navigation config
│
├── styles/                       # Styles
│   └── globals.css               # Tailwind + custom CSS
│
├── public/                       # Static assets
│   ├── images/                   # 🔧 REPLACE - Your images
│   └── fonts/                    # Custom fonts
│
├── middleware.ts                 # ✅ KEEP - Auth middleware
├── tailwind.config.ts            # 🔧 CUSTOMIZE - Theme colors
├── next.config.js                # Next.js config
├── package.json                  # Dependencies
└── .env.example                  # Environment template
```

---

## Page Routes

### Public Routes (No Auth Required)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Marketing homepage |
| `/pricing` | Pricing | Subscription tiers |
| `/about` | About | Company info |
| `/login` | Login | Sign in |
| `/signup` | Signup | Create account |
| `/forgot-password` | Reset | Password recovery |

### Protected Routes (Auth Required)

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard | Main app view |
| `/items` | Items List | Your entity list |
| `/items/:id` | Item Detail | Your entity detail |
| `/settings` | Settings | User preferences |
| `/settings/profile` | Profile | Edit profile |
| `/settings/billing` | Billing | Subscription management |

---

## Developer Handoff Guide

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **npm** or **pnpm** | Latest | Package manager |
| **Git** | Latest | Version control |
| **VS Code** | Latest | Recommended IDE |

### Account Requirements

| Service | Required? | Purpose | Setup Time |
|---------|-----------|---------|------------|
| **Supabase** | ✅ Yes | Database, Auth | 5 min |
| **Vercel** | ✅ Yes | Hosting | 5 min |
| **Stripe** | ✅ For payments | Subscriptions | 15 min |

---

### Step-by-Step Setup Instructions

#### Step 1: Clone & Install (5 minutes)

```bash
# Clone the web starter
git clone -b web-starter https://github.com/IsaiahDupree/EverReach.git my-web-app
cd my-web-app

# Install dependencies
npm install
# OR
pnpm install
```

#### Step 2: Supabase Setup (10 minutes)

1. **Create Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Save database password

2. **Get API Keys:**
   - Settings → API
   - Copy: `Project URL`, `anon key`

3. **Run Database Schema:**
   - SQL Editor → Run `supabase/schema.sql`

4. **Configure Auth:**
   - Authentication → URL Configuration
   - Set Site URL: `http://localhost:3000`
   - Add Redirect URLs: `http://localhost:3000/auth/callback`

#### Step 3: Stripe Setup (15 minutes)

1. **Create Stripe Account:**
   - Go to [stripe.com](https://stripe.com)
   - Get API keys from Dashboard → Developers → API keys

2. **Create Products:**
   - Products → Add product
   - Create pricing tiers (Free, Pro, Business)

3. **Set up Webhooks:**
   - Developers → Webhooks → Add endpoint
   - URL: `https://yoursite.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`

#### Step 4: Environment Configuration (5 minutes)

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

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Step 5: Run Locally (2 minutes)

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

---

### UI Components Reference

#### shadcn/ui Components Included

| Component | Usage |
|-----------|-------|
| `Button` | Primary, secondary, ghost, destructive variants |
| `Input` | Text inputs with validation states |
| `Card` | Content containers |
| `Dialog` | Modal dialogs |
| `DropdownMenu` | Dropdown menus |
| `Table` | Data tables |
| `Tabs` | Tab navigation |
| `Toast` | Notifications |
| `Form` | Form with validation (react-hook-form + zod) |
| `Avatar` | User avatars |
| `Badge` | Status badges |
| `Skeleton` | Loading states |

#### Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

---

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Page Component                        │    │
│  │                app/(dashboard)/items/page.tsx            │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Query Hook                      │    │
│  │                    hooks/use-items.ts                    │    │
│  │                                                          │    │
│  │  • useQuery for fetching                                 │    │
│  │  • useMutation for updates                               │    │
│  │  • Automatic caching & revalidation                      │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (or your API)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │     Auth     │  │   Database   │  │   Storage    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Creating a New Page

#### Example: Add a `/projects` page

**Step 1: Create the page**

```tsx
// app/(dashboard)/projects/page.tsx
import { ProjectList } from '@/components/projects/project-list';

export const metadata = {
  title: 'Projects',
};

export default function ProjectsPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button>New Project</Button>
      </div>
      <ProjectList />
    </div>
  );
}
```

**Step 2: Create the data hook**

```tsx
// hooks/use-projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: CreateProjectInput) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

**Step 3: Create the component**

```tsx
// components/projects/project-list.tsx
'use client';

import { useProjects } from '@/hooks/use-projects';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects?.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 4: Add to navigation**

```tsx
// config/nav.ts
export const dashboardNav = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Projects', href: '/projects', icon: Folder }, // Add this
  { title: 'Settings', href: '/settings', icon: Settings },
];
```

---

### Customization Checklist

#### Day 1: Branding & Config

- [ ] Update `config/site.ts` with your app name, description
- [ ] Replace logo in `public/images/`
- [ ] Update colors in `tailwind.config.ts`
- [ ] Customize landing page copy

#### Day 2: Data Model

- [ ] Define your types in `types/`
- [ ] Create database tables in Supabase
- [ ] Build data hooks in `hooks/`

#### Day 3-4: Pages & Components

- [ ] Replace `/items` with your entity pages
- [ ] Create your components in `components/`
- [ ] Update navigation in `config/nav.ts`

#### Day 5: Polish

- [ ] Configure Stripe products
- [ ] Test subscription flow
- [ ] Test auth flows
- [ ] Mobile responsiveness check

#### Day 6-7: Deploy

- [ ] Deploy to Vercel
- [ ] Set production environment variables
- [ ] Configure custom domain
- [ ] Set up Stripe production webhooks

---

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key | `eyJ...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe public key | `pk_test_...` |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing | `whsec_...` |
| `NEXT_PUBLIC_APP_URL` | ✅ | App URL | `https://yourapp.com` |
| `STRIPE_PRO_PRICE_ID` | For pricing | Pro tier price ID | `price_xxx` |
| `STRIPE_BUSINESS_PRICE_ID` | For pricing | Business tier price ID | `price_xxx` |

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

# Set environment variables in Vercel Dashboard
# Or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... etc

# Deploy to production
vercel --prod
```

#### Post-Deployment

1. Update Supabase Auth redirect URLs
2. Update Stripe webhook URL
3. Configure custom domain in Vercel
4. Enable analytics (Vercel Analytics or PostHog)

---

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Auth redirect fails | Wrong callback URL | Update Supabase redirect URLs |
| Stripe checkout fails | Wrong price ID | Check STRIPE_*_PRICE_ID env vars |
| Styles not loading | Tailwind not configured | Check tailwind.config.ts content paths |
| API routes 401 | Missing auth | Check middleware.ts matcher config |
| Build fails | TypeScript errors | Run `npm run typecheck` locally |

---

### Performance Checklist

- [ ] Images optimized with `next/image`
- [ ] Fonts loaded with `next/font`
- [ ] Components lazy loaded where appropriate
- [ ] React Query stale times configured
- [ ] Static pages pre-rendered
- [ ] API routes use edge runtime where possible

---

### SEO Checklist

- [ ] Page titles and descriptions set
- [ ] Open Graph images created
- [ ] robots.txt configured
- [ ] sitemap.xml generated
- [ ] Canonical URLs set
- [ ] Structured data (JSON-LD) added

---

### Support & Resources

| Resource | URL |
|----------|-----|
| Next.js Docs | https://nextjs.org/docs |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com |
| Supabase Docs | https://supabase.com/docs |
| Stripe Docs | https://stripe.com/docs |
| React Query | https://tanstack.com/query |

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1: Clean & Genericize** | 1-2 days | Item-based pages |
| **Phase 2: Remove EverReach Logic** | 1 day | Clean starter |
| **Phase 3: UI Polish** | 1 day | Consistent design |
| **Phase 4: Documentation** | 1 day | All guides |
| **Phase 5: QA & Test** | 1 day | Working starter |
| **Total** | **5-6 days** | Production-ready kit |

---

## Deliverables Checklist

### Code Changes

- [ ] Rename contact pages → item pages
- [ ] Remove EverReach-specific components
- [ ] Simplify to generic starter
- [ ] Add customization comments
- [ ] Keep infrastructure (auth, payments, layout)

### Documentation

- [ ] QUICKSTART.md - 15-minute setup
- [ ] CUSTOMIZATION.md - How to modify
- [ ] COMPONENTS.md - UI component guide
- [ ] DEPLOYMENT.md - Vercel deployment
- [ ] STRIPE_SETUP.md - Payment configuration

### Quality Assurance

- [ ] App runs on first clone
- [ ] Auth flows work
- [ ] Stripe checkout works (test mode)
- [ ] Responsive on all screen sizes
- [ ] Dark mode works
- [ ] Lighthouse score > 90

---

## Next Steps

1. **Approve this PRD**
2. Begin Phase 1: Clean & Genericize
3. Create new branch: `web-starter`
4. Execute transformation
5. QA and document
6. Push to GitHub
