# Deployment Guide

## Ship to App Store, Play Store, and Web

This guide walks you through deploying your app to production across all platforms.

---

## Deployment Overview

| Platform | Tool | Time | Cost |
|----------|------|------|------|
| **iOS App Store** | EAS Build + Apple | 1-7 days review | $99/year |
| **Google Play Store** | EAS Build + Google | 1-3 days review | $25 one-time |
| **Web** | Vercel | Instant | Free tier available |
| **Backend API** | Vercel | Instant | Free tier available |

---

## Part 1: iOS Deployment

### Prerequisites
- Apple Developer Account ($99/year)
- Mac with Xcode installed
- App icons and screenshots ready

### Step 1: Apple Developer Setup

1. Go to [developer.apple.com](https://developer.apple.com)
2. Enroll in Apple Developer Program
3. Create an **App ID**:
   - Identifiers → App IDs → New
   - Bundle ID: `com.yourcompany.everreach`
4. Create **Provisioning Profiles**:
   - Development profile (for testing)
   - Distribution profile (for App Store)

### Step 2: App Store Connect Setup

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **"+"** → **"New App"**
3. Fill in:
   - Platform: iOS
   - Name: EverReach
   - Primary Language: English
   - Bundle ID: Select your App ID
   - SKU: `everreach-ios-001`

### Step 3: EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      }
    }
  }
}
```

### Step 4: Build & Submit

```bash
# Login to EAS
eas login

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

### Step 5: App Store Review Checklist

- [ ] App icon (1024x1024)
- [ ] Screenshots for all device sizes
- [ ] App description (max 4000 chars)
- [ ] Keywords (max 100 chars)
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Age rating questionnaire completed
- [ ] In-app purchases configured (if applicable)

---

## Common EAS Build Failures

Based on production experience with EverReach v1.1.0/v1.1.2, here are critical fixes to prevent build rejections.

### 1. appVersionSource Must Be "local"

**Problem:** EAS defaults to `"remote"` which pulls version from App Store Connect, causing version number mismatches and build failures.

**Solution:** Set in `eas.json`:

```json
{
  "cli": {
    "appVersionSource": "local"  // ← CRITICAL: Must be "local"
  }
}
```

**Why:** Remote versioning can lag behind your `app.json`, causing builds to fail with "version already exists" errors.

---

### 2. ASC App ID Must Be Set Before First Submission

**Problem:** If `ascAppId` is missing or placeholder (e.g., `"1234567890"`), `eas submit` will fail.

**Solution:** Get your ASC App ID:

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Copy the **App ID** from the URL: `https://appstoreconnect.apple.com/apps/{APP_ID}/appstore`
4. Update `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6753190951",  // ← Replace with YOUR app ID
        "appleTeamId": "Y4HDXFWXUV"  // ← Your team ID
      }
    }
  }
}
```

**Checklist before first build:**
- [ ] `ascAppId` is a real 10-digit number (not `1234567890`)
- [ ] `appleTeamId` matches your Apple Developer account
- [ ] `appleId` is your Apple ID email

---

### 3. Bun Conflicts (BUN_INSTALL=0)

**Problem:** If you use Bun locally, EAS might try to use it in the cloud build, causing dependency resolution failures.

**Solution:** Force npm in all EAS build profiles:

```json
{
  "build": {
    "development": {
      "env": {
        "NPM_CONFIG_PACKAGE_MANAGER": "npm",
        "BUN_INSTALL": "0"
      }
    },
    "preview": {
      "env": {
        "NPM_CONFIG_PACKAGE_MANAGER": "npm",
        "BUN_INSTALL": "0"
      }
    },
    "production": {
      "env": {
        "NPM_CONFIG_PACKAGE_MANAGER": "npm",
        "BUN_INSTALL": "0"
      }
    }
  }
}
```

---

### 4. Build Performance (M-Series Machines)

**Problem:** Intel-based EAS builders are slower and more prone to timeouts.

**Solution:** Use M-series machines for iOS production builds:

```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"  // ← Faster M-series
      }
    }
  }
}
```

**Benefits:**
- ~40% faster builds
- Lower memory usage
- Fewer timeout failures

---

### 5. Auto-Increment Build Numbers

**Problem:** Manually incrementing build numbers causes "build already exists" errors when you forget.

**Solution:** Enable auto-increment for production:

```json
{
  "build": {
    "production": {
      "autoIncrement": true  // ← Auto-bumps iOS build number
    }
  }
}
```

**Note:** Only enable on `production` profile to avoid burning through build numbers during testing.

---

### 6. TestFlight Processing Delays

**Problem:** Build appears in App Store Connect but stays "Processing" for hours.

**Solution:**
1. **Wait it out**: Apple's processing can take 24-48 hours (not a bug)
2. **Check email**: Apple sends notifications if build is rejected
3. **Verify compliance**: Missing export compliance or encryption declarations can delay processing

**Tip:** Set `ITSAppUsesNonExemptEncryption: false` in `app.json` infoPlist to skip encryption compliance questions.

---

### 7. Missing Environment Variables

**Problem:** Build succeeds but app crashes on launch due to missing secrets.

**Solution:** Set all secrets in EAS before building:

```bash
# Required for backend
eas secret:create --scope project --name SUPABASE_URL --value https://xxx.supabase.co
eas secret:create --scope project --name SUPABASE_ANON_KEY --value eyJxxx
eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value eyJxxx

# Required for RevenueCat
eas secret:create --scope project --name EXPO_PUBLIC_RC_API_KEY --value appl_xxx

# Required for Meta Ads
eas secret:create --scope project --name META_CONVERSIONS_API_TOKEN --value EAAxxxx

# List all secrets
eas secret:list
```

---

### 8. Facebook SDK Config Errors

**Problem:** App crashes on iOS launch with "Facebook SDK not configured" or "Invalid scheme".

**Solution:** Verify `app.json` plugin config:

```json
{
  "plugins": [
    [
      "react-native-fbsdk-next",
      {
        "appID": "453049510987286",  // ← Your Facebook App ID
        "clientToken": "3206c77601ed76cd74b6276904c20548",
        "displayName": "Your App Name",
        "scheme": "fb453049510987286",  // ← Must match appID
        "advertiserIDCollectionEnabled": true,
        "autoLogAppEventsEnabled": true,
        "isAutoInitEnabled": true
      }
    ]
  ]
}
```

**Common mistakes:**
- Placeholder IDs not replaced
- `scheme` doesn't match `appID` (should be `fb{appID}`)
- Missing `LSApplicationQueriesSchemes` in `infoPlist`

---

### Build Failure Debugging Checklist

When a build fails:

1. **Read the full error log**: Don't skim - the real error is often buried
2. **Check eas.json**: Verify all placeholder values are replaced
3. **Verify secrets**: Run `eas secret:list` and check all required vars are set
4. **Check app.json**: Ensure bundle IDs, plugin configs are correct
5. **Clean build**: Sometimes cached state causes issues - try a fresh build
6. **Check Expo SDK version**: Ensure all packages are compatible with your Expo SDK version

---

### Getting Help

- **EAS Build Logs**: `eas build:list` → Click build → View logs
- **Expo Discord**: [https://chat.expo.dev](https://chat.expo.dev)
- **EAS Build Status**: [https://status.expo.dev](https://status.expo.dev)

---

## Part 2: Android Deployment

### Prerequisites
- Google Play Developer Account ($25 one-time)
- Keystore file (generated by EAS)

### Step 1: Google Play Console Setup

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create developer account
3. Click **"Create app"**
4. Fill in:
   - App name: EverReach
   - Default language: English
   - App type: App
   - Free or paid: Free (with in-app purchases)

### Step 2: Build & Submit

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android --latest
```

### Step 3: Google Play Review Checklist

- [ ] Hi-res icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2)
- [ ] Short description (max 80 chars)
- [ ] Full description (max 4000 chars)
- [ ] Content rating questionnaire
- [ ] Privacy policy
- [ ] Target audience and content

---

## Part 3: Web Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add your domain: `app.everreach.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

---

## Part 4: Backend API Deployment

### Automatic Deploys

Connect your GitHub repo to Vercel:

1. Vercel Dashboard → New Project
2. Import `backend-vercel` folder
3. Configure environment variables
4. Enable automatic deploys on push

### Manual Deploy

```bash
cd backend-vercel
vercel --prod
```

### Production Environment Variables

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
REVENUECAT_API_KEY=sk_...
FRONTEND_URL=https://app.everreach.com
```

---

## Part 5: Database Production Setup

### Supabase Production Checklist

- [ ] Upgrade to Pro plan (if needed)
- [ ] Enable Point-in-Time Recovery
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Review and enable RLS on all tables
- [ ] Remove any test data

### Database URL

For production, use the **Connection Pooler** URL:
```
DATABASE_URL=postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## Post-Deployment Checklist

### Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring (Pingdom, UptimeRobot)
- [ ] Set up analytics (PostHog, Mixpanel)
- [ ] Configure log aggregation

### Security

- [ ] SSL certificates active
- [ ] Environment variables secured
- [ ] API rate limiting enabled
- [ ] CORS configured correctly

### Performance

- [ ] CDN enabled (Vercel Edge Network)
- [ ] Images optimized
- [ ] Bundle size analyzed
- [ ] Lighthouse score > 90

---

## Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### EAS Rollback (OTA Updates)

```bash
# Publish previous update
eas update --branch production --message "Rollback to v1.0.0"
```

### Database Rollback

1. Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"

---

## Continuous Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive
```

---

## Support

Need help with deployment?
- 📖 [Expo Deployment Docs](https://docs.expo.dev/distribution/introduction/)
- 📖 [Vercel Docs](https://vercel.com/docs)
- 💬 [Discord Community](#)
