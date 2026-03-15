# Analytics & Tracking

## Understand Your Users and Grow

This guide covers setting up analytics to track user behavior and business metrics.

---

## Analytics Stack

| Tool | Purpose | Cost |
|------|---------|------|
| **PostHog** | Product analytics, feature flags | Free tier |
| **Mixpanel** | User behavior, funnels | Free tier |
| **Amplitude** | Product intelligence | Free tier |
| **RevenueCat** | Subscription analytics | Included |
| **Supabase** | Custom queries | Included |

We recommend **PostHog** for its self-hostable option and generous free tier.

---

## PostHog Setup

### Install SDK

```bash
npm install posthog-react-native
```

### Initialize

```typescript
// lib/posthog.ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
  {
    host: 'https://app.posthog.com', // or your self-hosted URL
  }
);

// Identify user on login
export function identifyUser(userId: string, properties?: Record<string, any>) {
  posthog.identify(userId, properties);
}

// Reset on logout
export function resetUser() {
  posthog.reset();
}
```

### Provider Setup

```tsx
// app/_layout.tsx
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '@/lib/posthog';

export default function RootLayout() {
  return (
    <PostHogProvider client={posthog}>
      <AuthProvider>
        {/* ... */}
      </AuthProvider>
    </PostHogProvider>
  );
}
```

---

## Essential Events to Track

### User Lifecycle

```typescript
// Track these events
const USER_EVENTS = {
  // Acquisition
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Activation
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_ITEM_CREATED: 'first_item_created',
  
  // Engagement
  ITEM_CREATED: 'item_created',
  ITEM_VIEWED: 'item_viewed',
  ITEM_UPDATED: 'item_updated',
  ITEM_DELETED: 'item_deleted',
  SEARCH_PERFORMED: 'search_performed',
  
  // Retention
  SESSION_STARTED: 'session_started',
  FEATURE_USED: 'feature_used',
  
  // Revenue
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  PURCHASE_COMPLETED: 'purchase_completed',
};
```

### Implementation

```typescript
// services/analytics.ts
import { posthog } from '@/lib/posthog';

export const Analytics = {
  // Track event with properties
  track(event: string, properties?: Record<string, any>) {
    posthog.capture(event, properties);
  },

  // Screen view
  screen(screenName: string) {
    posthog.screen(screenName);
  },

  // User properties
  setUserProperties(properties: Record<string, any>) {
    posthog.identify(undefined, properties);
  },
};

// Usage
Analytics.track('item_created', {
  item_type: 'task',
  has_description: true,
  source: 'home_screen',
});
```

---

## Screen Tracking

### Automatic Screen Tracking

```tsx
// hooks/useScreenTracking.ts
import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { Analytics } from '@/services/analytics';

export function useScreenTracking() {
  const pathname = usePathname();

  useEffect(() => {
    Analytics.screen(pathname);
  }, [pathname]);
}

// Use in _layout.tsx
export default function RootLayout() {
  useScreenTracking();
  return <Stack />;
}
```

---

## Funnels to Track

### 1. Signup Funnel

```
Landing Page → Sign Up Started → Email Entered → Password Set → Sign Up Completed
     100%           60%              45%             40%              35%
```

### 2. Activation Funnel

```
Sign Up → Onboarding Start → Onboarding Complete → First Item Created
  100%         90%                 70%                    50%
```

### 3. Purchase Funnel

```
Paywall Viewed → Plan Selected → Purchase Started → Purchase Completed
     100%            60%              40%                 30%
```

### Track Funnel Steps

```typescript
// Signup funnel
Analytics.track('signup_started');
Analytics.track('signup_email_entered', { method: 'email' });
Analytics.track('signup_completed', { method: 'email' });

// Activation funnel
Analytics.track('onboarding_started');
Analytics.track('onboarding_step_completed', { step: 1, name: 'welcome' });
Analytics.track('onboarding_completed');
Analytics.track('first_item_created');

// Purchase funnel
Analytics.track('paywall_viewed', { trigger: 'limit_reached' });
Analytics.track('plan_selected', { plan: 'pro', billing: 'yearly' });
Analytics.track('purchase_started', { plan: 'pro', price: 99.99 });
Analytics.track('purchase_completed', { plan: 'pro', revenue: 99.99 });
```

---

## User Properties

### Set on Registration

```typescript
// When user signs up
Analytics.setUserProperties({
  email: user.email,
  created_at: new Date().toISOString(),
  signup_source: 'organic',
  platform: Platform.OS,
  app_version: APP_CONFIG.APP_VERSION,
});
```

### Update on Subscription

```typescript
// When subscription changes
Analytics.setUserProperties({
  subscription_tier: 'pro',
  subscription_status: 'active',
  subscription_started_at: new Date().toISOString(),
  is_paying: true,
});
```

### Track Over Time

```typescript
// Periodically update engagement metrics
Analytics.setUserProperties({
  items_count: items.length,
  last_active_at: new Date().toISOString(),
  sessions_count: sessionsCount,
});
```

---

## Feature Flags (PostHog)

### Use Cases

- **A/B Testing**: Test different UIs
- **Gradual Rollout**: Release features to % of users
- **Kill Switch**: Disable features remotely

### Implementation

```typescript
// Check feature flag
import { useFeatureFlag } from 'posthog-react-native';

function MyComponent() {
  const showNewUI = useFeatureFlag('new-home-screen');

  if (showNewUI) {
    return <NewHomeScreen />;
  }
  return <OldHomeScreen />;
}
```

### Track Variant

```typescript
// Track which variant user saw
Analytics.track('experiment_viewed', {
  experiment: 'new-home-screen',
  variant: showNewUI ? 'new' : 'control',
});
```

---

## Revenue Analytics (RevenueCat)

RevenueCat provides subscription analytics automatically:

- **MRR** (Monthly Recurring Revenue)
- **Churn Rate**
- **Trial Conversion**
- **LTV** (Lifetime Value)
- **Cohort Analysis**

### View in Dashboard

1. Go to [app.revenuecat.com](https://app.revenuecat.com)
2. Select your app
3. View Charts for:
   - Revenue over time
   - Active subscribers
   - Churn analysis
   - Conversion funnels

---

## Custom Dashboards (Supabase)

### Query User Stats

```sql
-- Active users last 7 days
SELECT COUNT(DISTINCT user_id) as active_users
FROM public.items
WHERE updated_at > NOW() - INTERVAL '7 days';

-- Items created per day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as items_created
FROM public.items
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Subscription distribution
SELECT 
  subscription_tier,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM public.users
GROUP BY subscription_tier;
```

### Build Dashboard

Create a simple admin dashboard:

```tsx
// app/admin/dashboard.tsx
export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_dashboard_stats');
      return data;
    },
  });

  return (
    <View>
      <StatCard title="Total Users" value={stats?.total_users} />
      <StatCard title="Active Today" value={stats?.active_today} />
      <StatCard title="Pro Users" value={stats?.pro_users} />
      <StatCard title="MRR" value={`$${stats?.mrr}`} />
    </View>
  );
}
```

---

## Privacy Compliance

### GDPR/CCPA

```typescript
// Allow users to opt out
const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

useEffect(() => {
  if (!analyticsEnabled) {
    posthog.optOut();
  } else {
    posthog.optIn();
  }
}, [analyticsEnabled]);
```

### Privacy Policy Requirements

Include in your privacy policy:
- What data you collect
- How you use it
- Third parties (PostHog, etc.)
- How users can opt out
- Data retention period

---

## Meta Conversions API (Server-Side Events)

For paid acquisition campaigns, Meta's **Conversions API (CAPI)** sends events server-side for better attribution than client-side pixels alone.

### Setup

1. Create a Meta Pixel in [Events Manager](https://business.facebook.com/events_manager)
2. Generate a Conversions API access token (Events Manager → Pixel Settings → Set up manually)
3. Add env vars:
   ```
   EXPO_PUBLIC_META_PIXEL_ID=your_pixel_id
   EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=your_token
   ```

### Standard Events to Send

| Meta Event | App Trigger | When |
|-----------|------------|------|
| CompleteRegistration | User signs up | After auth |
| StartTrial | Trial begins | After RC purchase |
| Subscribe | Subscription starts | After RC purchase |
| Purchase | Any purchase | After RC purchase |
| ViewContent | Screen viewed | On navigation |
| Lead | Lead captured | Contact created |
| Contact | Message sent | After send |
| Search | Search performed | On search |

### Implementation Pattern

```typescript
// lib/metaAppEvents.ts — key structure
const PIXEL_ID = process.env.EXPO_PUBLIC_META_PIXEL_ID;
const TOKEN = process.env.EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN;

// Queue events in batches, flush every 10 seconds
// Send to: https://graph.facebook.com/v21.0/{PIXEL_ID}/events
// Include user_data: hashed email, phone, name, fbp, fbc, client_ip
// Respect iOS ATT: only include user_data when tracking consent granted
// Log all events to Supabase `meta_conversion_event` table for auditing
```

### Event Match Quality

For high EMQ scores, persist and send these user parameters (all SHA-256 hashed):
- **em** (email), **ph** (phone), **fn** (first name), **ln** (last name)
- **ct** (city), **st** (state), **zp** (zip), **country**
- **fbp** (browser ID — generate and persist in AsyncStorage)
- **fbc** (click ID — from Facebook ad deep links, 7-day TTL)
- **client_ip_address** (fetch from external service, cache)

### iOS App Tracking Transparency

```typescript
// Request ATT before sending user_data
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
const { granted } = await requestTrackingPermissionsAsync();
setTrackingConsent(granted);
// Events still queue without consent, but user_data fields are omitted
```

> **Note:** Add `NSUserTrackingUsageDescription` to Info.plist and declare tracking data types in App Store Connect App Privacy.

See `ios-app/lib/metaAppEvents.ts` for the full production implementation.

---

## Checklist

- [ ] Set up PostHog (or alternative)
- [ ] Implement user identification
- [ ] Track core events (signup, item CRUD, purchase)
- [ ] Set up funnel tracking
- [ ] Configure user properties
- [ ] Set up feature flags (optional)
- [ ] Create admin dashboard (optional)
- [ ] Set up Meta Conversions API (for paid acquisition)
- [ ] Update privacy policy
- [ ] Add opt-out option
- [ ] Declare tracking data types in App Store Connect

---

## Next Steps

- [Security →](10-SECURITY.md)
- [Testing →](11-TESTING.md)
