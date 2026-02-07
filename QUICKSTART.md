# EverReach iOS Starter Kit - Quick Start Guide

Get your iOS app up and running in **15 minutes** with this step-by-step guide.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Node.js** | 18+ | [Download](https://nodejs.org/) |
| **npm** | Latest | Comes with Node.js |
| **Expo CLI** | Latest | `npm install -g expo-cli` |
| **Git** | Latest | [Download](https://git-scm.com/) |

**Optional but Recommended:**
- **Xcode** (15+) - For iOS simulator on macOS
- **VS Code** - Recommended code editor
- **EAS CLI** - For cloud builds: `npm install -g eas-cli`

---

## Quick Start (15 min)

### Step 1: Clone & Install (3 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/everreach-ios-starter.git my-app
cd my-app

# Install dependencies
npm install

# Or using bun (faster)
bun install
```

### Step 2: Set Up Supabase (5 minutes)

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and sign up/login
   - Click **"New Project"**
   - Enter project details (name, database password, region)
   - Wait ~2 minutes for project provisioning

2. **Get Your API Credentials:**
   - In your Supabase project dashboard, go to **Settings → API**
   - Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy the **anon/public** key (starts with `eyJhbGciOi...`)

3. **Initialize the Database:**
   - Go to **SQL Editor** in your Supabase dashboard
   - Open the file `supabase/schema.sql` from your project
   - Copy the entire contents and paste into the SQL Editor
   - Click **"Run"** to create all tables and policies

### Step 3: Configure Environment Variables (2 minutes)

```bash
# Copy the example environment file
cp .env.example .env
```

Open `.env` in your editor and update these required variables:

```bash
# Supabase Configuration (from Step 2)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API URL (use localhost for development)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Development Mode (shows the DEV button overlay)
DEV_MODE=true
```

**Optional variables:**
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY` - For in-app purchases (add later)
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` - For Android subscriptions (add later)

### Step 4: Run the App (2 minutes)

```bash
# Start the Expo development server
npx expo start
```

**In the terminal:**
- Press **`i`** to open iOS simulator (requires Xcode on macOS)
- Press **`a`** to open Android emulator (requires Android Studio)
- Press **`w`** to open in web browser
- Scan the QR code with Expo Go app on your physical device

**Expected Result:**
- App launches successfully
- You see the login/signup screen
- A purple **"DEV"** button appears in the corner (tap it to see customization guide)

### Step 5: Test the App (3 minutes)

1. **Create an Account:**
   - Tap "Sign Up"
   - Enter email and password
   - Verify you can create an account

2. **Explore the App:**
   - Navigate through the tabs (Home, Search, Settings)
   - View the sample items (if database seed data exists)
   - Open Settings to see profile options

3. **Tap the DEV Button:**
   - Tap the purple "DEV" button in the corner
   - Read the in-app customization checklist
   - See which files you need to modify for your use case

---

## What You Get Out of the Box

✅ **Authentication** - Email/password, OAuth (Google, Apple), magic links
✅ **User Management** - Profile editing, avatar upload, account deletion
✅ **Navigation** - Tab bar (Home/Search/Settings), stack navigation, modals
✅ **Subscription System** - RevenueCat integration, paywall, restore purchases
✅ **Data Layer** - Supabase client, React Query hooks, optimistic updates
✅ **UI Components** - Themed buttons, inputs, cards with dark mode support
✅ **Type Safety** - Full TypeScript coverage with generated Supabase types
✅ **Testing Setup** - Jest configured with React Native Testing Library
✅ **Developer Mode** - In-app overlay showing what to customize

---

## Project Structure

```
my-app/
├── app/                    # 📱 Screens (Expo Router)
│   ├── (auth)/            # Login, signup, password reset
│   ├── (tabs)/            # Main tab navigation (home, search, settings)
│   ├── item/[id].tsx      # Item detail screen
│   ├── paywall.tsx        # Subscription screen
│   └── profile.tsx        # User profile
├── components/            # 🧩 UI Components
│   ├── common/            # Button, Input, Card, LoadingSpinner
│   ├── items/             # ItemCard, ItemForm, ItemDetail
│   └── dev/               # DevModeOverlay
├── hooks/                 # 🪝 React Query Hooks
│   ├── useAuth.ts         # Authentication state & methods
│   ├── useItems.ts        # CRUD operations for items
│   ├── useUser.ts         # User profile operations
│   └── useSubscription.ts # Subscription status
├── lib/                   # 📚 Core Libraries
│   ├── supabase.ts        # Supabase client configuration
│   └── revenuecat.ts      # RevenueCat setup (payments)
├── types/                 # 📝 TypeScript Types
│   ├── item.ts            # Item entity types
│   ├── user.ts            # User types
│   └── subscription.ts    # Subscription types
├── providers/             # 🔌 React Context Providers
│   ├── AuthProvider.tsx   # Auth state management
│   └── ThemeProvider.tsx  # Dark mode support
├── constants/             # ⚙️ Configuration
│   ├── config.ts          # App configuration
│   └── colors.ts          # Theme colors
└── supabase/              # 🗄️ Database
    └── schema.sql         # Database schema with RLS policies
```

---

## Next Steps

### 1. Read the Documentation
- **`docs/CUSTOMIZATION.md`** - Learn how to customize for your app
- **`PRD_IOS_STARTER_KIT.md`** - Full product requirements
- **`DEVELOPER_HANDOFF.md`** - Complete setup guide for all 3 kits

### 2. Customize Your App

**First customizations (1-2 hours):**
1. Update app name in `app.json`
2. Change bundle identifier in `app.json`
3. Update colors in `constants/colors.ts`
4. Replace app icon and splash screen in `assets/`

**Core customizations (1-2 days):**
1. Replace the "Item" entity with your domain model
   - Update types in `types/item.ts`
   - Modify database schema in `supabase/schema.sql`
   - Update hooks in `hooks/useItems.ts`
   - Customize screens in `app/(tabs)/index.tsx` and `app/item/[id].tsx`

### 3. Set Up Payments (Optional)

If you want subscription payments:

1. Create a [RevenueCat](https://revenuecat.com) account
2. Set up your app in App Store Connect
3. Configure products in RevenueCat dashboard
4. Add API keys to `.env`:
   ```bash
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
   ```
5. Test paywall screen at `app/paywall.tsx`

### 4. Deploy Your Backend

The starter works with the **Backend Kit** (Next.js API):

```bash
cd ../backend-kit
npm install
npm run dev
```

See `backend-kit/QUICKSTART.md` for backend setup.

### 5. Build for Production

```bash
# Configure EAS build
eas build:configure

# Create a development build
eas build --profile development --platform ios

# Create a production build
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

---

## Troubleshooting

### App won't start

```bash
# Clear Expo cache
npx expo start --clear

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection errors

- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Check that the Supabase project is active (not paused)
- Confirm you ran the `schema.sql` in SQL Editor

### iOS simulator not opening

- Ensure Xcode is installed: `xcode-select --install`
- Open Xcode and accept license agreements
- Run `sudo xcodebuild -license accept`

### TypeScript errors

```bash
# Regenerate TypeScript types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## Getting Help

- **Documentation:** Check `docs/CUSTOMIZATION.md` for detailed guides
- **Issues:** [GitHub Issues](https://github.com/yourusername/everreach-ios-starter/issues)
- **Expo Docs:** [expo.dev/docs](https://docs.expo.dev)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)

---

## What's Included in This Starter Kit

| Feature | Status | Location |
|---------|--------|----------|
| Email/Password Auth | ✅ Ready | `app/(auth)/login.tsx` |
| OAuth (Google, Apple) | ✅ Ready | `components/auth/OAuthButtons.tsx` |
| User Profile | ✅ Ready | `app/profile.tsx` |
| Dark Mode | ✅ Ready | `providers/ThemeProvider.tsx` |
| Tab Navigation | ✅ Ready | `app/(tabs)/_layout.tsx` |
| CRUD Operations | ✅ Ready | `hooks/useItems.ts` |
| Subscriptions/Paywall | ✅ Ready | `app/paywall.tsx` |
| Database Schema | ✅ Ready | `supabase/schema.sql` |
| Type Safety | ✅ Ready | `types/` directory |
| Testing Setup | ✅ Ready | `jest.config.js` |
| Developer Guide | ✅ Ready | Tap DEV button in app |

---

**Time to Ship:** You can have a production-ready iOS app in **2 weeks** by customizing this starter kit instead of building from scratch. Start by exploring the app, reading `docs/CUSTOMIZATION.md`, and replacing the sample "Item" entity with your own domain model.

Happy building! 🚀
