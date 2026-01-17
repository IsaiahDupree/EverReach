# Subscription Testing & Flow Guide

Complete guide for managing subscription states, trial periods, and the "second onboarding" (paywall) flow across platforms.

---

## 📋 Overview

This system handles:
1. **Cross-platform subscription tracking** - Apple, Google, Stripe
2. **Trial management** - Days left tracking, expiry handling
3. **Second onboarding (paywall)** - Automatic routing when trial ends
4. **Testing/QA** - Admin endpoints to simulate subscription states
5. **Feature gating** - Block features based on subscription status

---

## 🎯 User Flows

### **Flow 1: New User → Trial → Paywall → Subscribed**

```
User signs up
     ↓
Free trial starts (14 days)
     ↓
/v1/me/onboarding-status returns:
  - trial.active = true
  - trial.daysLeft = 14
     ↓
User sees trial badge: "14 days left"
     ↓
Days pass... trial.daysLeft decreases
     ↓
Trial expires (day 15)
     ↓
/v1/me/onboarding-status returns:
  - needs_upgrade_flow = true
  - should_show_paywall = true
  - paywall_reason = "trial_ended"
     ↓
Frontend shows "Second Onboarding" (Paywall)
     ↓
User subscribes via Apple/Google/Stripe
     ↓
Webhook updates subscription status
     ↓
/v1/me/onboarding-status returns:
  - has_active_subscription = true
  - recommended_flow = "normal_app"
     ↓
Full app access restored
```

### **Flow 2: Subscription Canceled → Paywall**

```
User cancels subscription
     ↓
Webhook updates status to "canceled"
     ↓
If still within billing period:
  - has_active_subscription = true
  - User can use app until period_end
     ↓
After period_end:
  - has_active_subscription = false
  - needs_upgrade_flow = true
  - paywall_reason = "subscription_canceled"
     ↓
Paywall shown on app launch
```

### **Flow 3: Payment Failed → Billing Issue**

```
Payment fails (card declined)
     ↓
Webhook updates status to "past_due"
     ↓
/v1/me/onboarding-status returns:
  - subscription_status = "past_due"
  - needs_upgrade_flow = true
  - paywall_reason = "payment_failed"
     ↓
Paywall shown with "Update payment method"
```

---

## 🔌 API Endpoints

### **1. GET /v1/me/onboarding-status** (Main Status Endpoint)

Single source of truth for routing users.

**Request:**
```http
GET /api/v1/me/onboarding-status
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```typescript
{
  // Onboarding
  completed_initial_onboarding: boolean;
  onboarding_completed_at: string | null;

  // Subscription
  subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid' | null;
  has_active_subscription: boolean;
  is_trial: boolean;
  trial_ended: boolean;
  subscription_expired: boolean;
  current_period_end: string | null;

  // Flow routing (KEY FIELDS!)
  needs_upgrade_flow: boolean;      // Show paywall?
  should_show_paywall: boolean;     // Show paywall?
  paywall_reason: string | null;    // Why?

  // Platform
  payment_platform: 'app_store' | 'play_store' | 'stripe' | null;

  // Frontend helper
  recommended_flow: 'initial_onboarding' | 'upgrade_paywall' | 'normal_app';
}
```

**Trial Days Calculation:**
```typescript
// Add this field to the response
trial: {
  active: boolean;
  daysLeft: number;
  endsAt: string | null;
}
```

### **2. POST /v1/testing/subscription/set** (ADMIN - Test Subscription State)

Simulate subscription states without touching payment providers.

**Request:**
```http
POST /api/v1/testing/subscription/set
x-admin-token: YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "userId": "abc123",
  "subscriptionStatus": "trialing",      // or "active", "canceled", "past_due", "unpaid"
  "trialEndAt": "2025-11-15T00:00:00Z",  // optional
  "currentPeriodEnd": "2025-12-01T00:00:00Z",  // optional
  "billingSource": "app_store"           // or "play_store", "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test subscription state set",
  "userId": "abc123",
  "appliedState": {
    "subscriptionStatus": "trialing",
    "trialEndAt": "2025-11-15T00:00:00Z",
    "currentPeriodEnd": "2025-12-01T00:00:00Z",
    "billingSource": "app_store"
  }
}
```

### **3. POST /v1/testing/subscription/reset** (ADMIN - Reset to Default)

Reset user to default trial state.

**Request:**
```http
POST /api/v1/testing/subscription/reset
x-admin-token: YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "userId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription reset to default trial state",
  "userId": "abc123",
  "resetState": {
    "subscriptionStatus": "trialing",
    "trialDays": 14
  }
}
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Test Trial Expiry**

```bash
# 1. Set user to trial ending tomorrow
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/set" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subscriptionStatus": "trialing",
    "currentPeriodEnd": "'$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# 2. Check status (should show 1 day left)
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer USER_TOKEN"

# 3. Set trial to expired
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/set" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subscriptionStatus": "trialing",
    "currentPeriodEnd": "'$(date -u -d '-1 day' +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# 4. Check status (should trigger paywall)
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: needs_upgrade_flow = true, paywall_reason = "trial_ended"
```

### **Scenario 2: Test Subscription Canceled**

```bash
# Set user to canceled subscription
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/set" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subscriptionStatus": "canceled",
    "currentPeriodEnd": "'$(date -u -d '-1 day' +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check status
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: paywall_reason = "subscription_canceled"
```

### **Scenario 3: Test Payment Failed**

```bash
# Set user to past_due (payment failed)
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/set" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subscriptionStatus": "past_due"
  }'

# Check status
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: paywall_reason = "payment_failed"
```

### **Scenario 4: Test Active Subscription**

```bash
# Set user to active paid subscription
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/set" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subscriptionStatus": "active",
    "currentPeriodEnd": "'$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)'",
    "billingSource": "app_store"
  }'

# Check status
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: has_active_subscription = true, recommended_flow = "normal_app"
```

### **Scenario 5: Reset After Testing**

```bash
# Reset user to default trial state
curl -X POST "https://ever-reach-be.vercel.app/api/v1/testing/subscription/reset" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID"}'
```

---

## 💻 Frontend Integration

### **React Native: App Router with Feature Gating**

```typescript
// hooks/useSubscriptionStatus.ts
import { useEffect, useState } from 'react';

export type SubStatus = {
  completed_initial_onboarding: boolean;
  has_active_subscription: boolean;
  is_trial: boolean;
  trial_ended: boolean;
  needs_upgrade_flow: boolean;
  should_show_paywall: boolean;
  paywall_reason: string | null;
  recommended_flow: 'initial_onboarding' | 'upgrade_paywall' | 'normal_app';
  current_period_end: string | null;
  payment_platform: string | null;
};

export function useSubscriptionStatus() {
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/me/onboarding-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (mounted) setStatus(data);
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStatus();
    return () => { mounted = false; };
  }, []);

  return { status, loading };
}
```

### **App Router (On Launch)**

```typescript
// App.tsx
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStatus } from './hooks/useSubscriptionStatus';

function AppRouter() {
  const navigation = useNavigation();
  const { status, loading } = useSubscriptionStatus();

  useEffect(() => {
    if (!loading && status) {
      // Route based on recommended_flow
      switch (status.recommended_flow) {
        case 'initial_onboarding':
          navigation.replace('OnboardingFlow');
          break;

        case 'upgrade_paywall':
          navigation.replace('PaywallFlow', {
            reason: status.paywall_reason,
          });
          break;

        case 'normal_app':
          navigation.replace('MainApp');
          break;
      }
    }
  }, [loading, status]);

  if (loading) {
    return <SplashScreen />;
  }

  return null;
}
```

### **Trial Days Badge**

```typescript
// components/TrialBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export function TrialBadge() {
  const { status } = useSubscriptionStatus();

  if (!status || !status.is_trial || !status.current_period_end) {
    return null;
  }

  // Calculate days left
  const now = new Date();
  const periodEnd = new Date(status.current_period_end);
  const daysLeft = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <View style={{ padding: 12, backgroundColor: '#FFF3CD', borderRadius: 8 }}>
      <Text style={{ fontWeight: 'bold' }}>
        Trial: {daysLeft} day{daysLeft === 1 ? '' : 's'} left
      </Text>
      <Text style={{ fontSize: 12 }}>
        Upgrade to keep all your features
      </Text>
    </View>
  );
}
```

### **Feature Gate Component**

```typescript
// components/FeatureGate.tsx
import React, { PropsWithChildren } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export function FeatureGate({ children, feature }: PropsWithChildren<{ feature: string }>) {
  const navigation = useNavigation();
  const { status } = useSubscriptionStatus();

  if (!status || !status.has_active_subscription) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
          {feature} is a premium feature
        </Text>
        <Text style={{ marginBottom: 16, textAlign: 'center' }}>
          Upgrade to unlock {feature} and all other premium features
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('PaywallFlow')}
          style={{ backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

// Usage:
<FeatureGate feature="AI Message Composer">
  <MessageComposer />
</FeatureGate>
```

### **Paywall Messaging by Reason**

```typescript
// screens/PaywallFlow.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react';

export function PaywallFlow({ route }) {
  const { reason } = route.params || {};

  const messages = {
    trial_ended: {
      title: 'Your free trial has ended',
      subtitle: 'Subscribe to continue using EverReach',
      cta: 'Subscribe Now',
    },
    subscription_canceled: {
      title: 'Welcome back!',
      subtitle: 'Reactivate your subscription to continue',
      cta: 'Resubscribe',
    },
    payment_failed: {
      title: 'Payment issue',
      subtitle: 'Please update your payment method',
      cta: 'Update Payment',
    },
    no_subscription: {
      title: 'Unlock full access',
      subtitle: 'Subscribe to continue using all features',
      cta: 'Subscribe',
    },
  };

  const message = messages[reason] || messages.no_subscription;

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
        {message.title}
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 32 }}>
        {message.subtitle}
      </Text>
      
      {/* Subscription options UI */}
      
      <TouchableOpacity
        onPress={handleSubscribe}
        style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
          {message.cta}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🔄 Cross-Platform Subscription Preservation

### **How It Works**

1. **User subscribes via Apple App Store**
   - RevenueCat processes the purchase
   - Webhook updates `profiles.subscription_status = 'active'`
   - Sets `payment_platform = 'app_store'`

2. **User logs in on web/Android**
   - `/v1/me/onboarding-status` returns `payment_platform = 'app_store'`
   - User sees: "Subscription active via Apple App Store"
   - "Manage Billing" button opens Apple subscriptions page

3. **Platform-Specific Billing Management**

```typescript
// components/ManageBillingButton.tsx
import { TouchableOpacity, Linking } from 'react-native';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export function ManageBillingButton() {
  const { status } = useSubscriptionStatus();

  const openManageBilling = () => {
    switch (status?.payment_platform) {
      case 'app_store':
        Linking.openURL('https://apps.apple.com/account/subscriptions');
        break;
      case 'play_store':
        Linking.openURL('https://play.google.com/store/account/subscriptions');
        break;
      case 'stripe':
        Linking.openURL('https://everreach.app/billing');
        break;
      default:
        Linking.openURL('https://everreach.app/account');
    }
  };

  return (
    <TouchableOpacity onPress={openManageBilling}>
      <Text>Manage Billing via {status?.payment_platform?.replace('_', ' ')}</Text>
    </TouchableOpacity>
  );
}
```

---

## 📊 Analytics Events

Track key subscription events:

```typescript
// Track subscription status changes
analytics.track('subscription_status_checked', {
  subscription_status: status.subscription_status,
  has_active_subscription: status.has_active_subscription,
  is_trial: status.is_trial,
  paywall_reason: status.paywall_reason,
  recommended_flow: status.recommended_flow,
});

// Track trial progress
if (status.is_trial && daysLeft !== null) {
  analytics.track('trial_day_remaining', {
    days_left: daysLeft,
    trial_end: status.current_period_end,
  });
}

// Track paywall shown
if (status.should_show_paywall) {
  analytics.track('paywall_shown', {
    reason: status.paywall_reason,
    location: 'app_launch',
  });
}

// Track subscription purchase
analytics.track('subscription_purchased', {
  platform: 'app_store', // or 'play_store', 'stripe'
  product_id: 'pro_monthly',
  previous_status: 'trialing',
});
```

---

## 🚨 Important Notes

### **1. Admin Token Security**

The `ADMIN_TEST_TOKEN` environment variable should:
- Be a strong random string (32+ characters)
- Only be known to developers/QA
- Never be committed to version control
- Be rotated periodically

```bash
# Generate secure token
openssl rand -hex 32
```

### **2. Production vs Testing**

- **Production**: Subscription status driven by real webhooks (RevenueCat/Stripe)
- **Testing**: Use admin endpoints to override states temporarily
- **QA Process**: Always reset to default after testing

### **3. Webhook Integration**

The system expects webhooks from:
- **RevenueCat** → `/api/billing/revenuecat/webhook`
- **Stripe** → `/api/webhooks/stripe`

These webhooks update the `profiles` table with subscription status.

### **4. Trial Period**

Default trial period: **14 days**

Configure in:
- RevenueCat products (iOS/Android)
- Stripe prices (web)

---

## 🔗 Related Documentation

- [Onboarding Status Endpoint](./ONBOARDING_STATUS_ENDPOINT.md)
- [Profile Pictures Guide](./PROFILE_PICTURES_GUIDE.md)
- [RevenueCat Integration](./REVENUECAT_INTEGRATION.md)
- [Stripe Integration](./STRIPE_INTEGRATION.md)

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Test trial start (14-day countdown)
- [ ] Test trial expiry (paywall shown)
- [ ] Test subscription purchase (full access restored)
- [ ] Test subscription cancel (access until period end)
- [ ] Test payment failure (billing issue flow)
- [ ] Test cross-platform login (Apple sub shown on web)
- [ ] Test "Manage Billing" links (correct platform URL)
- [ ] Test admin reset (clean state restored)
- [ ] Test analytics events (all tracked correctly)
- [ ] Test feature gating (premium features blocked)

---

**Base URL:** `https://ever-reach-be.vercel.app`  
**Admin endpoints require:** `x-admin-token` header  
**User endpoints require:** `Authorization: Bearer` token

---

**Created:** November 1, 2025  
**Version:** 1.0  
**Status:** Production Ready
