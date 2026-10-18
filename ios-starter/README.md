# EverReach iOS Starter Kit

A production-ready React Native mobile app starter kit built with Expo, featuring authentication, subscriptions, and modern mobile development best practices.

## Overview

The EverReach iOS Starter Kit is a complete foundation for building subscription-based mobile applications. Built with React Native, Expo, and Supabase, this starter kit provides everything you need to launch a production-ready mobile app in weeks instead of months.

**Key Features:**
- **Authentication:** Email/password, Google OAuth, Apple Sign In, and magic links
- **Subscription System:** RevenueCat integration with in-app purchases for iOS and Android
- **Modern Navigation:** File-based routing with Expo Router (tabs, stacks, modals)
- **Database:** Supabase backend with PostgreSQL and real-time subscriptions
- **Dark Mode:** Automatic theme switching with manual toggle support
- **Type Safety:** Full TypeScript support with strict mode
- **Testing:** Jest and React Native Testing Library setup
- **Developer Tools:** In-app customization guide overlay (DEV_MODE)

**Tech Stack:**
- **Framework:** React Native 0.74 with Expo SDK 51
- **Navigation:** Expo Router (file-based routing)
- **Backend:** Supabase (authentication, database, storage)
- **Payments:** RevenueCat (iOS and Android subscriptions)
- **State Management:** React Query for server state
- **Styling:** React Native StyleSheet with theme support
- **Type Checking:** TypeScript 5.3+

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - For version control

### Development Tools
- **Xcode** (for iOS development on macOS) - [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
  - Includes iOS Simulator
  - Required for native builds
- **Android Studio** (for Android development) - [Download here](https://developer.android.com/studio)
  - Includes Android Emulator
  - Android SDK required
- **Expo Go app** (optional, for testing on physical devices)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Required Accounts
- **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
  - Create a new project
  - Note your project URL and anon key
- **RevenueCat Account** - [Sign up at revenuecat.com](https://revenuecat.com)
  - Set up iOS and Android apps
  - Configure subscription products
- **Expo Account** (for EAS builds) - [Sign up at expo.dev](https://expo.dev)
  - Required for cloud builds

### Platform-Specific Requirements

**macOS (for iOS development):**
- macOS 12.0 or later
- Xcode 14.0 or later
- Command Line Tools for Xcode

**Windows/Linux (Android only):**
- Android Studio with Android SDK
- Java Development Kit (JDK) 11 or later

## Quick Start

Get the app running locally in under 15 minutes:

### 1. Clone and Install

```bash
# Navigate to the ios-starter directory
cd ios-starter

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Open .env and fill in your credentials
# Get these from your Supabase project settings
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# RevenueCat keys (optional for initial testing)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your-key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your-key

# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000

# Enable developer mode overlay
DEV_MODE=true
```

### 3. Set Up Supabase Database

```bash
# If you have the Supabase CLI installed:
cd ../backend-kit
supabase db push

# Or manually run the SQL in supabase/schema.sql
# through the Supabase dashboard SQL editor
```

### 4. Start the Development Server

```bash
# Start Expo development server
npm start

# Or use platform-specific commands:
npm run ios     # Start on iOS simulator
npm run android # Start on Android emulator
```

### 5. Open the App

**Using iOS Simulator:**
- Press `i` in the terminal
- Or run `npm run ios`
- Simulator will launch automatically

**Using Android Emulator:**
- Press `a` in the terminal
- Or run `npm run android`
- Emulator must be running first

**Using Expo Go (Physical Device):**
- Install Expo Go on your device
- Scan the QR code shown in terminal
- App will load on your device

### 6. Verify Installation

You should see:
- Login screen on first launch
- Ability to create an account
- Access to the main tab navigation after login
- DEV MODE button (if DEV_MODE=true in .env)

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory with these variables:

```bash
# Supabase Configuration
# Required for authentication and database access
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API
# Points to your Next.js backend (see backend-kit/)
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Optional Environment Variables

```bash
# RevenueCat Configuration
# Required only if using in-app purchases
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your-ios-key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your-android-key

# Development Mode
# Shows in-app customization guide
DEV_MODE=true

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false
```

### Getting Your Credentials

**Supabase:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key

**RevenueCat:**
1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Select your project
3. Go to Apps → Select platform
4. Copy the API key (starts with `appl_` for iOS, `goog_` for Android)

**Important Notes:**
- All `EXPO_PUBLIC_*` variables are embedded in the app at build time
- Never put sensitive secrets in `EXPO_PUBLIC_*` variables
- Set `DEV_MODE=false` before production builds
- Restart the dev server after changing environment variables

## Available Scripts

### Development Commands

```bash
# Start Expo development server
npm start
# Or use the dev alias:
npm run dev
# Opens Metro bundler with QR code and options

# Start on iOS simulator
npm run ios
# Or use the dev alias:
npm run dev:ios
# Requires Xcode and iOS Simulator

# Start on Android emulator
npm run android
# Or use the dev alias:
npm run dev:android
# Requires Android Studio and emulator

# Start with tunnel connection (for testing on physical devices)
npm run dev:tunnel
# Creates a tunnel URL accessible from anywhere

# Start for web browser (limited support)
npm run web
# Web support is experimental
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Code Quality Commands

```bash
# Run ESLint
npm run lint

# Type check TypeScript
npm run type-check
```

### Build Commands (Requires EAS)

```bash
# Login to Expo
npx eas login

# Configure your project
npx eas build:configure

# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android

# Build for both platforms
npx eas build --platform all
```

## Architecture

### Tech Stack Overview

**Frontend:**
- **React Native 0.74** - Cross-platform mobile framework
- **Expo SDK 51** - Development tools and native APIs
- **Expo Router 3.5** - File-based routing and navigation
- **TypeScript 5.3** - Type safety and developer experience

**Backend & Services:**
- **Supabase** - PostgreSQL database, authentication, real-time subscriptions
- **RevenueCat** - In-app purchase management and subscription analytics
- **React Query** - Server state management and caching

**Development:**
- **Jest** - Unit testing framework
- **React Native Testing Library** - Component testing
- **ESLint** - Code linting
- **TypeScript** - Static type checking

### Project Structure

```
ios-starter/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx      # Login screen
│   │   ├── signup.tsx     # Signup screen
│   │   └── _layout.tsx    # Auth stack layout
│   ├── (tabs)/            # Main tab navigation
│   │   ├── index.tsx      # Home/items list
│   │   ├── search.tsx     # Search screen
│   │   ├── settings.tsx   # Settings screen
│   │   └── _layout.tsx    # Tab layout
│   ├── item/[id].tsx      # Item detail (dynamic route)
│   ├── profile.tsx        # User profile
│   ├── paywall.tsx        # Subscription paywall
│   └── _layout.tsx        # Root layout
│
├── components/            # Reusable UI components
│   ├── auth/             # Auth-specific components
│   ├── common/           # Shared components (Button, Input, Card)
│   ├── items/            # Item list/form components
│   └── dev/              # Developer mode overlay
│
├── hooks/                # React hooks
│   ├── useAuth.ts        # Authentication state
│   ├── useItems.ts       # Items CRUD operations
│   ├── useUser.ts        # User profile operations
│   └── useSubscription.ts # Subscription status
│
├── lib/                  # Utilities and configurations
│   ├── supabase.ts       # Supabase client setup
│   └── revenuecat.ts     # RevenueCat configuration
│
├── providers/            # React context providers
│   ├── AuthProvider.tsx  # Auth context
│   └── ThemeProvider.tsx # Dark mode theme
│
├── types/                # TypeScript type definitions
│   ├── item.ts           # Item entity types
│   ├── user.ts           # User types
│   └── subscription.ts   # Subscription types
│
├── constants/            # App constants
│   ├── colors.ts         # Color palette
│   └── config.ts         # App configuration
│
├── supabase/             # Database schema
│   └── schema.sql        # Database migrations
│
├── __tests__/            # Test files
├── .env.example          # Environment template
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

### Data Flow

1. **User Interaction** → Component (e.g., `app/(tabs)/index.tsx`)
2. **Component** → Custom Hook (e.g., `hooks/useItems.ts`)
3. **Hook** → React Query mutation/query
4. **React Query** → Supabase client (`lib/supabase.ts`)
5. **Supabase** → PostgreSQL database with Row Level Security
6. **Response** → React Query cache → Component update

### Navigation with Expo Router

Expo Router provides file-based routing similar to Next.js:

- **Routes:** Each file in `app/` becomes a route
- **Dynamic Routes:** `[id].tsx` creates dynamic segments
- **Layouts:** `_layout.tsx` wraps child routes
- **Groups:** `(auth)/` creates route groups without adding path segments
- **Navigation:** Use `router.push()`, `router.back()`, `<Link>` components

Example:
```typescript
// Navigate programmatically
import { router } from 'expo-router';
router.push('/item/123');

// Or use Link component
import { Link } from 'expo-router';
<Link href="/item/123">View Item</Link>
```

### Authentication Flow

1. User opens app → Check session in SecureStore
2. No session → Redirect to `/login`
3. Login success → Supabase creates session → Store tokens
4. Session exists → Load user data → Show app content
5. Logout → Clear SecureStore → Redirect to `/login`

### Subscription Flow (RevenueCat)

1. User taps upgrade → Navigate to `/paywall`
2. Display available products from RevenueCat
3. User selects tier → RevenueCat handles purchase
4. Purchase success → RevenueCat webhook updates database
5. App checks entitlements → Unlock features

## Deployment

### Prerequisites for Deployment

1. **Expo Account** - Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI** - Install globally: `npm install -g eas-cli`
3. **Apple Developer Account** ($99/year) - For iOS App Store
4. **Google Play Developer Account** ($25 one-time) - For Android

### Initial Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
npx eas login

# Configure your project for EAS Build
npx eas build:configure

# This creates/updates eas.json with build profiles
```

### Update App Configuration

1. **Edit `app.json`:**
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

2. **Get EAS Project ID:**
```bash
# Creates project on Expo servers
npx eas build:configure
# Updates app.json with projectId
```

### Building for iOS

```bash
# Build for iOS (production)
npx eas build --platform ios --profile production

# Build for iOS simulator (testing)
npx eas build --platform ios --profile development

# Build and auto-submit to TestFlight
npx eas build --platform ios --auto-submit
```

**Build Profiles (from eas.json):**
- **development** - For testing on simulator (includes dev client)
- **preview** - Internal testing on real devices
- **production** - App Store submission

### Building for Android

```bash
# Build for Android (production)
npx eas build --platform android --profile production

# Build and auto-submit to Google Play
npx eas build --platform android --auto-submit
```

### Submitting to App Stores

**iOS (App Store):**
```bash
# Submit to App Store Connect
npx eas submit --platform ios

# You'll need:
# - Apple ID credentials
# - App-specific password
# - App created in App Store Connect
```

**Android (Google Play):**
```bash
# Submit to Google Play Console
npx eas submit --platform android

# You'll need:
# - Google Service Account JSON
# - App created in Google Play Console
```

### Environment Variables in Production

Set production environment variables in EAS:

```bash
# Set secrets for builds
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"

# Important: Set DEV_MODE to false for production
npx eas secret:create --scope project --name DEV_MODE --value "false"
```

### Over-the-Air (OTA) Updates

Update your app without going through app store review:

```bash
# Publish an update
npx eas update --branch production --message "Bug fixes"

# Configure auto-updates in app.json:
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]"
    }
  }
}
```

**Limitations:**
- Only JavaScript/TypeScript changes
- Cannot update native code
- Cannot change app.json configuration

### Production Checklist

Before submitting to app stores:

- [ ] Set `DEV_MODE=false` in production environment
- [ ] Update app name, version, and bundle identifiers in `app.json`
- [ ] Test on real devices (iOS and Android)
- [ ] Configure App Store/Play Store listings
- [ ] Set up RevenueCat products and pricing
- [ ] Configure Supabase production database
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Add app icons and splash screens
- [ ] Test in-app purchases in sandbox environment
- [ ] Review and test all authentication flows
- [ ] Check all environment variables are set correctly

## Troubleshooting

### Common Issues

#### Issue: "Metro bundler not starting" or stuck at "Waiting for connection"

**Solution:**
```bash
# Clear Metro bundler cache
npx expo start --clear

# Or clear watchman cache
watchman watch-del-all

# Reset Expo cache
rm -rf node_modules/.cache
```

#### Issue: "Module not found" errors after installing packages

**Solution:**
```bash
# Clear all caches and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Restart with clean cache
npx expo start --clear
```

#### Issue: iOS Simulator not launching

**Solution:**
```bash
# Make sure Xcode Command Line Tools are installed
xcode-select --install

# Reset iOS Simulator
# Open Simulator app → Device → Erase All Content and Settings

# If still failing, specify simulator explicitly
npx expo start --ios --device "iPhone 15 Pro"
```

#### Issue: Android emulator connection failed

**Solution:**
```bash
# Check if emulator is running
adb devices

# If no devices, start emulator from Android Studio
# Or use command line:
~/Library/Android/sdk/emulator/emulator -avd Pixel_5_API_33

# Reset ADB server
adb kill-server
adb start-server
```

#### Issue: "Unable to resolve module" after adding new dependencies

**Solution:**
```bash
# Install pods for iOS (if using native modules)
cd ios && pod install && cd ..

# Clear all caches
npm start -- --reset-cache

# If still failing, rebuild the app completely
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
```

#### Issue: Supabase authentication not working

**Solution:**
1. Verify environment variables are set correctly in `.env`
2. Check Supabase project status (not paused)
3. Verify API keys are correct (URL and anon key)
4. Check if RLS policies are configured properly
5. Restart development server after changing `.env`

#### Issue: RevenueCat purchases failing in development

**Solution:**
```bash
# For iOS:
# 1. Use sandbox Apple ID (create in App Store Connect)
# 2. Sign out of real Apple ID in Settings → App Store
# 3. App will prompt for sandbox credentials during purchase

# For Android:
# 1. Use test account added in Google Play Console
# 2. Install app via internal testing track
# 3. Purchases will be in test mode automatically
```

#### Issue: TypeScript errors showing in IDE but app runs

**Solution:**
```bash
# Run type check manually
npm run type-check

# Install missing type definitions
npm install --save-dev @types/react @types/react-native

# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) → "TypeScript: Restart TS Server"
```

#### Issue: Build failing on EAS

**Solution:**
1. Check build logs in Expo dashboard
2. Verify `eas.json` configuration is correct
3. Ensure all secrets are set via `eas secret:create`
4. Try building locally first:
   ```bash
   # Install local build tools
   npm install -g eas-cli

   # Build locally
   eas build --platform ios --local
   ```

#### Issue: App crashes on startup

**Solution:**
1. Check console logs in Xcode or Android Studio
2. Verify all required environment variables are set
3. Clear app data and reinstall:
   ```bash
   # iOS: Delete app from simulator and reinstall
   # Android:
   adb uninstall com.yourcompany.yourapp
   npm run android
   ```
4. Check for console errors in Metro bundler terminal

### Getting Help

If you're still stuck after trying these solutions:

1. **Check the documentation:**
   - [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
   - [docs/CUSTOMIZATION.md](./docs/CUSTOMIZATION.md) - Customization guide

2. **Review logs:**
   - Metro bundler terminal output
   - Xcode console (iOS)
   - Android Studio Logcat (Android)
   - EAS build logs (for builds)

3. **Common resources:**
   - [Expo Documentation](https://docs.expo.dev/)
   - [React Native Documentation](https://reactnative.dev/)
   - [Supabase Documentation](https://supabase.com/docs)
   - [RevenueCat Documentation](https://docs.revenuecat.com/)

4. **Search for similar issues:**
   - [Expo Forums](https://forums.expo.dev/)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
   - GitHub Issues for specific packages

### Debug Mode

Enable additional debugging:

```typescript
// In lib/supabase.ts, add:
const supabase = createClient(url, anonKey, {
  auth: {
    debug: true // Logs auth events
  }
})

// In app/_layout.tsx, add:
if (__DEV__) {
  console.log('Running in development mode');
  console.log('Environment variables:', {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  });
}
```

## Next Steps

After getting the app running:

1. **Explore the codebase:**
   - Run the app and tap the "DEV MODE" button
   - Review the customization checklist
   - Read [QUICKSTART.md](./QUICKSTART.md) for a guided tour

2. **Customize for your app:**
   - Replace the generic "Item" model with your entity
   - Update the database schema in `supabase/schema.sql`
   - Modify screens in `app/` directory
   - Update branding in `app.json`

3. **Set up services:**
   - Configure RevenueCat products and pricing
   - Set up authentication providers (Google, Apple)
   - Configure push notifications (if needed)
   - Add analytics and crash reporting

4. **Learn more:**
   - [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
   - [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
   - [RevenueCat React Native SDK](https://docs.revenuecat.com/docs/reactnative)

---

**Questions or Issues?** Check the [docs/](./docs/) directory for more detailed guides, or review the inline code comments for implementation details.
