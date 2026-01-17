# Frontend-Backend API Communication Guide
**For Subscription & User Management**

## 🔒 CORS Configuration

### ✅ Current CORS Status: **PROPERLY CONFIGURED**

**Allowed Origins:**
- `https://ai-enhanced-personal-crm.rork.app`
- `https://rork.com`
- `https://everreach.app`
- `https://www.everreach.app`
- Environment variable: `CORS_ORIGINS` (comma-separated list)
- Dev mode: `*.exp.direct` (when `ALLOW_EXP_DIRECT=true`)

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:** 
- `Authorization`
- `Content-Type`
- `x-vercel-protection-bypass`

**Features:**
- ✅ Credentials support enabled
- ✅ Origin echoing for proper caching
- ✅ Request ID tracking (`X-Request-ID` header)
- ✅ OPTIONS pre-flight handling

---

## 📊 User & Subscription Data for Frontend

### 1. User Profile Information

**Endpoint:** `GET /api/v1/me`

**Data Returned:**
```typescript
interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  bio?: string; // NEW - Added recently
  created_at: string;
  last_sign_in_at?: string;
  
  // User metadata
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}
```

**Frontend Usage:**
- Display user name and avatar in header
- Show bio in profile section
- User settings/preferences

---

### 2. Subscription & Entitlement Status

**Endpoint:** `GET /api/v1/me/trial-stats`

**Complete Response:**
```typescript
interface TrialStats {
  // Primary entitlement status
  entitled: boolean;
  entitlement_reason: 'active' | 'trial' | 'grace' | 'none';
  subscription_date: string | null;
  
  // Trial information
  trial: {
    origin: 'stripe' | 'app_store' | 'play' | 'manual' | null;
    started_at: string | null;
    ends_at: string | null;
    days_total: number | null;
    days_used: number | null;
    days_left: number | null;
    usage_seconds_total: number;
    usage_seconds_during_trial: number;
  };
  
  // Billing period
  period: {
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    grace_ends_at: string | null;
  };
  
  // Activity tracking
  activity: {
    first_seen_at: string | null;
    last_active_at: string | null;
    sessions_count: number;
  };
  
  // 🆕 CANCELLATION INFO (New!)
  cancel: {
    allowed: boolean;              // Can user cancel?
    method: 'server' | 'store' | null;  // How to cancel
    manage_url: string | null;     // Store URL (iOS/Android)
    provider: 'stripe' | 'app_store' | 'play' | 'manual' | null;
  };
}
```

**Frontend Display Logic:**

```typescript
// Show subscription status
if (stats.entitled) {
  if (stats.entitlement_reason === 'trial') {
    return `Trial: ${stats.trial.days_left} days left`;
  } else if (stats.entitlement_reason === 'active') {
    if (stats.period.cancel_at_period_end) {
      return `Cancels on ${formatDate(stats.period.current_period_end)}`;
    }
    return `Active until ${formatDate(stats.period.current_period_end)}`;
  } else if (stats.entitlement_reason === 'grace') {
    return `Grace period until ${formatDate(stats.period.grace_ends_at)}`;
  }
} else {
  return 'No active subscription';
}

// Show cancel button
if (stats.cancel.allowed) {
  if (stats.cancel.method === 'server') {
    // Show cancel button that calls backend API
    return <CancelButton onClick={() => cancelSubscription()} />;
  } else {
    // Show "Manage Subscription" that opens store
    return <ManageButton href={stats.cancel.manage_url} />;
  }
}
```

---

### 3. Entitlement Status (Simple Check)

**Endpoint:** `GET /api/v1/me/entitlements`

**Response:**
```typescript
interface Entitlements {
  entitled: boolean;
  reason: 'active' | 'trial' | 'grace' | 'none';
  expires_at: string | null;
  source: 'stripe' | 'app_store' | 'play' | 'manual' | null;
}
```

**Frontend Usage:**
- Quick check before showing premium features
- Feature gating
- Paywall display logic

---

### 4. Compose Settings (User Preferences)

**Endpoint:** `GET /api/v1/me/compose-settings`

**Response:**
```typescript
interface ComposeSettings {
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  length: 'short' | 'medium' | 'long';
  include_emoji: boolean;
  signature?: string;
  default_subject_prefix?: string;
  
  // Brand voice
  brand_rules?: {
    do: string[];
    dont: string[];
  };
}
```

**Frontend Usage:**
- AI message composition preferences
- Template generation
- User communication style

---

## 💳 Subscription Management Actions

### 1. Cancel Subscription

**Endpoint:** `POST /api/v1/billing/cancel`

**Request:**
```typescript
interface CancelRequest {
  scope?: 'primary' | 'all';  // Default: 'primary'
  when?: 'period_end' | 'now'; // Default: 'period_end'
  reason?: string;
}
```

**Response (Stripe - Server Cancellation):**
```typescript
{
  success: true,
  cancel_method: 'server',
  subscription_id: 'sub_xxx',
  canceled_at: '2025-11-07T18:00:00Z',
  access_until: '2025-12-07T18:00:00Z',
  message: 'Subscription will cancel at period end'
}
```

**Response (iOS/Android - Store Redirect):**
```typescript
{
  success: true,
  cancel_method: 'store',
  provider: 'app_store' | 'play',
  manage_url: 'https://apps.apple.com/account/subscriptions',
  instructions: 'Please cancel through the App Store. We\'ll update your status automatically.',
  help_url: 'https://support.apple.com/...'
}
```

**Frontend Implementation:**
```typescript
async function cancelSubscription() {
  const response = await fetch('/api/v1/billing/cancel', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      when: 'period_end',
      reason: 'User requested cancellation'
    })
  });
  
  const data = await response.json();
  
  if (data.cancel_method === 'server') {
    // Stripe: Show confirmation
    showMessage(`Subscription canceled. Access until ${data.access_until}`);
    refreshTrialStats();
  } else {
    // Store: Open manage URL
    window.open(data.manage_url, '_blank');
    showMessage(data.instructions);
  }
}
```

---

### 2. Reactivate Canceled Subscription

**Endpoint:** `POST /api/v1/billing/reactivate`

**Request:**
```typescript
{
  subscription_id?: string; // Optional, will use primary if not provided
}
```

**Response:**
```typescript
{
  success: true,
  subscription_id: 'sub_xxx',
  status: 'active',
  current_period_end: '2025-12-07T18:00:00Z'
}
```

**Frontend Display:**
- Show "Reactivate" button when `cancel_at_period_end === true`
- Hide after successful reactivation

---

### 3. Link Mobile Purchase (iOS/Android)

**iOS Endpoint:** `POST /api/v1/link/apple`

**Request:**
```typescript
{
  receipt: string;        // Base64 App Store receipt
  hint_email?: string;    // Optional, for unclaimed entitlements
}
```

**Android Endpoint:** `POST /api/v1/link/google`

**Request:**
```typescript
{
  purchase_token: string;  // Google Play purchase token
  package_name: string;    // e.g., 'com.yourapp.name'
  product_id: string;      // e.g., 'premium_monthly'
  hint_email?: string;     // Optional
}
```

**Response:**
```typescript
{
  success: true,
  subscription_id: 'usr_sub_xxx',
  provider: 'app_store' | 'play',
  expires_at: '2025-12-07T18:00:00Z',
  is_trial: boolean,
  linked_at: '2025-11-07T18:00:00Z'
}
```

**Frontend Implementation (React Native):**
```typescript
// iOS
import * as IAP from 'react-native-iap';

async function linkApplePurchase(purchase) {
  const receipt = purchase.transactionReceipt;
  
  const response = await fetch('/api/v1/link/apple', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ receipt })
  });
  
  const data = await response.json();
  if (data.success) {
    updateEntitlementState(data);
  }
}

// Android
async function linkGooglePurchase(purchase) {
  const response = await fetch('/api/v1/link/google', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      purchase_token: purchase.purchaseToken,
      package_name: 'com.yourapp.name',
      product_id: purchase.productId
    })
  });
  
  const data = await response.json();
  if (data.success) {
    updateEntitlementState(data);
  }
}
```

---

## 🎨 UI/UX Display Patterns

### Subscription Badge Component
```typescript
function SubscriptionBadge({ stats }: { stats: TrialStats }) {
  if (!stats.entitled) {
    return <Badge color="gray">Free</Badge>;
  }
  
  if (stats.entitlement_reason === 'trial') {
    return <Badge color="blue">Trial - {stats.trial.days_left}d left</Badge>;
  }
  
  if (stats.period.cancel_at_period_end) {
    return <Badge color="orange">Canceling Soon</Badge>;
  }
  
  if (stats.entitlement_reason === 'grace') {
    return <Badge color="yellow">Grace Period</Badge>;
  }
  
  return <Badge color="green">Premium</Badge>;
}
```

### Subscription Status Card
```typescript
function SubscriptionStatusCard({ stats }: { stats: TrialStats }) {
  return (
    <Card>
      <CardHeader>
        <h2>Subscription Status</h2>
        <SubscriptionBadge stats={stats} />
      </CardHeader>
      
      <CardContent>
        {/* Status message */}
        {stats.entitled && (
          <p>
            {stats.entitlement_reason === 'trial' 
              ? `Trial ends ${formatDate(stats.trial.ends_at)}`
              : `Renews ${formatDate(stats.period.current_period_end)}`
            }
          </p>
        )}
        
        {/* Warning if canceling */}
        {stats.period.cancel_at_period_end && (
          <Alert variant="warning">
            Your subscription will end on {formatDate(stats.period.current_period_end)}.
            You'll retain access until then.
          </Alert>
        )}
        
        {/* Usage stats for trial */}
        {stats.trial.days_left !== null && (
          <ProgressBar 
            value={stats.trial.days_used} 
            max={stats.trial.days_total}
            label={`${stats.trial.days_used}/${stats.trial.days_total} days used`}
          />
        )}
      </CardContent>
      
      <CardFooter>
        {/* Action buttons */}
        {stats.cancel.allowed && !stats.period.cancel_at_period_end && (
          <Button onClick={handleCancel} variant="outline">
            {stats.cancel.method === 'server' ? 'Cancel Subscription' : 'Manage Subscription'}
          </Button>
        )}
        
        {stats.period.cancel_at_period_end && (
          <Button onClick={handleReactivate} variant="primary">
            Reactivate Subscription
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

### Feature Gate Component
```typescript
function PremiumFeature({ children, fallback }: PropsWithChildren<{ fallback?: ReactNode }>) {
  const { stats, loading } = useTrialStats();
  
  if (loading) return <Skeleton />;
  
  if (!stats?.entitled) {
    return fallback || <PaywallPrompt />;
  }
  
  return <>{children}</>;
}

// Usage
<PremiumFeature fallback={<UpgradeBanner />}>
  <AdvancedAnalytics />
</PremiumFeature>
```

---

## 🔔 Real-Time Updates

### Webhook Events (Backend → Frontend)

The backend sends these webhook events that affect the frontend:

**Subscription Events:**
- `subscription.created` - New subscription started
- `subscription.updated` - Subscription changed (upgrade/downgrade)
- `subscription.canceled` - Subscription canceled
- `subscription.reactivated` - Canceled subscription reactivated
- `subscription.expired` - Subscription ended
- `trial.started` - Trial period started
- `trial.ending_soon` - Trial ending in 3 days
- `trial.ended` - Trial period ended

**Frontend Action:**
```typescript
// Listen for server-sent events (SSE) or polling
async function pollSubscriptionStatus() {
  const stats = await fetchTrialStats();
  updateLocalState(stats);
  
  // Show notification if status changed
  if (stats.period.cancel_at_period_end && !previouslyCanceling) {
    showNotification('Subscription will cancel at period end');
  }
}

// Poll every 60 seconds when app is active
useEffect(() => {
  const interval = setInterval(pollSubscriptionStatus, 60000);
  return () => clearInterval(interval);
}, []);
```

---

## 🔐 Authentication Flow

### User Session Management

**Get Current User:**
```typescript
const user = await supabase.auth.getUser();
const token = user.session?.access_token;
```

**Check Auth Status:**
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    fetchUserProfile();
    fetchTrialStats();
  } else if (event === 'SIGNED_OUT') {
    clearUserData();
  } else if (event === 'TOKEN_REFRESHED') {
    updateToken(session.access_token);
  }
});
```

**Make Authenticated Requests:**
```typescript
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

---

## 📱 Platform-Specific Considerations

### Web App (Stripe)
- Full server-side cancellation
- Immediate feedback
- Payment method updates
- Billing history access

### iOS App (Apple IAP)
- Store-managed subscriptions
- Receipt validation on backend
- Redirect to App Store for management
- Automatic status sync via S2S notifications

### Android App (Google Play)
- Play Billing Library
- Purchase token validation
- Redirect to Play Store for management
- Real-Time Developer Notifications (RTDN) for status sync

### Cross-Platform Sync
- User buys on iOS → Backend updates → Web shows premium
- User cancels on web (Stripe) → No effect on iOS purchase (separate)
- Primary subscription tracked per platform

---

## 🚨 Error Handling

### Common Error Responses

**401 Unauthorized:**
```typescript
{
  error: "Unauthorized",
  request_id: "req_abc123..."
}
```
**Action:** Redirect to login

**404 Not Found:**
```typescript
{
  error: "Subscription not found",
  request_id: "req_abc123..."
}
```
**Action:** Show "No active subscription" state

**409 Conflict:**
```typescript
{
  error: "Subscription already exists",
  request_id: "req_abc123..."
}
```
**Action:** Fetch latest status and update UI

**500 Server Error:**
```typescript
{
  error: "Internal server error",
  request_id: "req_abc123..."
}
```
**Action:** Show error message with request ID for support

---

## 🎯 Best Practices

### 1. Cache Trial Stats
- Cache for 5-10 minutes
- Refresh on user action (cancel, reactivate)
- Refresh when app becomes active

### 2. Optimistic UI Updates
- Show loading state immediately
- Update UI optimistically
- Revert if request fails

### 3. Handle Edge Cases
- Expired tokens → Re-authenticate
- Network errors → Show retry
- Concurrent subscriptions → Show primary only

### 4. Security
- Never expose API keys in frontend
- Always use JWT tokens
- Validate entitlements on backend before granting access
- Don't trust frontend state alone

### 5. UX Considerations
- Show clear cancellation confirmation
- Explain grace period clearly
- Highlight when access ends
- Provide easy reactivation

---

## 📊 Analytics & Tracking

### Events to Track

```typescript
// Track subscription events
analytics.track('subscription_viewed', {
  status: stats.entitlement_reason,
  days_left: stats.trial.days_left,
  provider: stats.trial.origin,
});

analytics.track('subscription_canceled', {
  method: data.cancel_method,
  provider: stats.trial.origin,
  reason: userReason,
  access_until: data.access_until,
});

analytics.track('subscription_reactivated', {
  subscription_id: data.subscription_id,
});

// Track paywall interactions
analytics.track('paywall_shown', {
  feature: 'advanced_analytics',
  entitled: stats.entitled,
});

analytics.track('upgrade_clicked', {
  from_paywall: true,
  feature: 'advanced_analytics',
});
```

---

## 🔗 Quick Reference

### Key Endpoints
- `GET /api/v1/me` - User profile
- `GET /api/v1/me/trial-stats` - Full subscription info
- `GET /api/v1/me/entitlements` - Simple entitlement check
- `POST /api/v1/billing/cancel` - Cancel subscription
- `POST /api/v1/billing/reactivate` - Reactivate subscription
- `POST /api/v1/link/apple` - Link iOS purchase
- `POST /api/v1/link/google` - Link Android purchase

### Response Headers
- `X-Request-ID` - Request tracking ID
- `Access-Control-Allow-Origin` - CORS origin
- `Content-Type` - application/json

### Error Codes
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `409` - Conflict
- `429` - Too many requests
- `500` - Server error

---

**Last Updated:** November 7, 2025  
**Version:** 1.0  
**CORS Status:** ✅ Configured  
**Authentication:** JWT (Supabase)
