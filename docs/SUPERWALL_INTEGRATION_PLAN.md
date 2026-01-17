# 🎯 Superwall Integration Plan for PersonalCRM

**Date:** Nov 14, 2025  
**Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines the plan to integrate Superwall into PersonalCRM to enable:
- ✅ Remote paywall configuration (no app updates needed)
- ✅ A/B testing different paywall designs
- ✅ Platform-specific paywalls (iOS/Android native, Web custom)
- ✅ User-triggered paywalls at specific feature gates

---

## 🎯 Current vs. Future State

### Current Implementation

```
PaywallProvider (Custom)
├── paywallConfig.ts - Backend config fetching
├── PaywallGate - Feature gating component
├── SimplePaywall - Custom UI
└── Stripe integration
```

**Issues:**
- ❌ Changes require app updates
- ❌ No A/B testing capability
- ❌ Manual trigger logic
- ❌ Limited analytics

### Future Implementation (Hybrid Approach)

```
Platform Detection
├── iOS/Android → Superwall SDK
│   ├── expo-superwall provider
│   ├── Remote paywall designs
│   └── RevenueCat integration
└── Web → Custom Implementation
    ├── Existing PaywallGate
    ├── Backend config
    └── Stripe integration
```

**Benefits:**
- ✅ Remote configuration for mobile
- ✅ A/B testing on mobile
- ✅ Web support maintained
- ✅ Unified subscription state

---

## 📦 What We Need

### 1. Superwall Account Setup

- [ ] Sign up at https://superwall.com
- [ ] Get API keys:
  - [ ] iOS API key
  - [ ] Android API key
- [ ] Configure integration:
  - [ ] Link to RevenueCat (if using)
  - [ ] Link to App Store Connect
  - [ ] Link to Google Play Console

### 2. Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_ios_...
EXPO_PUBLIC_SUPERWALL_ANDROID_KEY=pk_android_...
```

### 3. Dependencies

```bash
npx expo install expo-superwall
```

### 4. Define Placements

Placements to create in Superwall dashboard:

| Placement ID | Description | When to Show |
|--------------|-------------|--------------|
| `onboarding_complete` | After user completes signup | Post-onboarding screen |
| `ai_chat_access` | Before accessing AI chat | Chat screen |
| `voice_notes_limit` | After free voice note limit | Voice recording |
| `message_templates` | Before using templates | Template picker |
| `warmth_advanced` | Advanced warmth features | Settings |
| `contacts_limit` | After 50 contacts | Contact import |
| `analytics_dashboard` | Analytics features | Stats screen |
| `settings_upgrade` | Generic upgrade CTA | Settings menu |

---

## 🔧 Implementation Steps

### Phase 1: Setup & Configuration

#### Step 1.1: Install Superwall

```bash
npx expo install expo-superwall
```

#### Step 1.2: Wrap App with SuperwallProvider

```typescript
// app/_layout.tsx
import { SuperwallProvider, SuperwallLoading, SuperwallLoaded } from 'expo-superwall';
import { Platform } from 'react-native';

export default function RootLayout() {
  // Only use Superwall on native platforms
  const useSuperwall = Platform.OS !== 'web';

  if (!useSuperwall) {
    // Web: Use existing implementation
    return (
      <ThemeProvider>
        <SubscriptionProvider>
          <PaywallProvider>
            <RootLayoutNav />
          </PaywallProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    );
  }

  // iOS/Android: Use Superwall
  return (
    <SuperwallProvider
      apiKeys={{
        ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY!,
        android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY!,
      }}
    >
      <SuperwallLoading>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Loading...</Text>
        </View>
      </SuperwallLoading>

      <SuperwallLoaded>
        <ThemeProvider>
          <SubscriptionProvider>
            <PaywallProvider>
              <RootLayoutNav />
            </PaywallProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </SuperwallLoaded>
    </SuperwallProvider>
  );
}
```

#### Step 1.3: Create Platform-Aware Hook

```typescript
// hooks/usePaywallGate.ts
import { Platform } from 'react-native';
import { usePlacement } from 'expo-superwall';
import { usePaywall } from '@/providers/PaywallProvider';

export function usePaywallGate(placementId: string) {
  const isWeb = Platform.OS === 'web';
  
  // Web: Use existing custom implementation
  const customPaywall = usePaywall();
  
  // Mobile: Use Superwall
  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => {
      console.log('[Superwall] Paywall presented:', info);
    },
    onDismiss: (info, result) => {
      console.log('[Superwall] Paywall dismissed:', result);
    },
    onSkip: (reason) => {
      console.log('[Superwall] Paywall skipped:', reason);
    },
    onError: (error) => {
      console.error('[Superwall] Error:', error);
    },
  });

  const checkAccess = async (callback: () => void) => {
    if (isWeb) {
      // Web: Use custom logic
      const hasAccess = await customPaywall.checkPaywall();
      if (hasAccess) {
        callback();
      }
    } else {
      // Mobile: Use Superwall
      await registerPlacement({
        placement: placementId,
        feature: callback,
      });
    }
  };

  return { checkAccess, state };
}
```

---

### Phase 2: Migrate Feature Gates

#### Before (Current)

```typescript
// app/(tabs)/chat.tsx
import { PaywallGate } from '@/components/PaywallGate';

export default function ChatScreen() {
  return (
    <PaywallGate featureArea="ai_features">
      <AIChatInterface />
    </PaywallGate>
  );
}
```

#### After (Platform-Aware)

```typescript
// app/(tabs)/chat.tsx
import { usePaywallGate } from '@/hooks/usePaywallGate';
import { useState, useEffect } from 'react';

export default function ChatScreen() {
  const { checkAccess } = usePaywallGate('ai_chat_access');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess(() => {
      setHasAccess(true);
    });
  }, []);

  if (!hasAccess) {
    return (
      <View style={styles.locked}>
        <Text>Checking access...</Text>
      </View>
    );
  }

  return <AIChatInterface />;
}
```

---

### Phase 3: User Identity Management

#### Step 3.1: Sync User Identity

```typescript
// hooks/useAuth.ts
import { useUser as useSuperwallUser } from 'expo-superwall';
import { Platform } from 'react-native';

export function useAuth() {
  const { user: authUser, signIn, signOut: authSignOut } = useAuthContext();
  const superwallUser = Platform.OS !== 'web' ? useSuperwallUser() : null;

  const handleSignIn = async (credentials: Credentials) => {
    // Sign in with your auth system
    const user = await signIn(credentials);

    // Identify with Superwall (mobile only)
    if (superwallUser) {
      await superwallUser.identify(user.id);
    }

    return user;
  };

  const handleSignOut = async () => {
    // Sign out from your auth system
    await authSignOut();

    // Reset Superwall (mobile only)
    if (superwallUser) {
      await superwallUser.signOut();
    }
  };

  return {
    user: authUser,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
```

#### Step 3.2: Update User Attributes

```typescript
// providers/SubscriptionProvider.tsx
import { useUser as useSuperwallUser } from 'expo-superwall';
import { Platform } from 'react-native';

export function SubscriptionProvider({ children }) {
  const superwallUser = Platform.OS !== 'web' ? useSuperwallUser() : null;
  const [tier, setTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    if (superwallUser) {
      // Update Superwall with subscription info
      superwallUser.update((attrs) => ({
        ...attrs,
        subscription_tier: tier,
        trial_ended: isTrialExpired,
        payment_platform: paymentPlatform,
      }));
    }
  }, [tier, isTrialExpired, paymentPlatform]);

  // ... rest of provider
}
```

---

### Phase 4: Create Paywalls in Dashboard

For each placement, create paywall designs in Superwall dashboard:

#### Onboarding Paywall (`onboarding_complete`)

**Copy:**
```
Start Your Free Trial
Get unlimited access to all features

✓ Unlimited AI conversations
✓ Voice notes with transcription
✓ Advanced warmth tracking
✓ Priority support

7 days free, then $9.99/month
```

**CTA:** "Start Free Trial"

#### AI Chat Paywall (`ai_chat_access`)

**Copy:**
```
Unlock AI-Powered Conversations
Have meaningful chats with your contacts

✓ Personalized conversation starters
✓ Relationship insights
✓ Context-aware responses

$9.99/month or $99/year
```

**CTA:** "Unlock AI Chat"

#### Voice Notes Paywall (`voice_notes_limit`)

**Copy:**
```
You've Reached Your Free Limit
Upgrade to record unlimited voice notes

Free: 10 voice notes/month
Pro: Unlimited voice notes

Plus transcription & AI summaries
```

**CTA:** "Go Pro"

---

### Phase 5: Campaign Rules

Configure when paywalls show:

#### Campaign 1: New User Onboarding

```
Placement: onboarding_complete
Audience: All users
Trigger: After completing onboarding
Frequency: Once per user
```

#### Campaign 2: Trial Expiration

```
Placement: ai_chat_access
Audience: Users with expired trials
Trigger: trial_ends_at < now()
Frequency: Every app open (until subscribed)
```

#### Campaign 3: Feature Usage Limit

```
Placement: voice_notes_limit
Audience: Free users
Trigger: voice_note_count >= 10
Frequency: Once per day
```

---

### Phase 6: Analytics & Events

#### Step 6.1: Track Superwall Events

```typescript
// providers/AnalyticsProvider.tsx
import { useSuperwallEvents } from 'expo-superwall';
import { Platform } from 'react-native';

export function AnalyticsProvider({ children }) {
  if (Platform.OS !== 'web') {
    useSuperwallEvents({
      onEvent: (event) => {
        // Track to your analytics
        trackEvent('superwall_event', {
          event_name: event.name,
          placement: event.params?.placement,
          paywall_id: event.params?.paywallId,
        });
      },
    });
  }

  return <>{children}</>;
}
```

#### Step 6.2: Track Custom Events

```typescript
// When user performs action
import { Superwall } from 'expo-superwall';

async function handleFeatureAction() {
  // Track event
  await Superwall.track('voice_note_recorded', {
    count: voiceNoteCount + 1,
    duration: recordingDuration,
  });

  // This can trigger a paywall if configured in dashboard
}
```

---

## 🧪 Testing Plan

### Test Cases

1. **iOS Native**
   - [ ] Onboarding paywall shows after signup
   - [ ] AI chat paywall blocks free users
   - [ ] User can purchase through paywall
   - [ ] Subscription syncs correctly
   - [ ] User identity persists

2. **Android Native**
   - [ ] Same as iOS tests
   - [ ] Google Play billing works
   - [ ] Subscription status syncs

3. **Expo Web**
   - [ ] Custom paywall still works
   - [ ] No Superwall SDK loaded
   - [ ] Subscription state syncs
   - [ ] Stripe checkout works

4. **Cross-Platform**
   - [ ] User subscribes on iOS → sees benefits on web
   - [ ] User subscribes on web → sees benefits on Android
   - [ ] Subscription status consistent across platforms

---

## 📊 Migration Checklist

### Pre-Migration

- [ ] Create Superwall account
- [ ] Get API keys
- [ ] Set up test environment
- [ ] Create placements in dashboard
- [ ] Design 3 initial paywalls

### Migration

- [ ] Install expo-superwall
- [ ] Add environment variables
- [ ] Wrap app with SuperwallProvider
- [ ] Create usePaywallGate hook
- [ ] Migrate 1 feature gate (AI chat)
- [ ] Test on iOS/Android/Web
- [ ] Migrate remaining feature gates
- [ ] Update user identity logic
- [ ] Configure campaigns

### Post-Migration

- [ ] Monitor analytics
- [ ] Test A/B variants
- [ ] Optimize conversion rates
- [ ] Document for team

---

## 🎯 Rollout Strategy

### Phase 1: Soft Launch (1 week)

- Deploy to 10% of users
- Monitor for errors
- Track conversion rates
- Gather feedback

### Phase 2: Gradual Rollout (2 weeks)

- Increase to 50% of users
- A/B test paywall variants
- Optimize messaging
- Fix any issues

### Phase 3: Full Launch (1 week)

- Deploy to 100% of users
- Remove old paywall code
- Update documentation
- Celebrate! 🎉

---

## 💰 Cost Analysis

### Superwall Pricing

- **Free:** Up to 1,000 MAU (Monthly Active Users)
- **Growth:** $250/month for 10,000 MAU
- **Enterprise:** Custom pricing

### ROI Calculation

**Current State:**
- Manual paywall updates: 2-4 hours per iteration
- Limited A/B testing: Low optimization
- Estimated conversion: 2-3%

**With Superwall:**
- Remote updates: 15 minutes per iteration
- Continuous A/B testing: High optimization
- Estimated conversion: 4-6% (industry average)

**Break-even:** ~500 additional conversions/month

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Web not supported** | High | Keep custom implementation for web |
| **Vendor lock-in** | Medium | Abstract with usePaywallGate hook |
| **Additional cost** | Medium | Start with free tier, track ROI |
| **Learning curve** | Low | Good documentation, example apps |
| **Migration bugs** | Medium | Gradual rollout, comprehensive testing |

---

## 📚 Resources

- **Superwall Dashboard:** https://app.superwall.com
- **Expo SDK Docs:** https://github.com/superwall/expo-superwall
- **Example App:** https://github.com/superwall/expo-superwall/tree/main/example
- **Support:** https://docs.superwall.com

---

## ✅ Next Steps

1. **This Week:**
   - [ ] Create Superwall account
   - [ ] Get API keys
   - [ ] Install expo-superwall

2. **Next Week:**
   - [ ] Create 3 placements
   - [ ] Design 3 paywalls
   - [ ] Implement usePaywallGate hook

3. **Following Week:**
   - [ ] Migrate AI chat feature
   - [ ] Test on all platforms
   - [ ] Roll out to 10% of users

---

**Created:** Nov 14, 2025  
**Owner:** Development Team  
**Status:** ✅ Ready for Implementation
