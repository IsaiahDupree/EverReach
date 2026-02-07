# EverReach Web Starter Kit

A production-ready web app template built with Next.js 14, Tailwind CSS, shadcn/ui, and Supabase. Clone it, customize it, and deploy to Vercel in days instead of months.

## Overview

This starter kit provides a complete frontend infrastructure for modern web applications with:

- **Authentication**: Login, signup, password reset, and OAuth with Supabase Auth
- **Payments**: Stripe Checkout integration for subscriptions and one-time payments
- **UI Components**: Accessible, customizable components from shadcn/ui
- **Dark Mode**: System preference detection with manual toggle
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **SEO Optimized**: Meta tags, Open Graph, sitemap, and robots.txt
- **Type Safety**: Full TypeScript support throughout
- **State Management**: React Query (TanStack) for server state
- **Modern UI**: Tailwind CSS with a beautiful, professional design

**Target Users**: Developers building SaaS products, dashboards, or web applications who need auth, payments, and modern UI out of the box.

**Value Proposition**: Skip months of frontend infrastructure work. Get authentication, Stripe payments, responsive UI, and deployment-ready architecture immediately.

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
| **Supabase** | ✅ Yes | Authentication & Database | 5 min |
| **Vercel** | ✅ Yes | Hosting | 5 min |
| **Stripe** | Optional | Payments | 15 min |

---

## Quick Start

Get up and running in under 30 minutes:

### Step 1: Clone & Install (5 minutes)

```bash
# Clone the repository
git clone https://github.com/IsaiahDupree/EverReach.git
cd EverReach/web-kit

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

3. **Run Database Schema:**
   - Go to the SQL Editor in Supabase dashboard
   - Copy the contents of `../backend-kit/supabase/schema.sql`
   - Paste and run in the SQL Editor

### Step 3: Environment Configuration (5 minutes)

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your values
# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_APP_URL (use http://localhost:3000 for development)
```

**Minimum Required Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run Development Server (2 minutes)

```bash
# Start the development server
npm run dev

# Server will be running at http://localhost:3000
```

### Step 5: Verify Installation

Open your browser and navigate to:
- `http://localhost:3000` - Landing page
- `http://localhost:3000/login` - Login page
- `http://localhost:3000/signup` - Signup page
- `http://localhost:3000/dashboard` - Dashboard (requires authentication)

Try creating an account to test the authentication flow!

---

## Environment Setup

### Development Environment

The `.env.local` file contains all configuration for your web app. See `.env.example` for a complete template with detailed comments.

**Core Variables (Required):**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (safe for client) | `eyJhbGc...` |
| `NEXT_PUBLIC_APP_URL` | Your web app URL | `http://localhost:3000` |

**Payment Variables (Optional):**

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | For accepting payments |
| `STRIPE_SECRET_KEY` | Stripe secret key (**server only!**) | For Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For webhook verification |
| `STRIPE_BASIC_PRICE_ID` | Basic tier price ID | For subscription checkout |
| `STRIPE_PRO_PRICE_ID` | Pro tier price ID | For subscription checkout |
| `STRIPE_ENTERPRISE_PRICE_ID` | Enterprise tier price ID | For subscription checkout |

**Analytics Variables (Optional):**

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics tracking ID | For analytics |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog API key | For product analytics |

### Production Environment

When deploying to Vercel, set all environment variables in the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all required variables
4. Redeploy your application

---

## Available Scripts

The following npm scripts are available in `package.json`:

### Development

```bash
npm run dev
```
Starts the Next.js development server at `http://localhost:3000` with hot reload and fast refresh.

### Build

```bash
npm run build
```
Creates an optimized production build. This command:
- Compiles TypeScript
- Bundles and minifies JavaScript/CSS
- Generates static pages
- Optimizes images

### Production

```bash
npm run start
```
Starts the production server (requires `npm run build` first). Use this to test the production build locally before deploying.

### Linting

```bash
npm run lint
```
Runs ESLint to check code quality and catch potential issues. Automatically fixes auto-fixable problems.

### Testing

```bash
npm run test
```
Runs the Jest test suite once.

```bash
npm run test:watch
```
Runs tests in watch mode - tests automatically re-run when files change. Great for TDD!

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | React framework with SSR |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | shadcn/ui | Accessible component library |
| **State Management** | React Query (TanStack) | Server state management |
| **Authentication** | Supabase Auth | User authentication |
| **Database** | Supabase (PostgreSQL) | Backend as a service |
| **Payments** | Stripe | Subscription management |
| **Deployment** | Vercel | Hosting platform |

### Project Structure

```
web-kit/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   │   ├── login/page.tsx        # ✅ KEEP - Login page
│   │   ├── signup/page.tsx       # ✅ KEEP - Signup page
│   │   └── layout.tsx            # Auth layout
│   ├── (dashboard)/              # Protected app routes
│   │   ├── dashboard/page.tsx    # 🔧 CUSTOMIZE - Main dashboard
│   │   ├── items/                # 🔧 REPLACE - Your entity
│   │   │   ├── page.tsx          # List view
│   │   │   └── [id]/page.tsx     # Detail view
│   │   ├── settings/page.tsx     # ✅ KEEP - User settings
│   │   └── layout.tsx            # Dashboard layout with sidebar
│   ├── (marketing)/              # Public marketing pages
│   │   ├── page.tsx              # 🔧 CUSTOMIZE - Landing page
│   │   ├── pricing/page.tsx      # 🔧 CUSTOMIZE - Pricing page
│   │   └── layout.tsx            # Marketing layout
│   ├── api/                      # API routes
│   │   ├── stripe/webhook/       # Stripe webhook handler
│   │   └── auth/                 # Auth API routes
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   │   ├── navbar.tsx            # Navigation bar
│   │   ├── sidebar.tsx           # Dashboard sidebar
│   │   └── footer.tsx            # Footer
│   ├── billing/                  # Payment components
│   │   ├── pricing-cards.tsx     # Pricing tier cards
│   │   └── checkout-button.tsx   # Stripe checkout button
│   └── providers/                # Context providers
│       ├── query-provider.tsx    # React Query provider
│       └── theme-provider.tsx    # Dark mode provider
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts               # Authentication hook
│   ├── use-items.ts              # 🔧 REPLACE - Your data hooks
│   └── use-subscription.ts       # Subscription status hook
├── lib/                          # Utilities and helpers
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── stripe/                   # Stripe utilities
│   │   └── client.ts             # Stripe.js client
│   └── utils.ts                  # General utilities
├── types/                        # TypeScript types
│   ├── item.ts                   # 🔧 REPLACE - Your types
│   ├── user.ts                   # User types
│   └── subscription.ts           # Subscription types
├── config/                       # Configuration files
│   ├── site.ts                   # 🔧 CUSTOMIZE - Site config
│   └── nav.ts                    # 🔧 CUSTOMIZE - Navigation config
├── middleware.ts                 # Next.js middleware (auth)
├── .env.example                  # Environment variables template
└── package.json                  # Dependencies and scripts
```

**Legend:**
- ✅ **KEEP** - Use as-is, minimal changes needed
- 🔧 **CUSTOMIZE** - Replace placeholder content with your data
- 🔧 **REPLACE** - Swap with your business logic

### Key Features

1. **Authentication Flow**
   - Email/password authentication via Supabase
   - OAuth providers (Google, GitHub) ready to configure
   - Protected routes via Next.js middleware
   - Session management with automatic refresh

2. **Subscription Management**
   - Stripe Checkout integration
   - Multiple pricing tiers (Basic, Pro, Enterprise)
   - Customer portal for subscription management
   - Webhook handling for subscription updates

3. **UI Components**
   - Built with shadcn/ui for accessibility
   - Fully customizable with Tailwind CSS
   - Dark mode support
   - Responsive design for all screen sizes

4. **Data Fetching**
   - React Query for server state management
   - Optimistic updates
   - Automatic caching and revalidation
   - Loading and error states

---

## Deployment

### Vercel Deployment (Recommended)

Vercel is the recommended hosting platform for Next.js applications. It provides:
- Zero-config deployments
- Automatic SSL certificates
- Edge network with global CDN
- Preview deployments for branches
- Environment variable management

#### Option 1: Deploy via Vercel Dashboard

1. **Push to Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Configure environment variables (copy from `.env.local`)
   - Click "Deploy"

3. **Set Environment Variables:**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all required variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your production URL

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables in Production

**Critical:** Ensure all environment variables are set in Vercel:

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (set to your production domain)

Optional (for payments):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BASIC_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_ENTERPRISE_PRICE_ID`

### Custom Domain

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Redeploy

### Production Checklist

Before launching to production:

- [ ] All environment variables set in Vercel
- [ ] Custom domain configured
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Database schema applied to production Supabase
- [ ] RLS policies enabled on all Supabase tables
- [ ] Stripe configured for production (live keys, not test keys)
- [ ] SEO meta tags customized
- [ ] Open Graph images created
- [ ] Analytics configured (Google Analytics, PostHog, etc.)
- [ ] Error tracking enabled (Sentry recommended)
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Lighthouse score > 90

---

## Troubleshooting

### Common Issues

#### Issue: "Module not found" errors after installation

**Solution:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
npm install
```

#### Issue: Environment variables not working

**Symptoms:** Can't connect to Supabase, "Invalid API key" errors

**Solution:**
1. Ensure `.env.local` exists (not `.env`)
2. Variables must start with `NEXT_PUBLIC_` to be available in browser
3. Restart dev server after changing environment variables
4. Check for typos in variable names
5. Verify Supabase URL and keys are correct (no extra spaces)

```bash
# Verify your environment variables are loaded
npm run dev

# You should see no warnings about missing variables
```

#### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix type errors in the reported files
# Common issues:
# - Missing type definitions: npm install --save-dev @types/[package]
# - Null/undefined checks: add proper type guards
# - Implicit any types: add explicit types
```

#### Issue: Supabase authentication not working

**Symptoms:** Login/signup returns errors, redirects don't work

**Solution:**
1. **Check Supabase URL Configuration:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` matches your project URL exactly
   - URL should end in `.supabase.co`

2. **Verify Redirect URLs:**
   - In Supabase dashboard, go to Authentication → URL Configuration
   - Add your site URL to "Site URL"
   - Add redirect URLs: `http://localhost:3000/**` (development)
   - Add redirect URLs: `https://yourdomain.com/**` (production)

3. **Check Email Settings:**
   - For development, check spam folder for confirmation emails
   - In Supabase dashboard, Authentication → Email Templates
   - Configure custom SMTP for production

#### Issue: Stripe payments not working

**Solution:**
1. **Test vs Live Mode:**
   - Ensure you're using test keys in development
   - Use live keys only in production
   - Test card: `4242 4242 4242 4242`

2. **Webhook Configuration:**
   - In Stripe dashboard, add webhook endpoint
   - Development: Use Stripe CLI for local testing
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   - Production: `https://yourdomain.com/api/stripe/webhook`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

3. **Price IDs:**
   - Verify `STRIPE_*_PRICE_ID` variables match your Stripe products
   - Price IDs start with `price_`

#### Issue: Dark mode toggle not working

**Solution:**
```bash
# Ensure next-themes is installed
npm install next-themes

# Verify theme provider wraps app in app/layout.tsx
# Check localStorage in browser dev tools
# Key should be "theme" with value "light" or "dark"
```

#### Issue: Build succeeds but page shows 500 error

**Symptoms:** Production build works locally but fails in Vercel

**Solution:**
1. Check Vercel deployment logs for specific errors
2. Verify all environment variables are set in Vercel
3. Check that server-side code doesn't use browser-only APIs
4. Ensure database is accessible from Vercel (Supabase should be public)

```bash
# Test production build locally
npm run build
npm run start

# Check for errors in the terminal
```

#### Issue: Images not loading or broken

**Solution:**
1. **For local images:**
   - Place in `/public` folder
   - Reference as `/image.png` not `./image.png`

2. **For external images:**
   - Add domains to `next.config.js`:
   ```javascript
   images: {
     domains: ['example.com', 'cdn.example.com'],
   }
   ```

3. **For Supabase Storage:**
   - Ensure bucket is public or use signed URLs
   - Check RLS policies on storage bucket

#### Issue: Slow page loads or build times

**Solution:**
1. **Optimize Images:**
   ```bash
   # Use Next.js Image component
   import Image from 'next/image'
   ```

2. **Code Splitting:**
   - Use dynamic imports for large components
   ```typescript
   import dynamic from 'next/dynamic'
   const HeavyComponent = dynamic(() => import('./HeavyComponent'))
   ```

3. **Check Bundle Size:**
   ```bash
   npm run build
   # Look for large bundle warnings
   # Consider removing unused dependencies
   ```

### Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   - Browser console (F12)
   - Terminal output
   - Vercel deployment logs

2. **Search existing issues:**
   - Next.js GitHub: https://github.com/vercel/next.js/issues
   - Supabase GitHub: https://github.com/supabase/supabase/issues

3. **Community support:**
   - Next.js Discord: https://nextjs.org/discord
   - Supabase Discord: https://discord.supabase.com

4. **Contact support:**
   - Email: support@everreach.app
   - GitHub Issues: https://github.com/IsaiahDupree/EverReach/issues

---

## Next Steps

Now that you have the starter kit running:

1. **Customize Branding**
   - Update `config/site.ts` with your app name and description
   - Replace logo and favicon in `/public`
   - Customize colors in `tailwind.config.ts`

2. **Replace Data Model**
   - Update `types/item.ts` with your entity types
   - Modify `hooks/use-items.ts` for your data fetching
   - Update pages in `app/(dashboard)/items/` with your UI

3. **Configure Payments**
   - Set up products and prices in Stripe dashboard
   - Update price IDs in environment variables
   - Customize pricing page in `app/(marketing)/pricing/page.tsx`

4. **Set Up Analytics**
   - Add Google Analytics or PostHog
   - Configure error tracking with Sentry
   - Set up user analytics

5. **Deploy**
   - Follow the Deployment section above
   - Set up custom domain
   - Configure production environment variables

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Web Starter Kit PRD](./PRD_WEB_STARTER_KIT.md)
- [Quick Start Guide](./QUICKSTART.md)
