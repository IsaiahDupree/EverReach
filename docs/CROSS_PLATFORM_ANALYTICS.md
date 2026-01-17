# Cross-Platform Analytics with PostHog

## Overview

Complete guide to unified analytics tracking across web and mobile using **one PostHog project** for production. This enables cross-device journey stitching and clean funnels.

---

## Table of Contents

1. [Why One Project?](#why-one-project)
2. [Setup Guide](#setup-guide)
3. [Identity Stitching](#identity-stitching)
4. [Platform Segmentation](#platform-segmentation)
5. [Feature Flags & Experiments](#feature-flags--experiments)
6. [Cross-Device Tracking](#cross-device-tracking)
7. [Best Practices](#best-practices)

---

## Why One Project?

### ✅ Use ONE PostHog Project For

- **Production** (web + mobile + any other platforms)
- Cross-platform journey tracking
- Unified user profiles
- Simplified governance

PostHog automatically **unifies events** from different sessions, devices, and platforms when you call `identify()` with the same user ID.

### 🔀 Use SEPARATE Projects Only For

1. **Dev/Staging vs Production** (best practice - prevents test data pollution)
2. **Different data residency** (US vs EU instances)
3. **Strict team/PII separation** (different orgs with incompatible schemas)
4. **Totally different products** (incompatible event schemas)

### ❌ Don't Split By Platform

Instead of separate projects for web/iOS/Android:
- ✅ Use ONE project
- ✅ Segment by `platform` property
- ✅ Run experiments with platform filters
- ✅ Analyze funnels across devices

---

## Setup Guide

### Step 1: Environment Variables

**Use the SAME key for both web and mobile in production:**

```bash
# .env
# Production - SAME key for both
EXPO_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_KEY=phc_v71DkKbXSBTdfrhIuWrnTgIb21tiPfx29iZNVyVBqIb
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App Version (for segmentation)
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### Step 2: Mobile Setup (Expo + React Native)

**File**: `providers/TrackingProvider.tsx`

```typescript
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

// Initialize PostHog
posthog = await PostHog.initAsync(
  process.env.EXPO_PUBLIC_POSTHOG_KEY,
  {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    optOut: true, // Start opted-out until consent
  }
);

// Register super properties (included on EVERY event)
posthog.register({
  platform: Platform.OS, // 'ios' or 'android'
  app_version: process.env.EXPO_PUBLIC_APP_VERSION,
  platform_version: Platform.Version,
});
```

### Step 3: Web Setup (Next.js)

**File**: `app/providers/PostHogProvider.tsx`

```typescript
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    opt_out_capturing_by_default: true, // Start opted-out
    capture_pageview: false, // Manual control
  })
  
  // Register super properties
  posthog.register({
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
  })
}

export function PostHogProvider({ children }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

---

## Identity Stitching

### How It Works

PostHog creates an **anonymous ID** on first visit:
- Web: Cookie-based distinct ID
- Mobile: Device-based distinct ID

When you call `identify(userId)` **on any platform**, PostHog:
1. Links the anonymous ID to the user ID
2. Merges all past anonymous events into the user profile
3. Future events from ANY device use the user ID

### Implementation

**On Sign In** (both web and mobile):

```typescript
import { useTracking } from '@/providers/TrackingProvider';

function SignIn() {
  const { identify } = useTracking();
  
  const handleSignIn = async (email, password) => {
    const user = await signIn(email, password);
    
    // CRITICAL: Call identify on BOTH platforms after login
    identify(user.id, {
      email: user.email,
      name: user.name,
      plan: user.subscription_tier,
      created_at: user.created_at,
    });
  };
}
```

**On Sign Out** (both web and mobile):

```typescript
const handleSignOut = async () => {
  await signOut();
  
  // CRITICAL: Reset to prevent cross-user bleed on shared devices
  reset();
};
```

### Cross-Device Journey Example

```
User Journey:
1. Day 1: Visit website on laptop → Anonymous ID: anon_123
   - Event: page_view (platform: web)
   - Event: signup_started (platform: web)
   
2. Day 2: Download iOS app → Anonymous ID: anon_456
   - Event: app_opened (platform: ios)
   - Event: sign_in_completed → identify(user_789)
   
PostHog Stitches:
- anon_123 + anon_456 → user_789
- All events now attributed to user_789
- Can analyze complete journey: web signup → mobile usage
```

---

## Platform Segmentation

### Super Properties

Properties registered with `posthog.register()` are included on **every event**:

```typescript
// Mobile
posthog.register({
  platform: 'ios', // or 'android'
  app_version: '1.0.0',
  platform_version: Platform.Version,
});

// Web
posthog.register({
  platform: 'web',
  app_version: '1.0.0',
});
```

### Querying by Platform

**In PostHog Dashboard**:

1. **Filter events**: `platform = 'ios'` or `platform = 'web'`
2. **Breakdown by platform**: Group results by `platform` property
3. **Compare platforms**: Side-by-side cohort analysis

**Example Queries**:

```sql
-- Conversion rate by platform
SELECT 
  platform,
  COUNT(DISTINCT user_id) as users,
  SUM(CASE WHEN event = 'purchase_succeeded' THEN 1 ELSE 0 END) as purchases,
  (purchases / users) * 100 as cvr
FROM events
WHERE event IN ('paywall_presented', 'purchase_succeeded')
GROUP BY platform

-- Cross-platform users
SELECT 
  user_id,
  COUNT(DISTINCT platform) as platforms_used
FROM events
GROUP BY user_id
HAVING platforms_used > 1
```

---

## Feature Flags & Experiments

### Option 1: Platform-Agnostic Flags

**Use same flag for all platforms:**

```typescript
const variant = await posthog.getFeatureFlag('onboarding_variant');
// Returns: 'A', 'B', or null
```

**PostHog Dashboard Setup**:
- Flag key: `onboarding_variant`
- Rollout: 50% A, 50% B
- Filters: None (applies to all platforms)

### Option 2: Platform-Specific Flags

**Use platform filters:**

```typescript
// Flag applies only if platform = 'ios'
const iosVariant = await posthog.getFeatureFlag('ios_paywall_variant');

// Flag applies only if platform = 'web'
const webVariant = await posthog.getFeatureFlag('web_paywall_variant');
```

**PostHog Dashboard Setup**:
- Flag key: `ios_paywall_variant`
- Rollout: 50% A, 50% B
- Filters: `platform = 'ios'`

### Option 3: Separate Experiments (Recommended)

**Run parallel experiments per platform:**

```typescript
const variant = await posthog.getFeatureFlag('onboarding_variant');
// Returns: 'A', 'B', or null
// PostHog automatically filters by platform in dashboard
```

**Analysis**:
- Create separate insights for iOS and web
- Compare results independently
- Different winning variants per platform is OK

---

## Cross-Device Tracking

### Pre-Login Cross-Device (Optional)

If you want to connect a **web session** to a **fresh mobile install** BEFORE login:

**1. Generate Link with Web Distinct ID:**

```typescript
// Web
const distinctId = posthog.get_distinct_id();
const deepLink = `yourapp://onboard?phid=${distinctId}`;

// Send via email, SMS, QR code, etc.
```

**2. Handle in Mobile App:**

```typescript
// Mobile
import * as Linking from 'expo-linking';

Linking.addEventListener('url', (event) => {
  const { url } = event;
  const params = new URLSearchParams(url.split('?')[1]);
  const webDistinctId = params.get('phid');
  
  if (webDistinctId && posthog) {
    // Alias the web ID to current mobile ID
    posthog.alias(webDistinctId);
  }
});
```

**Result**: Pre-login web and mobile sessions are linked.

---

## Best Practices

### ✅ DO

1. **Use ONE project for production** (web + mobile)
2. **Call `identify(userId)` on both platforms** after sign in
3. **Call `reset()` on both platforms** after sign out
4. **Register super properties** (`platform`, `app_version`)
5. **Segment by properties** instead of splitting projects
6. **Use separate dev/staging projects** to avoid test data
7. **Track `platform` on every event** for analysis

### ❌ DON'T

1. **Don't create separate projects per platform** (splits data)
2. **Don't forget to reset** on logout (cross-user bleed)
3. **Don't use different user IDs** on web vs mobile (breaks stitching)
4. **Don't send PII** if user hasn't consented
5. **Don't mix test and production data** (use separate projects)

---

## Example: Complete User Journey

```typescript
// === Day 1: Web (Laptop) ===
// Anonymous: anon_web_abc123

posthog.capture('page_view', { 
  platform: 'web',
  page: 'landing' 
});

posthog.capture('signup_started', { 
  platform: 'web',
  method: 'email' 
});

// === Day 2: Mobile (iPhone) ===
// Anonymous: anon_ios_def456

posthog.capture('app_opened', { 
  platform: 'ios' 
});

posthog.capture('sign_in_completed', { 
  platform: 'ios',
  method: 'email' 
});

// Call identify with same user ID used on web
posthog.identify('user_789', {
  email: 'user@example.com',
  plan: 'free',
});

// === PostHog Result ===
// User Profile: user_789
// Timeline:
//   Day 1: page_view (web) → signup_started (web)
//   Day 2: app_opened (ios) → sign_in_completed (ios)
//
// All events now show under single user:
// - Platform breakdown: 2 web, 2 ios
// - Cross-device journey visible
// - Can run cohorts on "users who visited web then opened mobile"
```

---

## Troubleshooting

### Events Not Merging Across Devices

**Check**:
1. Same PostHog project key on both platforms
2. Same user ID passed to `identify()` on both
3. User actually signed in (not anonymous on one platform)
4. No `reset()` called between identify calls

### Platform Filter Not Working

**Check**:
1. Super properties registered on initialization
2. `platform` property present on all events
3. Correct filter syntax in PostHog dashboard

### Feature Flags Not Consistent

**Check**:
1. Flag evaluation happens after `identify()` call
2. Variant stored in AsyncStorage/LocalStorage for consistency
3. Same user ID across sessions

---

## Migration from Multiple Projects

If you currently have separate projects for web and mobile:

### Step 1: Choose Primary Project

Pick one project as your unified project (usually production web).

### Step 2: Update Environment Variables

```bash
# Before
EXPO_PUBLIC_POSTHOG_KEY=phc_mobile_project_key
NEXT_PUBLIC_POSTHOG_KEY=phc_web_project_key

# After (SAME key)
EXPO_PUBLIC_POSTHOG_KEY=phc_unified_project_key
NEXT_PUBLIC_POSTHOG_KEY=phc_unified_project_key
```

### Step 3: Add Platform Super Properties

Update both web and mobile to register `platform` property.

### Step 4: Deploy & Monitor

- Deploy both platforms simultaneously
- Monitor event ingestion in PostHog
- Verify `platform` property appears on all events
- Test identity stitching with sign-in flow

### Step 5: Historical Data (Optional)

PostHog can merge historical data from multiple projects:
1. Export events from old projects
2. Import to unified project with `platform` property added
3. Contact PostHog support for large imports

---

## Summary

### Key Points

✅ **ONE PostHog project** for web + mobile in production  
✅ **Same user ID** in `identify()` calls on both platforms  
✅ **Super properties** (`platform`, `app_version`) for segmentation  
✅ **Separate projects** only for dev/staging  
✅ **Reset on logout** to prevent cross-user data bleed  

### Benefits

🎯 **Complete user journeys** across all devices  
🎯 **Simplified governance** (one set of events, one project)  
🎯 **Cross-platform experiments** with clean results  
🎯 **Unified user profiles** for better insights  

### Files Updated

1. `.env` - Added comments explaining unified project approach
2. `providers/TrackingProvider.tsx` - Added super properties registration
3. `docs/CROSS_PLATFORM_ANALYTICS.md` - This guide

---

**Last Updated**: October 18, 2025  
**Status**: ✅ Production-Ready  
**PostHog Docs**: https://posthog.com/docs/integrate/client/react-native
