# 🎯 Superwall Implementation Guide

**Research Date:** Nov 14, 2025  
**Sources:** 
- [Superwall-iOS](https://github.com/superwall/Superwall-iOS)
- [Superwall-Android](https://github.com/superwall/Superwall-Android)
- [expo-superwall](https://github.com/superwall/expo-superwall)

---

## 📋 Table of Contents

1. [What is Superwall?](#what-is-superwall)
2. [Platform Support](#platform-support)
3. [Core Concepts](#core-concepts)
4. [Expo Implementation (React Native)](#expo-implementation)
5. [iOS Implementation](#ios-implementation)
6. [Android Implementation](#android-implementation)
7. [Triggering Different Paywalls](#triggering-different-paywalls)
8. [What You Need to Provide](#what-you-need-to-provide)
9. [Implementation Comparison](#implementation-comparison)
10. [Migration to Our App](#migration-to-our-app)

---

## 🎯 What is Superwall?

**Superwall** is a platform that lets you:
- ✅ **Remotely configure** every aspect of your paywall
- ✅ **A/B test** different paywall designs and strategies
- ✅ **Trigger paywalls** based on user behavior or specific placements
- ✅ **Manage subscriptions** across iOS, Android, and web
- ✅ **Track conversions** and optimize revenue

**Key Feature:** You can change paywall UI, copy, pricing, and strategies **without app updates** — all from the Superwall dashboard.

---

## 📱 Platform Support

| Platform | SDK | Status | Web Support |
|----------|-----|--------|-------------|
| **iOS** | `SuperwallKit` | ✅ Production Ready | ❌ Native Only |
| **Android** | `superwall-android` | ✅ Production Ready | ❌ Native Only |
| **Expo/React Native** | `expo-superwall` | ✅ Production Ready | ⚠️ iOS/Android only |
| **Web** | Custom Integration | ⚠️ Not officially supported | ❌ No SDK |

**Important:** Superwall does NOT have official web support. For Expo web, you'd need to use your current custom paywall implementation.

---

## 🧩 Core Concepts

### 1. **Placements**
Placements are **trigger points** in your app where a paywall can be shown. Examples:
- `"onboarding"` - After user completes signup
- `"feature_limit"` - When user hits usage limit
- `"settings_upgrade"` - From settings screen
- `"ai_chat"` - Before accessing premium feature

### 2. **Campaigns**
Campaigns define **when** and **to whom** a paywall should be shown:
- Audience rules (e.g., "show to users who opened app 3+ times")
- Triggers (e.g., "show after 7 days trial expires")
- Frequency caps (e.g., "show once per week")

### 3. **Paywalls**
The **UI/design** of the subscription screen:
- Configured remotely in Superwall dashboard
- Can have multiple variants for A/B testing
- Supports custom HTML/CSS or native templates

### 4. **Feature Gating**
The `feature()` callback that runs when user has access:
```typescript
registerPlacement({
  placement: "ai_chat",
  feature() {
    // User has access - let them use the feature
    navigateToChat();
  }
});
```

---

## 🚀 Expo Implementation (React Native)

### Installation

```bash
npx expo install expo-superwall
```

### Setup

```typescript
// app/_layout.tsx
import { SuperwallProvider } from 'expo-superwall';

export default function RootLayout() {
  return (
    <SuperwallProvider 
      apiKeys={{
        ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY,
        android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY,
      }}
    >
      <App />
    </SuperwallProvider>
  );
}
```

### Basic Usage

#### 1. Handle Loading State

```typescript
import { 
  SuperwallProvider, 
  SuperwallLoading, 
  SuperwallLoaded 
} from 'expo-superwall';

function App() {
  return (
    <SuperwallProvider apiKeys={{ ios: API_KEY }}>
      <SuperwallLoading>
        <ActivityIndicator />
      </SuperwallLoading>
      
      <SuperwallLoaded>
        <MainApp />
      </SuperwallLoaded>
    </SuperwallProvider>
  );
}
```

#### 2. Manage User Identity

```typescript
import { useUser } from 'expo-superwall';

function UserScreen() {
  const { identify, signOut, update, user, subscriptionStatus } = useUser();

  // Identify user on login
  const handleLogin = async (userId: string) => {
    await identify(userId);
  };

  // Sign out user
  const handleLogout = async () => {
    await signOut();
  };

  // Update user attributes
  const updateUserData = async () => {
    await update((oldAttrs) => ({
      ...oldAttrs,
      plan: 'pro',
      customProperty: 'value',
    }));
  };

  return (
    <View>
      <Text>User: {user?.appUserId}</Text>
      <Text>Status: {subscriptionStatus?.status}</Text>
    </View>
  );
}
```

#### 3. Trigger Paywalls with Placements

```typescript
import { usePlacement } from 'expo-superwall';

function FeatureScreen() {
  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => console.log('Paywall shown:', info),
    onDismiss: (info, result) => console.log('Dismissed:', result),
    onSkip: (reason) => console.log('Skipped:', reason),
    onError: (error) => console.error('Error:', error),
  });

  const handleAccessFeature = async () => {
    await registerPlacement({
      placement: 'ai_chat', // Placement ID from dashboard
      feature() {
        // ✅ User has access - execute feature
        console.log('Feature unlocked!');
        navigateToChat();
      },
    });
  };

  return (
    <Button 
      title="Access AI Chat" 
      onPress={handleAccessFeature} 
    />
  );
}
```

### Advanced: Event Tracking

```typescript
import { useSuperwallEvents } from 'expo-superwall';

function Analytics() {
  useSuperwallEvents({
    onSuperwallEvent: (eventInfo) => {
      // eventInfo.event is a discriminated union of Superwall events
      // eventInfo.params holds structured payload
      console.log('[SW]', eventInfo.event.event, eventInfo.params);
      // Example: forward to analytics
      trackEvent(`sw:${eventInfo.event.event}`, eventInfo.params);
    },
    onSubscriptionStatusChange: (status) => {
      // status.status: 'UNKNOWN' | 'INACTIVE' | 'ACTIVE'
      trackEvent('sw:subscriptionStatus', { status: status.status });
    },
  });
  return null;
}
```

#### Hooks API Cheatsheet (Expo)

```typescript
// Core store & actions
import { useSuperwall } from 'expo-superwall';
const store = useSuperwall();
// store.isConfigured, store.isLoading, store.subscriptionStatus
await store.setUserAttributes({ plan: 'free' });
await store.preloadAllPaywalls();
await store.preloadPaywalls(['ai_chat', 'onboarding']);
await store.setLogLevel('debug'); // 'debug' | 'info' | 'warn' | 'error' | 'none'

// User identity & attributes
import { useUser } from 'expo-superwall';
const { identify, update, signOut, subscriptionStatus, user } = useUser();
await identify('user_123', { restorePaywallAssignments: true });
await update((old) => ({ ...old, cohort: 'onboarding' }));

// Presentations by placement
import { usePlacement } from 'expo-superwall';
const { registerPlacement, state } = usePlacement({
  onPresent: (info) => console.log('presented', info.identifier),
  onDismiss: (info, result) => console.log('dismissed', result.type),
  onSkip: (reason) => console.log('skipped', reason.type),
  onError: (e) => console.error('error', e),
});
await registerPlacement({ placement: 'ai_chat', params: { source: 'chat_tab' }, feature() { /* unlocked */ } });
// state: { status: 'idle' | 'presented' | 'dismissed' | 'skipped' | 'error', ... }

// Low-level events
import { useSuperwallEvents } from 'expo-superwall';
useSuperwallEvents({
  onPaywallPresent: (info) => console.log('will show', info.name),
  onPaywallDismiss: (info, result) => console.log('closed', result.type),
  onPaywallSkip: (reason) => console.log('skip', reason.type),
  onPaywallError: (error) => console.error('sw error', error),
  onSuperwallEvent: (eventInfo) => console.log('event', eventInfo.event.event),
});
```

#### Paywall State & Event Payloads (Selected)

```typescript
// SubscriptionStatus
type SubscriptionStatus = { status: 'UNKNOWN' } | { status: 'INACTIVE' } | { status: 'ACTIVE'; entitlements: { id: string; type: 'SERVICE_LEVEL' }[] };

// PaywallResult
type PaywallResult =
  | { type: 'purchased'; productId: string }
  | { type: 'declined' }
  | { type: 'restored' };

// PaywallSkippedReason
type PaywallSkippedReason =
  | { type: 'Holdout'; experiment: { id: string } }
  | { type: 'NoAudienceMatch' }
  | { type: 'PlacementNotFound' };

// PaywallState (from usePlacement)
type PaywallState =
  | { status: 'idle' }
  | { status: 'presented'; paywallInfo: PaywallInfo }
  | { status: 'dismissed'; result: PaywallResult }
  | { status: 'skipped'; reason: PaywallSkippedReason }
  | { status: 'error'; error: string };
```

#### Preloading, Logging & Debugging

```typescript
const sw = useSuperwall();
await sw.preloadAllPaywalls(); // warm cache at app start
await sw.preloadPaywalls(['ai_chat', 'onboarding']);
await sw.setLogLevel(__DEV__ ? 'debug' : 'error');
```

#### Analytics Mapping Example (PostHog / Backend)

```typescript
useSuperwallEvents({
  onSuperwallEvent: ({ event, params }) => {
    // PostHog
    posthog.capture(`sw:${event.event}`, params);
    // Backend
    fetch(`${API_URL}/analytics/superwall`, { method: 'POST', body: JSON.stringify({ event: event.event, params }) });
  },
});
```

#### Offline / No-Presentation Handling

Handle decisions where no paywall is shown (user subscribed, holdout, no audience match, timeout):

```typescript
const { registerPlacement } = usePlacement({ onSkip: (reason) => console.log('skip', reason) });
await registerPlacement({
  placement: 'ai_chat',
  feature() {
    // Called when user already has access OR after successful purchase
    navigateToChat();
  },
});
```

---

## 🍎 iOS Implementation

### Installation (Swift Package Manager)

1. In Xcode: File ▸ Add Packages...
2. Search: `https://github.com/superwall/Superwall-iOS`
3. Set dependency to: Up to Next Major Version `4.0.0`

### Setup

```swift
// AppDelegate.swift
import SuperwallKit

class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    // Configure Superwall
    Superwall.configure(
      apiKey: "YOUR_API_KEY",
      purchaseController: YourPurchaseController()
    )
    
    return true
  }
}
```

### Trigger Paywall

```swift
import SuperwallKit

class ViewController: UIViewController {
  func showPremiumFeature() {
    Task {
      await Superwall.shared.register(event: "ai_chat") {
        // User has access - show feature
        self.navigateToChat()
      }
    }
  }
}
```

### User Identity

```swift
// Identify user
Superwall.shared.identify(userId: "user_123")

// Set user attributes
Superwall.shared.setUserAttributes([
  "plan": "pro",
  "signupDate": Date(),
])

// Reset user (logout)
Superwall.shared.reset()
```

---

## 🤖 Android Implementation

### Installation (Gradle)

```gradle
// build.gradle
dependencies {
  implementation "com.superwall.sdk:superwall-android:1.0.0"
}
```

### AndroidManifest.xml

```xml
<manifest>
  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="com.android.vending.BILLING" />

  <application>
    <!-- Activities -->
    <activity
      android:name="com.superwall.sdk.paywall.view.SuperwallPaywallActivity"
      android:theme="@style/Theme.MaterialComponents.DayNight.NoActionBar"
      android:configChanges="orientation|screenSize|keyboardHidden" />
  </application>
</manifest>
```

### Setup

```kotlin
// MainActivity.kt
import com.superwall.sdk.Superwall

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    Superwall.configure(
      context = this,
      apiKey = "YOUR_API_KEY"
    )
  }
}
```

### Trigger Paywall

```kotlin
import com.superwall.sdk.Superwall

class FeatureActivity : AppCompatActivity() {
  fun showPremiumFeature() {
    Superwall.shared.register("ai_chat") {
      // User has access
      navigateToChat()
    }
  }
}
```

---

## 🎯 Triggering Different Paywalls

### Method 1: **Different Placements** (Recommended)

Create multiple placements in Superwall dashboard, each with its own paywall design:

```typescript
// Onboarding paywall
registerPlacement({
  placement: 'onboarding',
  feature() { completeOnboarding(); }
});

// Feature limit paywall
registerPlacement({
  placement: 'message_limit',
  feature() { sendMessage(); }
});

// Upgrade prompt paywall
registerPlacement({
  placement: 'settings_upgrade',
  feature() { showPremiumSettings(); }
});
```

**Dashboard Configuration:**
- `onboarding` → Shows trial offer with "Start Free Trial" CTA
- `message_limit` → Shows "Unlock Unlimited Messages" CTA
- `settings_upgrade` → Shows feature comparison table

### Method 2: **Parameters/Properties**

Pass custom parameters to influence which paywall variant shows:

```typescript
import { Superwall } from 'expo-superwall';

// Trigger with custom properties
Superwall.register('feature_gate', {
  feature_name: 'ai_chat',
  user_tier: 'free',
  usage_count: 5,
}, () => {
  // Feature callback
});
```

Then in Superwall dashboard, create audience rules:
- If `feature_name == "ai_chat"` → Show AI-specific paywall
- If `usage_count > 10` → Show power-user paywall

### Method 3: **User Attributes**

Set user attributes and create different campaigns:

```typescript
// Set attributes
await update({
  plan: 'free',
  trial_ended: true,
  feature_usage: { ai_chat: 5 },
});

// Superwall automatically shows different paywalls based on attributes
registerPlacement({ placement: 'upgrade' });
```

**Dashboard Rules:**
- If `trial_ended == true` → Show "Your trial has ended" paywall
- If `plan == "free"` → Show "Upgrade to Pro" paywall
- If `feature_usage.ai_chat > 3` → Show "Unlock unlimited AI" paywall

---

## 📦 What You Need to Provide

### 1. **API Keys**

Get from Superwall dashboard:
- iOS API Key
- Android API Key

```typescript
// .env
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_abc123...
EXPO_PUBLIC_SUPERWALL_ANDROID_KEY=pk_def456...
```

### 2. **Purchase Controller** (iOS/Android Native)

For **native apps**, you need to implement a purchase controller that handles:
- Loading products from App Store / Play Store
- Processing purchases
- Restoring purchases

**Expo/React Native:** Purchases are handled by the Superwall SDK via the native app stores (App Store / Google Play). Use paywall callbacks and purchase events (e.g., `onPurchase`, `onPurchaseRestore`) as needed; product configuration lives in the Superwall dashboard and the respective stores.

### 3. **Placement IDs**

Define placements in Superwall dashboard:
- `onboarding` - After signup
- `ai_chat` - Before AI features
- `voice_notes` - Before voice recording
- `message_limit` - After X messages
- `settings_upgrade` - From settings

### 4. **User Identification**

Identify users when they log in:

```typescript
const { identify } = useUser();

async function handleLogin(userId: string) {
  await identify(userId);
}
```

### 5. **Paywall Designs** (in Superwall Dashboard)

Create paywall UI/UX remotely:
- Choose template (or custom HTML/CSS)
- Set pricing options
- Add copy and images
- Configure buttons and CTAs

### 6. **Campaign Rules** (in Superwall Dashboard)

Define when paywalls show:
- Audience: "Users who completed onboarding"
- Trigger: "After 3 days since signup"
- Frequency: "Once per week"

---

## 🔄 Implementation Comparison

| Feature | **Expo** | **iOS Native** | **Android Native** |
|---------|----------|----------------|-------------------|
| **Setup** | `<SuperwallProvider>` | `Superwall.configure()` | `Superwall.configure()` |
| **Trigger** | `registerPlacement()` | `register(event:)` | `register()` |
| **User ID** | `identify(userId)` | `identify(userId:)` | `identify()` |
| **Attributes** | `update()` | `setUserAttributes()` | `setUserAttributes()` |
| **Events** | `useSuperwallEvents()` | Delegate methods | Listeners |
| **Web Support** | ❌ No | ❌ No | ❌ No |

---

## 🚀 Migration to Our App

### Current State

```typescript
// providers/PaywallProvider.tsx
export function PaywallProvider({ children }) {
  const [config, setConfig] = useState<PaywallConfig>();
  
  const checkPaywall = async () => {
    // Custom logic
  };
  
  return (
    <PaywallContext.Provider value={{ config, checkPaywall }}>
      {children}
    </PaywallContext.Provider>
  );
}

// Usage
const { checkPaywall } = usePaywall();
await checkPaywall();
```

### Migrated State (with Superwall)

```typescript
// app/_layout.tsx
import { SuperwallProvider } from 'expo-superwall';

export default function RootLayout() {
  return (
    <SuperwallProvider 
      apiKeys={{
        ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY,
        android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY,
      }}
    >
      <SuperwallLoading>
        <ActivityIndicator />
      </SuperwallLoading>
      
      <SuperwallLoaded>
        <SubscriptionProvider>
          <PaywallProvider>
            {/* Rest of app */}
          </PaywallProvider>
        </SubscriptionProvider>
      </SuperwallLoaded>
    </SuperwallProvider>
  );
}
```

### Replace PaywallGate

**Before:**
```typescript
<PaywallGate featureArea="ai_features">
  <AIChatScreen />
</PaywallGate>
```

**After:**
```typescript
function AIChatWrapper() {
  const { registerPlacement } = usePlacement();
  const [hasAccess, setHasAccess] = useState(false);

  const checkAccess = async () => {
    await registerPlacement({
      placement: 'ai_chat',
      feature() {
        setHasAccess(true);
      },
    });
  };

  useEffect(() => {
    checkAccess();
  }, []);

  if (!hasAccess) return null;
  
  return <AIChatScreen />;
}
```

### Identify Users

```typescript
// hooks/useAuth.ts
import { useUser as useSuperwallUser } from 'expo-superwall';

export function useAuth() {
  const { user } = useAuth(); // Your existing auth
  const { identify, signOut: superwallSignOut } = useSuperwallUser();

  const login = async (credentials) => {
    const user = await signIn(credentials);
    
    // Identify with Superwall
    await identify(user.id);
    
    return user;
  };

  const logout = async () => {
    await signOut();
    
    // Reset Superwall
    await superwallSignOut();
  };

  return { login, logout };
}
```

---

## 📊 What Mobile Apps Need

### iOS App

```swift
// 1. Install SDK
// Add via SPM: https://github.com/superwall/Superwall-iOS

// 2. Configure in AppDelegate
import SuperwallKit

Superwall.configure(apiKey: "pk_ios_...")

// 3. Trigger paywalls
Superwall.shared.register(event: "ai_chat") {
  // Show feature
}

// 4. Identify users
Superwall.shared.identify(userId: user.id)
```

**Provide to iOS:**
- ✅ API Key from dashboard
- ✅ Placement IDs (e.g., `"ai_chat"`, `"onboarding"`)
- ✅ User ID on login

### Android App

```kotlin
// 1. Install SDK
// Add to build.gradle: implementation "com.superwall.sdk:superwall-android:1.0.0"

// 2. Configure in MainActivity
import com.superwall.sdk.Superwall

Superwall.configure(this, "pk_android_...")

// 3. Trigger paywalls
Superwall.shared.register("ai_chat") {
  // Show feature
}

// 4. Identify users
Superwall.shared.identify("user_123")
```

**Provide to Android:**
- ✅ API Key from dashboard
- ✅ Placement IDs
- ✅ User ID on login
- ✅ AndroidManifest permissions

### Expo Web (Custom Implementation)

**Superwall does NOT support web.** For web, continue using custom implementation:

```typescript
// Platform-specific logic
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Use custom PaywallGate
  return <CustomPaywallGate />;
} else {
  // Use Superwall
  return <SuperwallPaywallGate />;
}
```

---

## 🎨 Dashboard Configuration

### 1. Create Placements

In Superwall dashboard:
- Go to "Placements"
- Create: `onboarding`, `ai_chat`, `voice_notes`, etc.
- Assign paywalls to each placement

### 2. Design Paywalls

- Choose template or build custom
- Set product IDs
- Add copy, images, CTAs
- Configure colors and branding

### 3. Create Campaigns

- Define audience rules
- Set triggers (time, event, attribute)
- Configure frequency caps
- Enable A/B testing

### 4. Test

- Use Superwall test mode
- Scan QR code to test on device
- Verify purchase flow

---

## ✅ Pros of Superwall

1. ✅ **Remote configuration** - No app updates needed
2. ✅ **A/B testing** - Test multiple paywall variants
3. ✅ **Analytics** - Built-in conversion tracking
4. ✅ **Cross-platform** - iOS + Android support
5. ✅ **Easy integration** - Clean API, good docs

## ❌ Cons of Superwall

1. ❌ **No web support** - Mobile only
2. ❌ **Additional dependency** - Another SDK to manage
3. ❌ **Learning curve** - Dashboard configuration
4. ❌ **Cost** - Paid service (pricing varies)
5. ❌ **Lock-in** - Switching away requires refactor

---

## 🎯 Recommendation

### **Use Superwall if:**
- ✅ You want to A/B test paywalls frequently
- ✅ You need remote control without app updates
- ✅ Mobile (iOS/Android) is your primary platform
- ✅ Budget allows for the service

### **Stick with custom implementation if:**
- ✅ Web is critical to your business
- ✅ You want full control and no vendor lock-in
- ✅ Your paywall logic is simple and stable
- ✅ Budget is tight

### **Hybrid Approach:**
- ✅ Use Superwall for iOS/Android
- ✅ Use custom implementation for web
- ✅ Share backend subscription state across all platforms

---

## 📚 Resources

- **Superwall Docs:** https://docs.superwall.com
- **iOS SDK Docs:** https://sdk.superwall.me/documentation/superwallkit/
- **Android Beta Docs:** https://superwall.com/docs/android-beta
- **Expo Package:** https://github.com/superwall/expo-superwall
- **iOS Examples:** https://github.com/superwall/Superwall-iOS/tree/develop/Examples
- **Android Examples:** https://github.com/superwall/Superwall-Android

---

**Created:** Nov 14, 2025  
**Last Updated:** Nov 14, 2025  
**Status:** Research Complete ✅
