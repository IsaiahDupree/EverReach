# iOS Development Guide — EverReach App

> How to start, build, and run the EverReach iOS app locally.

---

## Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| **Node.js** | 18+ | `brew install node` |
| **Xcode** | 15+ | Mac App Store |
| **Xcode Command Line Tools** | — | `xcode-select --install` |
| **CocoaPods** | 1.14+ | `sudo gem install cocoapods` |
| **Watchman** | — | `brew install watchman` |
| **EAS CLI** (for cloud builds) | 12+ | `npm install -g eas-cli` |

---

## Project Structure

```
ios-app/
├── app/                    # Expo Router screens (React Native + TypeScript)
├── lib/                    # Shared libraries (analytics, API, Meta events, etc.)
├── ios/                    # Native Xcode project (bare workflow)
│   ├── AIEnhancedPersonalCRM.xcworkspace   ← Open this in Xcode
│   ├── AIEnhancedPersonalCRM.xcodeproj
│   ├── Podfile             # CocoaPods dependencies
│   └── Podfile.lock
├── .env                    # Environment variables (DO NOT commit)
├── .env.example            # Template for .env
├── app.json                # Expo config (bundle ID, plugins, permissions)
├── eas.json                # EAS Build profiles (dev, preview, production)
├── metro.config.js         # Metro bundler config
└── package.json            # Node dependencies + scripts
```

> **This is a bare-workflow Expo app** — it has a native `ios/` directory. You CANNOT use Expo Go. You must use a **development build**.

---

## Quick Start (Daily Development)

### Option A: One Command (Recommended)

```bash
cd ios-app
npx expo run:ios
```

This does everything:
1. Installs CocoaPods if needed
2. Compiles the native Xcode project
3. Installs the app on the default simulator
4. Starts Metro bundler
5. Launches the app

### Option B: Quick Dev Script

```bash
cd ios-app
bash scripts/ios/quick-ios-dev.sh
```

Same as Option A but kills any existing Metro process first and clears cache.

### Option C: Specific Simulator Device

```bash
# List available simulators
xcrun simctl list devices available | grep -E "iPhone|iPad"

# Run on a specific device
npx expo run:ios --device "iPhone 16e"
npx expo run:ios --device "iPhone 17 Pro"
```

---

## Environment Setup

Before running, ensure `.env` exists with required values:

```bash
# If .env doesn't exist, create from template
cp .env.example .env
```

**Critical variables** (app won't function without these):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase anon key |
| `EXPO_PUBLIC_API_URL` | Backend API URL |

**Meta Pixel** (for ad attribution tracking):

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_META_PIXEL_ID` | Pixel ID from Events Manager |
| `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` | Token from Events Manager → Settings → Generate Access Token |
| `EXPO_PUBLIC_META_TEST_EVENT_CODE` | Test code for Test Events tab (e.g. `TEST48268`) |

**Analytics & Monetization:**

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat iOS API key |
| `EXPO_PUBLIC_SUPERWALL_IOS_KEY` | Superwall paywall key |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key |

> All `EXPO_PUBLIC_` variables are bundled into the JS at build time. Changes require a restart of Metro.

---

## Build Scenarios

### 1. Local Development (Simulator)

```bash
npx expo run:ios
```

- Builds Debug configuration
- Hot reload enabled (edit code → auto-refreshes)
- Console logs visible in Metro terminal
- **First build takes ~5 minutes** (compiles all native modules)
- Subsequent builds are incremental (~30 seconds)

### 2. Clean Rebuild (When Things Break)

```bash
bash scripts/clean-and-rebuild-ios.sh
```

This nukes everything and starts fresh:
- Kills Xcode processes
- Deletes DerivedData
- Removes Pods and reinstalls
- Clears build artifacts

Then run `npx expo run:ios` again.

### 3. Open in Xcode (For Native Debugging)

```bash
# Open the workspace (NOT the .xcodeproj)
open ios/AIEnhancedPersonalCRM.xcworkspace
```

In Xcode:
- Select your target device in the toolbar
- Press **Cmd+R** to build and run
- Use **Cmd+Shift+K** to clean build folder if needed
- View native logs in Xcode's console (Debug → Activate Console)

### 4. EAS Cloud Build (TestFlight / App Store)

```bash
# Development build (simulator)
eas build --platform ios --profile development

# Preview build (real device, internal distribution)
eas build --platform ios --profile preview

# Production build (App Store submission)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

---

## Verifying the App Works

After the app launches on the simulator:

### Check the Metro console for these logs:

```
[App] Performance monitoring initialized
[MetaAppEvents] Initialized { pixelId: '100390...', nativeSDK: false, conversionsAPI: true }
[MetaAppEvents] Client IP captured: 73.xxx...
[RevenueCat] ✅ RevenueCat SDK is configured correctly
[PaywallConfig] CONFIG FETCHED
```

### After signing in:

```
[MetaAppEvents] User identified: a1b2c3d4...
[Analytics] Event tracked: screen_viewed
[MetaAppEvents] Event queued: ViewContent
[MetaAppEvents] Conversions API flush success: { events_received: 1 }
```

If you don't see `[MetaAppEvents]` logs, check:
1. `.env` has `EXPO_PUBLIC_META_PIXEL_ID` and `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN`
2. Restart Metro: press `r` in the terminal or kill and re-run

---

## Testing

### Unit Tests
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
```

### Meta Pixel Verification
```bash
# CLI — sends 9 standard events to Meta Conversions API
node scripts/test-meta-pixel.mjs

# Playwright — 10 automated tests (7 direct API + 3 browser-context)
npx playwright test --project=meta-pixel
```

### Maestro E2E (UI automation on simulator)
```bash
npm run test:maestro        # Full test suite
npm run test:maestro:launch # App launch only
npm run test:nav:smoke      # Smoke test
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **"No bundle URL present"** | Metro isn't running. Press `r` to reload or restart with `npx expo run:ios` |
| **Build fails with "database locked"** | Run `bash scripts/clean-and-rebuild-ios.sh` |
| **Pod install fails** | `cd ios && pod install --repo-update` |
| **Simulator not found** | `xcrun simctl list devices available` to check available devices |
| **Port 8081 in use** | `lsof -ti:8081 \| xargs kill -9` then retry |
| **Native module crash** | Clean rebuild: `bash scripts/clean-and-rebuild-ios.sh` |
| **Env vars not loading** | Restart Metro (env vars are baked in at bundle time) |
| **Xcode signing error** | Open `.xcworkspace` → Signing & Capabilities → select your team |

---

## Key Scripts Reference

| Script | Purpose |
|--------|---------|
| `npx expo run:ios` | **Primary dev command** — build + run on simulator |
| `npx expo start` | Start Metro only (app must already be installed) |
| `scripts/ios/quick-ios-dev.sh` | Kill Metro → clear cache → build + run |
| `scripts/clean-and-rebuild-ios.sh` | Nuclear clean — DerivedData, Pods, everything |
| `scripts/build-ios-xcode.sh` | Xcode CLI build (for CI or scripting) |
| `scripts/ios/prepare-ios-appstore.sh` | Prepare for App Store submission |
| `scripts/test-meta-pixel.mjs` | Verify Meta Pixel events (CLI) |

---

*Last updated: February 7, 2026*
