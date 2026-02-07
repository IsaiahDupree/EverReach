# Web Starter Kit - Quick Start Guide

Get your web application running in **15 minutes**. This guide will walk you through setup from clone to first run.

---

## What You'll Get

- ✅ **Next.js 14** App Router with TypeScript
- ✅ **Authentication** via Supabase (email/password + OAuth)
- ✅ **Payments** via Stripe (subscriptions)
- ✅ **Modern UI** with Tailwind CSS + shadcn/ui
- ✅ **Dark Mode** with system preference detection
- ✅ **React Query** for data fetching and caching
- ✅ **Responsive Design** for mobile and desktop

---

## Prerequisites

Before you begin, make sure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| **Node.js** | 18+ | `node --version` |
| **npm** or **pnpm** | Latest | `npm --version` |
| **Git** | Latest | `git --version` |

### Accounts Required

You'll need accounts with these services (all have free tiers):

- **[Supabase](https://supabase.com)** - Database & Auth (5 min signup)
- **[Stripe](https://stripe.com)** - Payments (10 min signup, optional for initial testing)

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
cd /path/to/your/projects
git clone https://github.com/YOUR_USERNAME/app-kit.git
cd app-kit/web-kit

# Install dependencies
npm install

# This will install all required packages including:
# - Next.js 14
# - React 18
# - Supabase client
# - Stripe
# - Tailwind CSS
# - shadcn/ui components
# - React Query
```

**Verify installation:**
```bash
npm run build
# Should complete without errors
```

---

## Step 2: Supabase Setup (5 minutes)

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `my-web-app` (or your app name)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to you
4. Click **"Create new project"** (takes ~2 minutes)

### 2.2 Get Your API Keys

1. Once created, go to **Settings** (gear icon) → **API**
2. Copy these values (you'll need them in Step 4):
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **anon public** key - long JWT token starting with `eyJ...`

### 2.3 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the contents of `supabase/schema.sql` from this project
4. Paste into the editor and click **"Run"**
5. Verify tables created: Go to **Table Editor** → should see `users`, `items`, `subscriptions`

### 2.4 Configure Auth Settings

1. Go to **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Click **"Save"**

**Optional - Enable OAuth Providers:**
- Go to **Authentication** → **Providers**
- Enable Google, GitHub, or other providers as needed
- Follow provider-specific setup instructions

---

## Step 3: Stripe Setup (5 minutes, Optional)

> **Note:** You can skip Stripe initially and come back to it later. Auth and core features work without it.

### 3.1 Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for an account
3. Switch to **Test Mode** (toggle in top right)

### 3.2 Get API Keys

1. Go to **Developers** → **API keys**
2. Copy these values (you'll need them in Step 4):
   - **Publishable key** - starts with `pk_test_`
   - **Secret key** - starts with `sk_test_` (click "Reveal test key")

### 3.3 Create Products (Optional)

1. Go to **Products** → **Add product**
2. Create pricing tiers:

**Pro Tier:**
- Name: `Pro Plan`
- Price: $9/month
- Copy the **Price ID** (starts with `price_`)

**Business Tier:**
- Name: `Business Plan`
- Price: $29/month
- Copy the **Price ID**

### 3.4 Set Up Webhooks

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Set:
   - **Endpoint URL**: `https://yoursite.com/api/stripe/webhook` (update after deployment)
   - **Events**: Select:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Click **"Add endpoint"**
4. Copy the **Signing secret** (starts with `whsec_`)

> **For local testing:** Use Stripe CLI - see [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)

---

## Step 4: Environment Configuration (2 minutes)

### 4.1 Create Environment File

```bash
# Copy the example file
cp .env.example .env.local
```

### 4.2 Fill in Your Values

Open `.env.local` and replace the placeholder values:

```bash
# Supabase (from Step 2.2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Stripe (from Step 3.2 - Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Step 3.3 - Optional)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Verification:**
```bash
# Make sure no placeholder values remain
grep "your-" .env.local
# Should return empty if all values replaced
```

---

## Step 5: Run the Application (1 minute)

### 5.1 Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### 5.2 Open in Browser

Navigate to: **http://localhost:3000**

You should see the landing page with:
- Navigation bar
- Hero section
- Features section
- Call-to-action buttons

---

## Step 6: Test Core Features (5 minutes)

### 6.1 Test Authentication

1. Click **"Sign Up"** in the navigation
2. Create an account with email/password
3. Check your email for verification (if enabled)
4. Log in with your credentials
5. You should be redirected to `/dashboard`

### 6.2 Test Dashboard

Once logged in:
- ✅ Dashboard shows welcome message
- ✅ Sidebar navigation visible
- ✅ User menu in top right
- ✅ Can navigate to Settings
- ✅ Can view Items list

### 6.3 Test Dark Mode

1. Look for the theme toggle (sun/moon icon)
2. Click to switch between light/dark modes
3. Verify all pages adapt to theme

### 6.4 Test Logout

1. Click your user menu
2. Select **"Logout"**
3. You should be redirected to landing page

---

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Issue: Supabase connection fails

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check no extra spaces in `.env.local`
3. Restart dev server: `Ctrl+C` then `npm run dev`

### Issue: Auth redirect fails

**Solution:**
1. Go to Supabase → **Authentication** → **URL Configuration**
2. Verify `http://localhost:3000/auth/callback` is in Redirect URLs
3. Verify Site URL is `http://localhost:3000`

### Issue: Styles not loading

**Solution:**
```bash
# Rebuild Tailwind
npm run build
npm run dev
```

### Issue: TypeScript errors

**Solution:**
```bash
# Check types
npx tsc --noEmit

# Install missing types
npm install --save-dev @types/react @types/node
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

---

## Next Steps

Now that your app is running, here's what to do next:

### 1. Customize Your App (1-2 days)

- [ ] Update `config/site.ts` with your app name and description
- [ ] Replace placeholder logo in `components/layout/navbar.tsx`
- [ ] Customize colors in `tailwind.config.ts`
- [ ] Edit landing page content in `app/(marketing)/page.tsx`

### 2. Define Your Data Model (1 day)

- [ ] Create your types in `types/` directory
- [ ] Design database tables in Supabase
- [ ] Update `supabase/schema.sql` with your tables
- [ ] Create React Query hooks in `hooks/` for your data

### 3. Build Your Features (2-4 days)

- [ ] Replace `/items` pages with your entity
- [ ] Create components in `components/` for your features
- [ ] Update navigation in `config/nav.ts`
- [ ] Add your business logic to pages

### 4. Test & Polish (1-2 days)

- [ ] Test all authentication flows
- [ ] Test subscription/payment flows (if using Stripe)
- [ ] Test on mobile devices
- [ ] Run `npm run build` to check for errors
- [ ] Fix any TypeScript errors

### 5. Deploy to Production

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

Quick deploy to Vercel:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

---

## Project Structure Overview

```
web-kit/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── (dashboard)/         # Protected pages
│   ├── (marketing)/         # Public pages
│   └── api/                 # API routes
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   ├── auth/                # Auth-related components
│   └── billing/             # Payment components
├── lib/                     # Utilities
│   ├── supabase/           # Supabase clients
│   └── stripe/             # Stripe utilities
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript types
├── config/                  # Configuration files
└── middleware.ts           # Auth middleware
```

**Key files to customize:**
- `config/site.ts` - Site metadata
- `config/nav.ts` - Navigation items
- `tailwind.config.ts` - Theme colors
- `app/(marketing)/page.tsx` - Landing page

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Documentation

- **QUICKSTART.md** (this file) - Setup guide
- **docs/CUSTOMIZATION.md** - How to customize the starter
- **docs/DEPLOYMENT.md** - Deploy to production
- **docs/COMPONENTS.md** - UI component reference
- **docs/API_REFERENCE.md** - API routes documentation

---

## Tech Stack Reference

| Technology | Purpose | Documentation |
|------------|---------|--------------|
| **Next.js 14** | React framework | [nextjs.org/docs](https://nextjs.org/docs) |
| **Tailwind CSS** | Styling | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| **shadcn/ui** | UI components | [ui.shadcn.com](https://ui.shadcn.com) |
| **Supabase** | Database & Auth | [supabase.com/docs](https://supabase.com/docs) |
| **Stripe** | Payments | [stripe.com/docs](https://stripe.com/docs) |
| **React Query** | Data fetching | [tanstack.com/query](https://tanstack.com/query) |

---

## Getting Help

### Common Resources

- **Next.js Issues**: Check [Next.js GitHub Issues](https://github.com/vercel/next.js/issues)
- **Supabase Issues**: Visit [Supabase Discord](https://discord.supabase.com)
- **Stripe Issues**: Check [Stripe Docs](https://stripe.com/docs)

### Debugging Tips

**Check the browser console:**
```
Right click → Inspect → Console
```

**Check the terminal output:**
- Compilation errors show in terminal
- API route errors show in terminal
- Database errors show in terminal

**Enable verbose logging:**
```bash
# Add to .env.local
DEBUG=*
```

---

## What's Included

### Authentication
- Email/password signup and login
- OAuth providers (Google, GitHub, etc.)
- Password reset flow
- Email verification
- Protected routes with middleware

### User Dashboard
- User profile page
- Settings page
- Account management
- Subscription status

### Payments (via Stripe)
- Pricing page with tiers
- Checkout flow
- Subscription management
- Billing portal
- Webhook handling

### UI Components (via shadcn/ui)
- Button, Input, Card, Dialog
- Dropdown Menu, Avatar, Badge
- Table, Tabs, Toast notifications
- Form components with validation

### Features
- Dark mode with persistence
- Responsive mobile design
- SEO optimized (meta tags, sitemap)
- Loading states and error handling
- Type-safe with TypeScript

---

## Success Checklist

After completing this guide, you should be able to:

- [ ] Access the app at `http://localhost:3000`
- [ ] Sign up for a new account
- [ ] Log in with your credentials
- [ ] See the dashboard after login
- [ ] Toggle dark mode
- [ ] Navigate between pages
- [ ] Log out successfully

**If all items are checked, you're ready to start customizing!**

---

## Time Breakdown

| Step | Time | Status |
|------|------|--------|
| Clone & Install | 2 min | ⬜ |
| Supabase Setup | 5 min | ⬜ |
| Stripe Setup (optional) | 5 min | ⬜ |
| Environment Config | 2 min | ⬜ |
| Run Application | 1 min | ⬜ |
| Test Features | 5 min | ⬜ |
| **Total** | **15-20 min** | |

---

**Congratulations!** 🎉 You now have a production-ready web application running locally.

Ready to customize? Check out `docs/CUSTOMIZATION.md` next.
