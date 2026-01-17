# Event Tracking & Navigation System

## Overview

Complete implementation of Superwall-equivalent event tracking and enhanced bottom navigation with active state indicators.

---

## 1. Event Tracking System

### `usePaywallEvents` Hook

**Purpose**: Low-level event subscription for paywall and subscription events.  
**File**: `hooks/usePaywallEvents.ts`

#### Quick Start

```typescript
import { usePaywallEvents } from '@/hooks/usePaywallEvents';

function App() {
  usePaywallEvents({
    onPaywallPresent: (info) => {
      console.log('Paywall shown:', info.name);
      analytics.track('paywall_view', { name: info.name });
    },
    
    onSubscriptionStatusChange: (status) => {
      if (status.status === 'ACTIVE') {
        console.log('User subscribed!');
        showConfetti();
      }
    },
    
    onPaywallDismiss: (info, result) => {
      console.log('Dismissed:', result.type);
    }
  });
}
```

#### Available Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onPaywallPresent` | `PaywallInfo` | Paywall is shown to user |
| `onPaywallDismiss` | `PaywallInfo, PaywallResult` | User closed paywall |
| `onPaywallSkip` | `PaywallSkippedReason` | Paywall was skipped (user subscribed, etc.) |
| `onPaywallError` | `string` | Error occurred |
| `willPresentPaywall` | `PaywallInfo` | About to show paywall |
| `didPresentPaywall` | `PaywallInfo` | Paywall shown |
| `willDismissPaywall` | `PaywallInfo` | About to dismiss |
| `didDismissPaywall` | `PaywallInfo` | Paywall dismissed |
| `onSubscriptionStatusChange` | `SubscriptionStatus` | Subscription changed |
| `onCustomPaywallAction` | `string` | Custom button clicked |
| `onPaywallWillOpenURL` | `string` | External link clicked |
| `onPaywallWillOpenDeepLink` | `string` | Deep link activated |
| `onPaywallEvent` | `PaywallEventInfo` | Generic event |
| `onLog` | `LogParams` | Debug/error logs |

#### Event Emitters

```typescript
import {
  emitPaywallPresent,
  emitPaywallDismiss,
  emitSubscriptionStatusChange,
  emitPaywallError,
  emitPaywallSkip,
} from '@/hooks/usePaywallEvents';

// Emit from anywhere in your app
emitPaywallPresent({
  name: 'Premium Features',
  slug: 'premium',
  presentedAt: new Date().toISOString(),
});

emitSubscriptionStatusChange({
  status: 'ACTIVE',
  tier: 'pro',
  currentPeriodEnd: '2025-11-18T00:00:00Z',
});
```

#### Handler ID Filtering

```typescript
// Only receive events from specific placement
usePaywallEvents({
  handlerId: 'onboarding-paywall',
  onPaywallPresent: (info) => {
    // Only fires for events with matching handlerId
  }
});

// Emit with handlerId
emitPaywallPresent({
  name: 'Onboarding',
  slug: 'onboarding',
  presentedAt: new Date().toISOString(),
  handlerId: 'onboarding-paywall',
});
```

### Integration Examples

#### PostHog Analytics

```typescript
usePaywallEvents({
  onPaywallPresent: (info) => {
    posthog.capture('paywall_viewed', {
      paywall_name: info.name,
      timestamp: info.presentedAt,
    });
  },
  
  onSubscriptionStatusChange: (status) => {
    posthog.identify(userId, {
      subscription_status: status.status,
      subscription_tier: status.tier,
    });
  },
  
  onPaywallDismiss: (info, result) => {
    posthog.capture('paywall_dismissed', {
      paywall_name: info.name,
      result_type: result.type,
    });
  }
});
```

#### Error Monitoring (Sentry)

```typescript
usePaywallEvents({
  onPaywallError: (error) => {
    Sentry.captureException(new Error(error), {
      tags: { component: 'paywall' },
    });
  },
  
  onLog: (params) => {
    if (params.level === 'error') {
      Sentry.addBreadcrumb({
        category: params.scope,
        message: params.message || '',
        level: 'error',
        data: params.info || undefined,
      });
    }
  }
});
```

#### Conversion Funnel Tracking

```typescript
usePaywallEvents({
  willPresentPaywall: (info) => {
    analytics.track('funnel_step_1_paywall_load', { name: info.name });
  },
  
  didPresentPaywall: (info) => {
    analytics.track('funnel_step_2_paywall_view', { name: info.name });
  },
  
  onCustomPaywallAction: (action) => {
    analytics.track('funnel_step_3_cta_click', { action });
  },
  
  onPaywallDismiss: (info, result) => {
    if (result.type === 'purchased') {
      analytics.track('funnel_step_4_purchase', { name: info.name });
    } else {
      analytics.track('funnel_drop_off', { 
        name: info.name, 
        reason: result.type 
      });
    }
  }
});
```

---

## 2. Enhanced Bottom Navigation

### `BottomTabBar` Component

**Purpose**: Bottom navigation with active state indicators and smooth animations.  
**File**: `components/navigation/BottomTabBar.tsx`

#### Quick Start

```typescript
import BottomTabBar from '@/components/navigation/BottomTabBar';

function Layout() {
  return (
    <View style={{ flex: 1 }}>
      {/* Your app content */}
      <BottomTabBar
        activeColor="#3B82F6"
        inactiveColor="#9CA3AF"
        backgroundColor="#FFFFFF"
      />
    </View>
  );
}
```

#### Features

✅ **Active State Indicators**
- Icon scales up to 1.2x
- Brightness increases (opacity 0.6 → 1.0)
- Font weight increases (400 → 600)
- Top bar indicator appears

✅ **Smooth Animations**
- Spring animation for scale (natural bounce)
- Fade animation for opacity
- Automatic transitions on route change

✅ **Badge Support**
- Red notification badges
- Number display (99+ for large counts)
- White border for contrast

✅ **Customizable**
- Active/inactive colors
- Background color
- Tab items and routes

#### Props

```typescript
interface BottomTabBarProps {
  activeColor?: string;      // Default: '#3B82F6'
  inactiveColor?: string;    // Default: '#9CA3AF'
  backgroundColor?: string;  // Default: '#FFFFFF'
}
```

#### Default Tabs

| Tab | Icon | Route | Badge Support |
|-----|------|-------|---------------|
| Home | Home | `/` | ✅ |
| Contacts | Users | `/contacts` | ✅ |
| Compose | Sparkles | `/goal-picker` | ✅ |
| Messages | MessageCircle | `/messages` | ✅ |
| Settings | Settings | `/settings` | ✅ |

#### Customizing Tabs

Edit `components/navigation/BottomTabBar.tsx`:

```typescript
const tabs: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    route: '/',
    badge: 3, // Optional badge count
  },
  // Add more tabs...
];
```

#### Visual Specifications

**Inactive State**:
- Icon: 24px, opacity 0.6
- Label: 11px, weight 400
- Scale: 1.0

**Active State**:
- Icon: 24px, opacity 1.0
- Label: 11px, weight 600
- Scale: 1.2
- Top bar: 24x3px

**Animations**:
- Scale: Spring (tension: 50, friction: 7)
- Opacity: Timing (200ms)

#### Badge Styling

```typescript
// Automatically rendered for badge > 0
badge: {
  position: 'absolute',
  top: -6,
  right: -10,
  backgroundColor: '#EF4444',
  borderRadius: 10,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 4,
  borderWidth: 2,
  borderColor: '#FFFFFF',
}
```

---

## 3. Example Implementation

### Event Tracking Example Page

**File**: `app/event-tracking-example.tsx`

Complete example showing:
- Event tracking setup
- Test event emitters
- Real-time event log
- Integration notes

**Access**: Navigate to `/event-tracking-example`

#### Features

1. **Live Event Log**: See all events as they happen
2. **Test Buttons**: Trigger events manually
3. **Analytics Integration**: Example PostHog/Mixpanel setup
4. **Error Monitoring**: Example Sentry integration

---

## 4. Type Definitions

### PaywallInfo

```typescript
interface PaywallInfo {
  name: string;          // Paywall name
  slug?: string;         // URL-safe identifier
  presentedAt: string;   // ISO timestamp
  url?: string;          // Deep link URL
  handlerId?: string;    // Optional handler ID
}
```

### PaywallResult

```typescript
interface PaywallResult {
  type: 'purchased' | 'closed' | 'error';
  error?: string;
}
```

### SubscriptionStatus

```typescript
interface SubscriptionStatus {
  status: 'UNKNOWN' | 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED';
  tier?: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}
```

### PaywallSkippedReason

```typescript
interface PaywallSkippedReason {
  reason: 'holdout' | 'no_rule_match' | 'event_not_found' | 'user_is_subscribed';
  message?: string;
}
```

### LogParams

```typescript
interface LogParams {
  level: 'debug' | 'info' | 'warn' | 'error';
  scope: 'paywall' | 'subscription' | 'events' | 'network' | 'system';
  message: string | null;
  info?: Record<string, any> | null;
  error?: string | null;
}
```

---

## 5. Best Practices

### Event Tracking

✅ **DO**:
- Track events at app root level
- Send to analytics immediately
- Use handler IDs for specific flows
- Log errors to monitoring service
- Clean up listeners (automatic with hook)

❌ **DON'T**:
- Call event handlers synchronously blocking
- Store sensitive data in event payloads
- Emit events from inside event handlers (loops)
- Forget to handle errors in callbacks

### Navigation

✅ **DO**:
- Use consistent active/inactive colors
- Keep badge counts < 100 (show 99+)
- Test on both iOS and Android
- Ensure touch targets are 44x44pt minimum

❌ **DON'T**:
- Animate too quickly (jarring)
- Use too many tabs (max 5)
- Hide important actions in overflow
- Forget accessibility (testIDs, labels)

---

## 6. Testing

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { usePaywallEvents, emitPaywallPresent } from '@/hooks/usePaywallEvents';

test('calls onPaywallPresent when event emitted', () => {
  const onPaywallPresent = jest.fn();
  renderHook(() => usePaywallEvents({ onPaywallPresent }));
  
  emitPaywallPresent({
    name: 'Test',
    presentedAt: new Date().toISOString(),
  });
  
  expect(onPaywallPresent).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Test' })
  );
});
```

### E2E Tests (Playwright)

```typescript
test('bottom nav highlights active tab', async ({ page }) => {
  await page.goto('/contacts');
  
  const contactsTab = page.getByTestId('tab-contacts');
  await expect(contactsTab).toHaveClass(/active/);
});
```

---

## 7. Performance

### Event System

- ✅ Automatic cleanup on unmount
- ✅ Event filtering by handlerId
- ✅ No memory leaks
- ✅ Minimal re-renders

### Navigation

- ✅ Native animations (60fps)
- ✅ No layout thrashing
- ✅ Efficient route detection
- ✅ Lazy badge rendering

---

## 8. Troubleshooting

### Events Not Firing

**Problem**: Event handler not called  
**Solution**: 
1. Check handlerId matches
2. Verify event name spelling
3. Ensure hook is mounted
4. Check listener cleanup

### Navigation Not Updating

**Problem**: Active state not changing  
**Solution**:
1. Verify route matches tab route
2. Check pathname detection logic
3. Ensure router is configured
4. Test on device (not just simulator)

### Badge Not Showing

**Problem**: Badge count not visible  
**Solution**:
1. Ensure `badge` prop is > 0
2. Check z-index stacking
3. Verify badge styling
4. Test badge position

---

## 9. Migration Guide

### From Old Navigation

```typescript
// Before: Custom tab bar
<View style={styles.tabs}>
  <TouchableOpacity onPress={() => router.push('/')}>
    <Home size={24} />
  </TouchableOpacity>
</View>

// After: Enhanced tab bar
<BottomTabBar />
```

### Adding Event Tracking

```typescript
// 1. Import hook
import { usePaywallEvents } from '@/hooks/usePaywallEvents';

// 2. Add to root component
function App() {
  usePaywallEvents({
    onPaywallPresent: (info) => {
      analytics.track('paywall_view', info);
    }
  });
  
  return <YourApp />;
}

// 3. Emit events when showing paywall
import { emitPaywallPresent } from '@/hooks/usePaywallEvents';

function showPaywall() {
  router.push('/paywall');
  emitPaywallPresent({
    name: 'Premium',
    presentedAt: new Date().toISOString(),
  });
}
```

---

## 10. Files Created

### Core Files (3)

1. **`hooks/usePaywallEvents.ts`** (400 lines)
   - Event tracking hook
   - Event emitters
   - Type definitions

2. **`components/navigation/BottomTabBar.tsx`** (250 lines)
   - Enhanced bottom navigation
   - Active state animations
   - Badge support

3. **`app/event-tracking-example.tsx`** (300 lines)
   - Example implementation
   - Live event log
   - Integration examples

### Documentation (2)

4. **`docs/RECENT_IMPROVEMENTS_SUMMARY.md`** (Updated)
   - Added event tracking section
   - Added navigation section
   - Integration examples

5. **`docs/EVENT_TRACKING_AND_NAVIGATION.md`** (This file)
   - Complete reference guide
   - API documentation
   - Best practices

---

## Summary

✅ **Complete Superwall-equivalent event system**  
✅ **Enhanced bottom navigation with active states**  
✅ **Full TypeScript support**  
✅ **Production-ready**  
✅ **Zero dependencies (uses React Native Animated)**  
✅ **Comprehensive documentation**  

**Total Lines of Code**: ~950 lines  
**Estimated Implementation Time**: 3-4 hours  
**Status**: Ready for integration

---

**Last Updated**: October 18, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete
