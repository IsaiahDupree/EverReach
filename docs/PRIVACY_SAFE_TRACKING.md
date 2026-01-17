# Privacy-Safe Tracking & ATT Compliance

## Overview

Complete guide to implementing privacy-safe analytics tracking in EverReach, with full iOS App Tracking Transparency (ATT) compliance.

---

## Table of Contents

1. [ATT vs Analytics Consent](#1-att-vs-analytics-consent)
2. [What You Can Track Without ATT](#2-what-you-can-track-without-att)
3. [Implementation Guide](#3-implementation-guide)
4. [Event Taxonomy](#4-event-taxonomy)
5. [Experiments & A/B Testing](#5-experiments--ab-testing)
6. [Best Practices](#6-best-practices)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. ATT vs Analytics Consent

### What is ATT?

**App Tracking Transparency (ATT)** is Apple's requirement that apps ask permission before tracking users across other companies' apps or websites.

**When ATT "Ask App Not to Track" is selected**:
- ❌ Cannot access IDFA (advertising identifier)
- ❌ Cannot track users across other apps
- ❌ Cannot fingerprint devices
- ✅ **First-party analytics still allowed!**

### Analytics Consent (Separate)

**Your own analytics consent** is separate from ATT:
- Controls whether you collect **first-party** product analytics
- Not governed by ATT (that's for cross-app tracking)
- Must still respect GDPR/CCPA

###  Key Insight

**You DON'T need ATT permission for first-party analytics!**

```
ATT = Cross-app tracking (ads, attribution across apps)
Analytics Consent = First-party usage data (your app only)
```

### What This Means for EverReach

- ✅ Track onboarding funnels without ATT
- ✅ Run A/B tests without ATT
- ✅ Measure feature usage without ATT
- ✅ Track screen durations without ATT
- ❌ Track users across other apps (we don't do this anyway)
- ❌ Use IDFA for ad attribution (use SKAdNetwork instead)

---

## 2. What You Can Track Without ATT

### ✅ Always Allowed (with user consent)

**Product Analytics**:
- Screen views and navigation
- Feature usage and engagement
- Onboarding funnel conversion
- A/B test participation and exposure
- User actions (CTA taps, form submissions)
- Session duration and frequency

**Performance Monitoring**:
- Screen load times
- API response times
- Crash reports
- Memory/CPU usage

**User Behavior**:
- Onboarding steps completed
- Settings changed
- Content created/edited
- Search queries (within your app)

### ❌ Not Allowed (without ATT)

**Cross-App Tracking**:
- Following users to other apps
- Linking user data with third-party data brokers
- Fingerprinting devices to replace IDFA
- Sharing data for ad targeting across apps

**Ad Attribution** (use SKAdNetwork instead):
- Campaign-level attribution
- Install source tracking
- Cross-device attribution

---

## 3. Implementation Guide

### Step 1: Install Dependencies

```bash
# PostHog for analytics
npm install posthog-react-native

# ATT support (iOS only)
npx expo install expo-tracking-transparency

# AsyncStorage for consent persistence
npx expo install @react-native-async-storage/async-storage

# Notifications for push tracking
npx expo install expo-notifications
```

### Step 2: Add Environment Variables

```bash
# .env
EXPO_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### Step 3: Wrap App with TrackingProvider

```typescript
// app/_layout.tsx
import { TrackingProvider } from '@/providers/TrackingProvider';

export default function RootLayout() {
  return (
    <TrackingProvider>
      <Stack />
    </TrackingProvider>
  );
}
```

### Step 4: Show Consent Modal on First Launch

```typescript
// app/index.tsx
import { useState, useEffect } from 'react';
import ConsentModal from '@/components/ConsentModal';
import { useTracking } from '@/providers/TrackingProvider';

export default function Home() {
  const { consent, consentLoading } = useTracking();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Show consent modal if not set
    if (!consentLoading && consent && !consent.analytics) {
      setShowConsent(true);
    }
  }, [consent, consentLoading]);

  return (
    <>
      {/* Your app */}
      <ConsentModal
        visible={showConsent}
        onClose={() => setShowConsent(false)}
      />
    </>
  );
}
```

### Step 5: Track Events

```typescript
import { useTracking } from '@/providers/TrackingProvider';

function MyComponent() {
  const { track, trackScreen, identify } = useTracking();

  // Track screen view (automatic with pathname)
  useEffect(() => {
    trackScreen('profile', { user_id: '123' });
  }, []);

  // Track custom events
  const handleCTA = () => {
    track('cta_tapped', {
      cta_id: 'upgrade_button',
      location: 'profile_screen',
    });
  };

  // Identify user after sign-in
  const handleSignIn = (userId: string) => {
    identify(userId, {
      email: user.email,
      plan: 'pro',
    });
  };
}
```

---

## 4. Event Taxonomy

### Standard Events

Use consistent event names across the app:

#### App Lifecycle

```typescript
// App opened
track('app_opened', {
  session_start: Date.now(),
  platform: 'ios',
});

// App backgrounded
track('app_backgrounded');

// App foregrounded
track('app_foregrounded');
```

#### Screen Tracking

```typescript
// Screen viewed
track('screen_viewed', {
  screen: 'contacts',
  from_screen: 'home',
});

// Screen duration
track('screen_duration', {
  screen: 'contacts',
  screen_time_ms: 5420,
});
```

#### Onboarding

```typescript
// Step viewed
track('onboarding_step_viewed', {
  step_id: 'welcome',
  step_number: 1,
});

// Step completed
track('onboarding_step_completed', {
  step_id: 'welcome',
  step_number: 1,
  step_time_ms: 3200,
  method: 'continue_button',
});

// Onboarding completed
track('onboarding_completed', {
  total_time_ms: 120000,
  steps_completed: 5,
});
```

#### User Actions

```typescript
// CTA tapped
track('cta_tapped', {
  cta_id: 'upgrade_now',
  location: 'paywall',
  variant: 'A',
});

// Form submitted
track('form_submitted', {
  form_id: 'contact_create',
  field_count: 5,
});

// Permission prompt
track('permission_prompt_shown', {
  permission: 'notifications',
});

track('permission_prompt_accepted', {
  permission: 'notifications',
});

track('permission_prompt_denied', {
  permission: 'notifications',
});
```

#### Push Notifications

```typescript
// Push received (background)
track('push_received', {
  notification_id: 'abc123',
  campaign_id: 'onboarding_day_2',
});

// Push opened
track('push_opened', {
  notification_id: 'abc123',
  campaign_id: 'onboarding_day_2',
});
```

#### Deep Links

```typescript
// Deep link opened
track('deep_link_opened', {
  url: 'everreach://contact/123',
  source: 'email',
  campaign: 'warmth_alert',
});
```

#### Experiments

```typescript
// Experiment exposure (log once per variant)
track('experiment_exposure', {
  experiment_key: 'onboarding_variant',
  variant: 'B',
});
```

### Event Properties

Always include these when relevant:

```typescript
{
  // Context
  platform: 'ios' | 'android',
  app_version: '1.0.0',
  screen: 'contacts',
  
  // Timing
  timestamp: Date.now(),
  duration_ms: 5420,
  
  // User
  user_id: '123' // only after identified
}
```

---

## 5. Experiments & A/B Testing

### Basic A/B Test Pattern

```typescript
import { useTracking } from '@/providers/TrackingProvider';
import { useState, useEffect } from 'react';

function OnboardingScreen() {
  const { getExperimentVariant, logExperimentExposure } = useTracking();
  const [variant, setVariant] = useState<string>('A');

  useEffect(() => {
    // Get variant (cached locally)
    getExperimentVariant('onboarding_flow').then(v => {
      setVariant(v);
      // Log exposure once
      logExperimentExposure('onboarding_flow', v);
    });
  }, []);

  // Render based on variant
  if (variant === 'B') {
    return <NewOnboardingFlow />;
  }
  return <OldOnboardingFlow />;
}
```

### PostHog Feature Flags

```typescript
// Define flag in PostHog dashboard:
// Key: onboarding_flow
// Variants: A (50%), B (50%)

// Get variant from PostHog
const variant = await posthog.getFeatureFlag('onboarding_flow');

// Automatically stored in AsyncStorage for consistency
```

### Statsig/GrowthBook Alternative

```typescript
import { Statsig } from 'statsig-react-native';

// Initialize Statsig
await Statsig.initialize('client-key', {
  user: { userID: userId },
});

// Get experiment
const experiment = Statsig.getExperiment('onboarding_flow');
const variant = experiment.get('variant', 'A');

// Log exposure (Statsig does this automatically)
```

### Analyzing Results

**In PostHog**:
1. Go to Experiments
2. Create funnel: `onboarding_step_viewed` → `onboarding_completed`
3. Group by `experiment_key` and `variant`
4. Compare conversion rates and time-to-convert

**Key Metrics**:
- Completion rate per variant
- Time to complete per variant
- Drop-off points per variant
- Next-day retention per variant

---

## 6. Best Practices

### Privacy-First

✅ **DO**:
- Opt-out by default until consent
- Separate ATT from analytics consent
- Use anonymous IDs until user signs in
- Respect user's opt-out immediately
- Document what you track in privacy policy
- Delete data on user request

❌ **DON'T**:
- Track without consent
- Fingerprint devices
- Link data to third-parties without consent
- Use tracking for purposes not disclosed
- Collect more data than needed

### Performance

✅ **DO**:
- Batch events when possible
- Track asynchronously (don't block UI)
- Cache experiment variants locally
- Use debounced tracking for rapid events
- Clean up listeners on unmount

❌ **DON'T**:
- Block UI on tracking calls
- Track every keystroke or scroll
- Send duplicate events
- Over-track (signal vs noise)

### Data Quality

✅ **DO**:
- Use consistent event names
- Include context properties
- Validate event data
- Test tracking in staging
- Monitor for data quality issues

❌ **DON'T**:
- Use inconsistent naming (camelCase vs snake_case)
- Send null/undefined values
- Forget to track errors
- Skip testing tracking code

---

## 7. Troubleshooting

### Events Not Showing Up

**Problem**: Events not appearing in PostHog  
**Solutions**:
1. Check consent is granted: `consent.analytics === true`
2. Verify PostHog key is correct
3. Check network requests in dev tools
4. Ensure `posthog.optIn()` was called
5. Check PostHog project filters

### ATT Prompt Not Showing

**Problem**: ATT prompt doesn't appear on iOS  
**Solutions**:
1. Check iOS version >= 14.5
2. Verify `NSUserTrackingUsageDescription` in `app.json`
3. Try on real device (simulator may not show)
4. Check if already prompted (status cached)
5. Reset device to test again

### Experiments Not Consistent

**Problem**: User sees different variants  
**Solutions**:
1. Check variant is cached in AsyncStorage
2. Ensure variant assigned before first render
3. Don't re-assign variant on app restart
4. Use `getExperimentVariant()` consistently

### Performance Issues

**Problem**: App feels slow after adding tracking  
**Solutions**:
1. Don't track in hot paths (scroll, animation)
2. Debounce rapid events
3. Batch events before sending
4. Check for tracking in render loops
5. Profile with React DevTools

---

## 8. Migration from Old System

### Before

```typescript
// Old way (no consent)
analytics.track('screen_view');
```

### After

```typescript
// New way (with consent)
const { track, consent } = useTracking();

if (consent?.analytics) {
  track('screen_viewed');
}
```

### Gradual Rollout

1. **Week 1**: Add TrackingProvider, no events yet
2. **Week 2**: Show consent modal to new users
3. **Week 3**: Prompt existing users for consent
4. **Week 4**: Migrate old tracking calls
5. **Week 5**: Remove old analytics system

---

## 9. Files Reference

### Core Files

1. **`providers/TrackingProvider.tsx`** (500 lines)
   - ATT integration
   - Consent management
   - PostHog initialization
   - Event tracking wrapper

2. **`components/ConsentModal.tsx`** (400 lines)
   - Privacy-first consent UI
   - Granular controls
   - ATT status display

3. **`hooks/useTrackOnboardingStep.ts`** (in TrackingProvider)
   - Auto-track onboarding steps
   - Duration measurement
   - Completion tracking

### Dependencies

```json
{
  "posthog-react-native": "^3.0.0",
  "expo-tracking-transparency": "~3.0.0",
  "@react-native-async-storage/async-storage": "~1.21.0",
  "expo-notifications": "~0.27.0"
}
```

---

## 10. Example: Complete Onboarding Tracking

```typescript
import { useTracking, useTrackOnboardingStep } from '@/providers/TrackingProvider';

function OnboardingStep1() {
  const { track, getExperimentVariant, logExperimentExposure } = useTracking();
  const [variant, setVariant] = useState('A');
  
  // Auto-track step view and duration
  useTrackOnboardingStep('welcome');
  
  // Get experiment variant
  useEffect(() => {
    getExperimentVariant('onboarding_copy').then(v => {
      setVariant(v);
      logExperimentExposure('onboarding_copy', v);
    });
  }, []);
  
  const handleContinue = () => {
    track('onboarding_step_completed', {
      step_id: 'welcome',
      method: 'continue_button',
      variant,
    });
    router.push('/onboarding/step2');
  };
  
  return (
    <View>
      <Text>{variant === 'A' ? 'Welcome!' : 'Hello there!'}</Text>
      <Button onPress={handleContinue}>Continue</Button>
    </View>
  );
}
```

---

## Summary

✅ **ATT is separate from analytics consent**  
✅ **First-party analytics work without ATT**  
✅ **Opt-out by default until consent**  
✅ **Track what matters, respect privacy**  
✅ **Use PostHog for experiments and funnels**  

**Result**: Privacy-safe analytics that respects users and complies with Apple's guidelines!

---

**Last Updated**: October 18, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and Production-Ready
