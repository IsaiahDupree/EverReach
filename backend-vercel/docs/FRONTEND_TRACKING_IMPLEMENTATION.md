# Frontend Tracking Implementation Guide

**Complete guide to implementing page and button tracking for your React Native / Expo app**

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Core Components](#core-components)
5. [Implementation Steps](#implementation-steps)
6. [Tracking Patterns](#tracking-patterns)
7. [Best Practices](#best-practices)
8. [Testing & Verification](#testing--verification)

---

## Overview

This guide shows you how to implement **100% coverage tracking** for:
- ✅ **All 54 app pages** (screen views + time-on-page)
- ✅ **Every button/pressable** (tap events with consistent IDs)
- ✅ **Custom events** (anything you want to track)

### What You'll Get

**Developer Dashboard will show:**
- Which pages users visit (and which they don't)
- How long users spend on each page
- Which buttons get tapped (and which never do)
- Coverage gaps (expected vs. seen pages/buttons)

---

## Architecture

```
Mobile App (React Native/Expo)
  │
  ├─> Analytics.init()          → Register all routes on boot
  ├─> useScreenTracking()       → Auto-track page views + duration
  ├─> TrackedPressable          → Track button taps
  └─> Analytics.track()         → Custom events
      │
      ├─> PostHog (optional)    → Analytics platform
      └─> Backend API           → Custom tracking DB
          │
          └─> Developer Dashboard → Coverage visualization
```

---

## Setup & Installation

### 1. Install Dependencies

```bash
# PostHog (optional but recommended)
npx expo install posthog-react-native expo-file-system expo-application expo-device expo-localization

# Or just use fetch if you only want backend tracking
```

### 2. Environment Variables

Add to your `.env`:

```env
# Backend tracking
EXPO_PUBLIC_TRACKING_BASE_URL=https://ever-reach-be.vercel.app
EXPO_PUBLIC_APP_VERSION=1.0.0

# PostHog (optional)
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_key
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Core Components

### 1. Analytics Wrapper

Create `lib/analytics/analytics.ts`:

```typescript
import PostHog from 'posthog-react-native';

// Route manifest - ALL your app routes
const ROUTE_MANIFEST = [
  // Tabs
  { route: '/(tabs)/home', dynamic: false, file: 'app/(tabs)/home.tsx' },
  { route: '/(tabs)/people', dynamic: false, file: 'app/(tabs)/people.tsx' },
  { route: '/(tabs)/chat', dynamic: false, file: 'app/(tabs)/chat.tsx' },
  { route: '/(tabs)/settings', dynamic: false, file: 'app/(tabs)/settings.tsx' },
  
  // Auth
  { route: '/sign-in', dynamic: false, file: 'app/sign-in.tsx' },
  { route: '/onboarding', dynamic: false, file: 'app/onboarding.tsx' },
  
  // Contacts
  { route: '/contact/[id]', dynamic: true, file: 'app/contact/[id].tsx' },
  { route: '/contact-context/[id]', dynamic: true, file: 'app/contact-context/[id].tsx' },
  { route: '/contact-notes/[id]', dynamic: true, file: 'app/contact-notes/[id].tsx' },
  { route: '/add-contact', dynamic: false, file: 'app/add-contact.tsx' },
  
  // Messaging
  { route: '/goal-picker', dynamic: false, file: 'app/goal-picker.tsx' },
  { route: '/message-results', dynamic: false, file: 'app/message-results.tsx' },
  { route: '/message-templates', dynamic: false, file: 'app/message-templates.tsx' },
  
  // Settings
  { route: '/subscription-plans', dynamic: false, file: 'app/subscription-plans.tsx' },
  { route: '/personal-profile', dynamic: false, file: 'app/personal-profile.tsx' },
  { route: '/privacy-settings', dynamic: false, file: 'app/privacy-settings.tsx' },
  { route: '/warmth-settings', dynamic: false, file: 'app/warmth-settings.tsx' },
  
  // Notes
  { route: '/voice-note', dynamic: false, file: 'app/voice-note.tsx' },
  { route: '/personal-notes', dynamic: false, file: 'app/personal-notes.tsx' },
  
  // Other
  { route: '/notifications', dynamic: false, file: 'app/notifications.tsx' },
  { route: '/import-contacts', dynamic: false, file: 'app/import-contacts.tsx' },
  
  // Add ALL 54 routes here...
];

class Analytics {
  private static posthog: PostHog | null = null;
  private static baseUrl = process.env.EXPO_PUBLIC_TRACKING_BASE_URL;
  private static appVersion = process.env.EXPO_PUBLIC_APP_VERSION || '0.0.0';
  private static userId: string | null = null;
  private static authed: boolean = false;

  // Initialize analytics
  static async init() {
    // Initialize PostHog (optional)
    if (process.env.EXPO_PUBLIC_POSTHOG_API_KEY) {
      this.posthog = new PostHog(
        process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
        { host: process.env.EXPO_PUBLIC_POSTHOG_HOST }
      );
    }

    // Register route manifest with backend
    await this.pushRouteManifest();
  }

  // Set user identity
  static identify(userId: string) {
    this.userId = userId;
    this.authed = true;
    this.posthog?.identify(userId);
  }

  // Clear user identity (on logout)
  static reset() {
    this.userId = null;
    this.authed = false;
    this.posthog?.reset();
  }

  // Register all routes with backend
  static async pushRouteManifest() {
    try {
      await fetch(`${this.baseUrl}/api/v1/tracking/register-manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appVersion: this.appVersion,
          generatedAt: new Date().toISOString(),
          routes: ROUTE_MANIFEST,
        }),
      });
    } catch (error) {
      console.error('[Analytics] Failed to push route manifest:', error);
    }
  }

  // Register page contract (expected elements)
  static async registerPageContract(contract: {
    route: string;
    requiredElements: string[];
    requiredEvents?: string[];
    critical?: boolean;
  }) {
    try {
      await fetch(`${this.baseUrl}/api/v1/tracking/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appVersion: this.appVersion,
          ...contract,
        }),
      });
    } catch (error) {
      console.error('[Analytics] Failed to register contract:', error);
    }
  }

  // Track generic event
  static async track(event: string, props: Record<string, any> = {}) {
    const enrichedProps = {
      ...props,
      app_version: this.appVersion,
      user_id: this.userId,
      authed: this.authed,
    };

    // Send to PostHog
    this.posthog?.capture(event, enrichedProps);

    // Send to backend
    try {
      await fetch(`${this.baseUrl}/api/v1/tracking/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          props: enrichedProps,
        }),
      });
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  // Track screen view
  static trackScreenView(screenName: string, props: Record<string, any> = {}) {
    this.track('screen_view', {
      screen_name: screenName,
      route: screenName,
      ...props,
    });
  }

  // Track screen duration
  static trackScreenDuration(screenName: string, durationMs: number) {
    this.track('screen_duration', {
      screen_name: screenName,
      route: screenName,
      duration_ms: durationMs,
    });
  }

  // Track UI interaction
  static trackPress(elementId: string, label: string, screenName: string, props: Record<string, any> = {}) {
    this.track('ui_press', {
      element_id: elementId,
      label,
      screen_name: screenName,
      route: screenName,
      ...props,
    });
  }
}

export default Analytics;
```

---

### 2. Screen Tracking Hook

Create `hooks/useScreenTracking.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import Analytics from '@/lib/analytics/analytics';

export function useScreenTracking() {
  const pathname = usePathname();
  const enterTimeRef = useRef<number>(Date.now());
  const lastPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    // Track screen view
    Analytics.trackScreenView(pathname);
    enterTimeRef.current = Date.now();
    lastPathnameRef.current = pathname;

    // Track duration when leaving screen
    return () => {
      const duration = Date.now() - enterTimeRef.current;
      Analytics.trackScreenDuration(lastPathnameRef.current, duration);
    };
  }, [pathname]);

  // Track duration when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const duration = Date.now() - enterTimeRef.current;
        Analytics.trackScreenDuration(pathname, duration);
        // Reset timer for when app comes back
        enterTimeRef.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [pathname]);
}
```

---

### 3. Tracked Pressable Component

Create `components/TrackedPressable.tsx`:

```typescript
import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { usePathname } from 'expo-router';
import Analytics from '@/lib/analytics/analytics';

interface TrackedPressableProps extends PressableProps {
  /**
   * Unique ID for this button. REQUIRED.
   * Use snake_case: e.g., "cta_start_trial", "btn_save_contact"
   */
  idHint: string;

  /**
   * Human-readable label. REQUIRED.
   * e.g., "Start Free Trial", "Save Contact"
   */
  label: string;

  /**
   * Optional event name (defaults to "ui_press")
   */
  event?: string;

  /**
   * Optional extra event properties
   */
  eventProps?: Record<string, any>;
}

export function TrackedPressable({
  idHint,
  label,
  event = 'ui_press',
  eventProps = {},
  onPress,
  children,
  ...pressableProps
}: TrackedPressableProps) {
  const pathname = usePathname();

  // Auto-register this element on mount
  React.useEffect(() => {
    Analytics.registerPageContract({
      route: pathname,
      requiredElements: [idHint],
      requiredEvents: [event],
    });
  }, [pathname, idHint, event]);

  const handlePress = (e: any) => {
    // Track the press
    Analytics.trackPress(idHint, label, pathname, eventProps);

    // Call original onPress
    onPress?.(e);
  };

  return (
    <Pressable {...pressableProps} onPress={handlePress}>
      {children}
    </Pressable>
  );
}
```

---

## Implementation Steps

### Step 1: Initialize Analytics in Root Layout

Edit `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import Analytics from '@/lib/analytics/analytics';
import { useScreenTracking } from '@/hooks/useScreenTracking';

export default function RootLayout() {
  // Initialize analytics once on app load
  useEffect(() => {
    Analytics.init();
  }, []);

  // Track all screen changes globally
  useScreenTracking();

  return <Slot />;
}
```

### Step 2: Set User Identity on Login

Edit your auth flow:

```typescript
// After successful login
import Analytics from '@/lib/analytics/analytics';

async function handleLogin(email: string, password: string) {
  const { user } = await signIn(email, password);
  
  // Identify user in analytics
  Analytics.identify(user.id);
}

// On logout
async function handleLogout() {
  await signOut();
  
  // Reset analytics
  Analytics.reset();
}
```

### Step 3: Replace `Pressable` with `TrackedPressable`

**Before:**
```typescript
<Pressable onPress={() => startTrial()}>
  <Text>Start Free Trial</Text>
</Pressable>
```

**After:**
```typescript
<TrackedPressable
  idHint="cta_start_trial"
  label="Start Free Trial"
  onPress={() => startTrial()}
>
  <Text>Start Free Trial</Text>
</TrackedPressable>
```

### Step 4: Add to All Pages

Replace all `Pressable`, `TouchableOpacity`, `Button` with `TrackedPressable`:

```typescript
// Home page
<TrackedPressable idHint="btn_view_warmth" label="View Warmth" onPress={...}>

// Contact detail
<TrackedPressable idHint="btn_send_message" label="Send Message" onPress={...}>

// Settings
<TrackedPressable idHint="btn_save_settings" label="Save" onPress={...}>
```

---

## Tracking Patterns

### Pattern 1: Track Page View (Automatic)

**No code needed!** `useScreenTracking()` in root layout tracks all pages.

```typescript
// Automatically tracked:
// - screen_view event when page opens
// - screen_duration event when page closes
```

### Pattern 2: Track Button Tap

```typescript
<TrackedPressable
  idHint="cta_upgrade_now"
  label="Upgrade Now"
  onPress={() => navigate('/subscription-plans')}
>
  <Text>Upgrade Now</Text>
</TrackedPressable>
```

### Pattern 3: Track Custom Event

```typescript
import Analytics from '@/lib/analytics/analytics';

// When user copies AI-generated message
const handleCopyMessage = (message: string) => {
  copyToClipboard(message);
  
  Analytics.track('message_copied', {
    message_length: message.length,
    source: 'ai_composer',
  });
};
```

### Pattern 4: Track Critical Pages

Mark important pages as critical:

```typescript
// In your page component
useEffect(() => {
  Analytics.registerPageContract({
    route: '/(tabs)/home',
    requiredElements: ['cta_start_trial', 'btn_add_contact'],
    critical: true, // Mark as critical
  });
}, []);
```

### Pattern 5: Track with Context

Pass extra context in event props:

```typescript
<TrackedPressable
  idHint="btn_send_message"
  label="Send Message"
  eventProps={{
    contact_warmth: contact.warmth_band,
    message_type: 'ai_generated',
    channel: selectedChannel,
  }}
  onPress={handleSend}
>
  <Text>Send</Text>
</TrackedPressable>
```

---

## Best Practices

### 1. **Naming Conventions**

#### Element IDs (idHint)
Use `snake_case` with prefixes:

```typescript
// CTAs (Call-to-action)
"cta_start_trial"
"cta_upgrade_now"
"cta_invite_friend"

// Buttons
"btn_save_contact"
"btn_delete_message"
"btn_edit_profile"

// Nav items
"nav_home"
"nav_settings"

// Actions
"action_copy_message"
"action_share_contact"
```

#### Event Names
Use `snake_case` descriptive names:

```typescript
"screen_view"       // Page opened
"screen_duration"   // Time on page
"ui_press"          // Button tapped
"message_sent"      // Custom event
"contact_created"   // Custom event
"ai_reply_copied"   // Custom event
```

---

### 2. **What to Track**

✅ **DO Track:**
- Primary CTAs (Start Trial, Upgrade, etc.)
- Navigation buttons
- Form submissions
- Critical user actions
- Feature usage

❌ **DON'T Track:**
- Decorative elements
- Read-only text
- Loading indicators
- Every tiny interaction (noise)

---

### 3. **ID Stability**

**IMPORTANT:** IDs must be stable across app versions!

❌ **Bad:**
```typescript
idHint={`btn_${Math.random()}`}  // Different every render!
idHint="button_1"                 // Non-descriptive
```

✅ **Good:**
```typescript
idHint="btn_save_contact"         // Stable, descriptive
idHint="cta_start_trial"          // Stable, descriptive
```

---

### 4. **Labels**

Use human-readable labels:

```typescript
label="Start Free Trial"   // ✅ Good
label="Save"               // ✅ Good
label="btn_save"           // ❌ Bad (use actual text)
label=""                   // ❌ Bad (always provide label)
```

---

### 5. **Performance**

- ✅ Events sent asynchronously (non-blocking)
- ✅ Failed events logged but don't crash app
- ✅ Cache manifest to avoid re-sending

---

## Testing & Verification

### Step 1: Run App & Navigate

```bash
npx expo start
# Navigate through your app
# Tap some buttons
```

### Step 2: Check Backend

```bash
curl "https://ever-reach-be.vercel.app/api/v1/tracking/coverage?appVersion=1.0.0"
```

**Expected:**
```json
{
  "appVersion": "1.0.0",
  "summary": {
    "total_routes": 54,
    "covered_routes": 12,  // Routes you visited
    "coverage_percent": 22.2
  },
  "missingRoutes": [
    { "route": "/privacy-policy", "dynamic": false },
    { "route": "/terms-of-service", "dynamic": false }
  ],
  "topRoutes": [
    { "route": "/(tabs)/home", "views": 5, "avg_duration_seconds": 12.5 }
  ],
  "topElements": [
    { "route": "/(tabs)/home", "element_id": "cta_start_trial", "taps": 3 }
  ]
}
```

### Step 3: View Dashboard

```bash
curl "https://ever-reach-be.vercel.app/api/v1/tracking/dashboard?appVersion=1.0.0&days=7"
```

**Expected:**
```json
{
  "stats": {
    "totalEvents": 45,
    "uniqueRoutes": 12,
    "authedEvents": 38,
    "uniqueUsers": 1
  },
  "eventBreakdown": {
    "screen_view": 15,
    "screen_duration": 14,
    "ui_press": 16
  }
}
```

---

## Complete Example: Home Page

```typescript
// app/(tabs)/home.tsx
import { View, Text } from 'react-native';
import { TrackedPressable } from '@/components/TrackedPressable';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import Analytics from '@/lib/analytics/analytics';

export default function HomePage() {
  const router = useRouter();

  // Register page contract
  useEffect(() => {
    Analytics.registerPageContract({
      route: '/(tabs)/home',
      requiredElements: [
        'cta_start_trial',
        'btn_add_contact',
        'btn_view_warmth',
      ],
      critical: true,
    });
  }, []);

  return (
    <View>
      <Text>Welcome to EverReach</Text>

      {/* Primary CTA */}
      <TrackedPressable
        idHint="cta_start_trial"
        label="Start Free Trial"
        onPress={() => router.push('/subscription-plans')}
      >
        <Text>Start Free Trial</Text>
      </TrackedPressable>

      {/* Secondary actions */}
      <TrackedPressable
        idHint="btn_add_contact"
        label="Add Contact"
        onPress={() => router.push('/add-contact')}
      >
        <Text>Add Contact</Text>
      </TrackedPressable>

      <TrackedPressable
        idHint="btn_view_warmth"
        label="View Warmth Summary"
        onPress={() => router.push('/warmth-settings')}
      >
        <Text>View Warmth</Text>
      </TrackedPressable>
    </View>
  );
}
```

---

## Migration Strategy

### Phase 1: Core Pages (Week 1)
- ✅ Implement `Analytics.init()` in root layout
- ✅ Add `useScreenTracking()` hook
- ✅ Track 5 core pages manually

### Phase 2: High-Traffic Pages (Week 2)
- ✅ Replace `Pressable` with `TrackedPressable` in top 10 pages
- ✅ Verify tracking working in dashboard

### Phase 3: Complete Coverage (Week 3)
- ✅ Replace all remaining `Pressable` components
- ✅ Add custom events for key features
- ✅ Verify 100% route coverage

### Phase 4: Optimization (Week 4)
- ✅ Review dashboard, remove unused pages
- ✅ Add critical flags to important pages
- ✅ Set up alerts for coverage drops

---

## Troubleshooting

### Issue: Events Not Showing Up

**Check:**
1. Is `Analytics.init()` called in root layout?
2. Is `EXPO_PUBLIC_TRACKING_BASE_URL` set correctly?
3. Are you using correct `appVersion`?

**Debug:**
```typescript
// Add console logs
Analytics.track = async (event, props) => {
  console.log('[Analytics]', event, props);
  // ... rest of function
};
```

---

### Issue: Screen Duration = 0

**Cause:** User navigates away before hook cleanup

**Fix:** Already handled by `AppState` listener in `useScreenTracking()`

---

### Issue: Duplicate Events

**Cause:** Component re-renders trigger multiple tracks

**Fix:** Already handled - events are idempotent on backend

---

## Advanced Patterns

### Pattern: Conditional Tracking

```typescript
<TrackedPressable
  idHint="btn_premium_feature"
  label="Use Premium Feature"
  eventProps={{
    user_tier: user.subscription_tier,
    has_access: user.has_premium,
  }}
  onPress={handlePremiumFeature}
>
  <Text>Premium Feature</Text>
</TrackedPressable>
```

### Pattern: A/B Test Tracking

```typescript
const variant = useABTest('home_cta_text');

<TrackedPressable
  idHint="cta_start_trial"
  label={variant === 'a' ? 'Start Free Trial' : 'Try For Free'}
  eventProps={{
    ab_variant: variant,
  }}
  onPress={handleStartTrial}
>
  <Text>{variant === 'a' ? 'Start Free Trial' : 'Try For Free'}</Text>
</TrackedPressable>
```

### Pattern: Feature Flag Tracking

```typescript
const showNewUI = useFeatureFlag('new_contact_ui');

useEffect(() => {
  Analytics.track('feature_flag_evaluated', {
    flag: 'new_contact_ui',
    enabled: showNewUI,
  });
}, [showNewUI]);
```

---

## Related Documentation

- [App Analytics Tracking System](./APP_ANALYTICS_TRACKING_SYSTEM.md) - Backend architecture
- [Deployment Success](../DEPLOYMENT_SUCCESS_NOV_02_2025.md) - Backend deployment
- [API Endpoints](./API_ENDPOINTS.md) - Full API reference

---

## Checklist

### Setup
- [ ] Install dependencies
- [ ] Add environment variables
- [ ] Create analytics wrapper
- [ ] Create screen tracking hook
- [ ] Create TrackedPressable component

### Implementation
- [ ] Add Analytics.init() to root layout
- [ ] Add useScreenTracking() to root layout
- [ ] Set user identity on login
- [ ] Reset analytics on logout
- [ ] Replace Pressable with TrackedPressable

### Verification
- [ ] Test tracking in dev
- [ ] Verify events in backend
- [ ] Check coverage report
- [ ] View dashboard stats
- [ ] Confirm 100% route coverage

### Production
- [ ] Set production tracking URL
- [ ] Enable PostHog (optional)
- [ ] Monitor dashboard
- [ ] Set up alerts for coverage drops

---

**Last Updated:** November 2, 2025  
**Status:** Backend deployed, ready for frontend implementation  
**Backend API:** https://ever-reach-be.vercel.app
