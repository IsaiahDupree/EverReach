# Getting Started

## Complete Setup Guide for New Developers

This guide will walk you through setting up the entire EverReach stack from scratch. By the end, you'll have a fully functional mobile app, web app, backend API, and database running locally and ready for deployment.

---

## Prerequisites

Before you begin, make sure you have:

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 18+ | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Package manager | Comes with Node.js |
| **Git** | 2.x | Version control | [git-scm.com](https://git-scm.com) |
| **Expo CLI** | Latest | Mobile development | `npm install -g expo-cli` |
| **VS Code** | Latest | Code editor | [code.visualstudio.com](https://code.visualstudio.com) |

### Optional but Recommended
| Tool | Purpose |
|------|---------|
| **Xcode** | iOS Simulator (Mac only) |
| **Android Studio** | Android Emulator |
| **Postman** | API testing |

---

## Step 1: Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/YourUsername/EverReach.git

# Navigate into the project
cd EverReach

# Check out the branch you need
git checkout ios-app      # For mobile development
git checkout web-frontend # For web development
git checkout backend      # For API development
```

---

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# If you encounter issues, try:
npm install --legacy-peer-deps
```

### What Gets Installed

| Package | Purpose |
|---------|---------|
| `expo` | Mobile app framework |
| `react-native` | Cross-platform UI |
| `@supabase/supabase-js` | Database client |
| `stripe` | Payment processing |
| `@tanstack/react-query` | Data fetching |
| `expo-router` | Navigation |

---

## Step 3: Environment Configuration

### 3.1 Create Your .env File

```bash
# Copy the example environment file
cp .env.example .env
```

### 3.2 Required Environment Variables

Open `.env` and fill in these values:

```env
# ===========================================
# SUPABASE (Database & Authentication)
# ===========================================
# Get these from: https://supabase.com/dashboard
# Create a new project, then go to Settings > API

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (NEVER expose in frontend!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# BACKEND API
# ===========================================
# Your Vercel deployment URL (or localhost for dev)

EXPO_PUBLIC_BACKEND_URL=https://your-api.vercel.app
# For local development:
# EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# ===========================================
# STRIPE (Payments - Web)
# ===========================================
# Get these from: https://dashboard.stripe.com/apikeys

EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ===========================================
# REVENUECAT (Payments - Mobile)
# ===========================================
# Get these from: https://app.revenuecat.com

REVENUECAT_API_KEY_IOS=appl_...
REVENUECAT_API_KEY_ANDROID=goog_...

# ===========================================
# OPTIONAL: Analytics & Features
# ===========================================

EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3.3 Where to Get Each Key

#### Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose a name and strong password
4. Wait for project to initialize (~2 minutes)
5. Go to **Settings** → **API**
6. Copy the `URL` and `anon public` key

#### Stripe Setup
1. Go to [stripe.com](https://stripe.com) and create account
2. Go to **Developers** → **API keys**
3. Copy the `Publishable key` and `Secret key`
4. For testing, use the `test mode` keys

#### RevenueCat Setup
1. Go to [revenuecat.com](https://revenuecat.com) and create account
2. Create a new project
3. Add your iOS and Android apps
4. Copy the API keys from **Project Settings**

---

## Step 4: Database Setup

### 4.1 Run Migrations

The database schema is pre-configured. Apply it to your Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### 4.2 What Gets Created

| Table | Purpose |
|-------|---------|
| `users` | User profiles |
| `contacts` | CRM contacts |
| `interactions` | Contact interactions |
| `messages` | Message templates |
| `subscriptions` | User subscription status |
| `voice_notes` | Audio recordings |

---

## Step 5: Start Development Server

### For Mobile Development

```bash
# Start Expo development server
npx expo start

# Options after starting:
# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR code with Expo Go app for physical device
```

### For Web Development

```bash
# Start web version
npx expo start --web

# Or use the shortcut
npm run web
```

### For Backend Development

```bash
# Navigate to backend folder
cd backend-vercel

# Start local server
npm run dev

# API will be available at http://localhost:3000
```

---

## Step 6: Verify Everything Works

### Test Checklist

- [ ] App loads without errors
- [ ] Can create a new account
- [ ] Can log in with email/password
- [ ] Can view the home screen
- [ ] API calls return data
- [ ] Database shows new user record

### Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Run `npm install` again |
| "Network request failed" | Check `BACKEND_URL` in .env |
| "Invalid API key" | Verify Supabase keys are correct |
| Metro bundler stuck | Run `npx expo start --clear` |
| iOS build fails | Run `npx pod-install` |

---

## Step 7: Next Steps

Now that you're set up, explore these guides:

1. **[Architecture Overview](02-ARCHITECTURE.md)** - Understand how everything connects
2. **[Backend Setup](03-BACKEND-SETUP.md)** - Deep dive into the API
3. **[Database Guide](04-DATABASE.md)** - Learn the schema
4. **[Deployment](07-DEPLOYMENT.md)** - Ship your app

---

## Need Help?

- 📖 Check the [FAQ](FAQ.md)
- 💬 Join our [Discord](#)
- 📧 Email [support@everreach.app](#)

---

*Estimated setup time: 30-45 minutes*
