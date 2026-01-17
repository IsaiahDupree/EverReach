# Onboarding Status Endpoint

**GET /v1/me/onboarding-status** - Single source of truth for routing users to the correct app experience.

---

## 📋 Overview

This endpoint determines which flow the frontend should show based on:
1. **Initial onboarding completion** - Has user completed the 20-question onboarding?
2. **Subscription status** - Active, trial, expired, canceled, etc.
3. **Trial expiry** - Has the free trial period ended?
4. **Payment issues** - Past due, unpaid, etc.

**Use this endpoint on app launch to route users correctly.**

---

## 🎯 Use Cases

### 1. **New User (Not Onboarded)**
User just signed up, hasn't completed onboarding.

**Response:**
```json
{
  "completed_initial_onboarding": false,
  "recommended_flow": "initial_onboarding"
}
```

**Action:** Show 20-question onboarding flow.

---

### 2. **Trial User (Active)**
User completed onboarding, currently on free trial.

**Response:**
```json
{
  "completed_initial_onboarding": true,
  "has_active_subscription": true,
  "is_trial": true,
  "trial_ended": false,
  "subscription_status": "trialing",
  "recommended_flow": "normal_app"
}
```

**Action:** Show normal app with trial banner.

---

### 3. **Trial Ended (Need Upgrade)**
Trial expired, user needs to subscribe.

**Response:**
```json
{
  "completed_initial_onboarding": true,
  "has_active_subscription": false,
  "trial_ended": true,
  "needs_upgrade_flow": true,
  "should_show_paywall": true,
  "paywall_reason": "trial_ended",
  "recommended_flow": "upgrade_paywall"
}
```

**Action:** Show paywall with "Your trial has ended" messaging.

---

### 4. **Subscription Canceled**
User canceled their subscription.

**Response:**
```json
{
  "completed_initial_onboarding": true,
  "has_active_subscription": false,
  "subscription_status": "canceled",
  "needs_upgrade_flow": true,
  "should_show_paywall": true,
  "paywall_reason": "subscription_canceled",
  "recommended_flow": "upgrade_paywall"
}
```

**Action:** Show paywall with "Resubscribe to continue" messaging.

---

### 5. **Payment Failed**
Subscription past due.

**Response:**
```json
{
  "completed_initial_onboarding": true,
  "subscription_status": "past_due",
  "needs_upgrade_flow": true,
  "should_show_paywall": true,
  "paywall_reason": "payment_failed",
  "recommended_flow": "upgrade_paywall"
}
```

**Action:** Show "Update payment method" flow.

---

### 6. **Active Subscriber**
User has active paid subscription.

**Response:**
```json
{
  "completed_initial_onboarding": true,
  "has_active_subscription": true,
  "is_trial": false,
  "subscription_status": "active",
  "needs_upgrade_flow": false,
  "should_show_paywall": false,
  "recommended_flow": "normal_app"
}
```

**Action:** Show normal app.

---

## 📡 API Reference

### **Request**

```http
GET /api/v1/me/onboarding-status
Authorization: Bearer YOUR_TOKEN
```

### **Response**

```typescript
{
  // Onboarding status
  completed_initial_onboarding: boolean;
  onboarding_completed_at: string | null;

  // Subscription status
  subscription_status: string | null; // 'active', 'trialing', 'canceled', 'past_due', 'unpaid'
  has_active_subscription: boolean;
  is_trial: boolean;
  trial_ended: boolean;
  subscription_expired: boolean;
  current_period_end: string | null; // ISO 8601 timestamp

  // Flow routing (key fields)
  needs_upgrade_flow: boolean;
  should_show_paywall: boolean;
  paywall_reason: string | null; // 'trial_ended', 'subscription_canceled', 'payment_failed', 'no_subscription'

  // Platform info
  payment_platform: string | null; // 'stripe', 'app_store', 'play_store'

  // Frontend routing helper
  recommended_flow: 'initial_onboarding' | 'upgrade_paywall' | 'normal_app';
}
```

---

## 💻 Frontend Integration

### **React Native (On App Launch)**

```typescript
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

function useOnboardingRouter() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const response = await fetch(`${API_BASE}/api/v1/me/onboarding-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const status = await response.json();

        // Route based on recommended flow
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
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // Fallback: show onboarding
        navigation.replace('OnboardingFlow');
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboardingStatus();
  }, []);

  return { isLoading };
}
```

### **Usage in App.tsx**

```typescript
function App() {
  const { isLoading } = useOnboardingRouter();

  if (isLoading) {
    return <SplashScreen />;
  }

  return <Navigation />;
}
```

---

## 🎨 Paywall Messaging by Reason

### **trial_ended**
```
"Your free trial has ended"
"Subscribe to continue using EverReach"
[Subscribe Button]
```

### **subscription_canceled**
```
"Welcome back!"
"Reactivate your subscription to continue"
[Resubscribe Button]
```

### **payment_failed**
```
"Payment issue"
"Please update your payment method"
[Update Payment Button]
```

### **no_subscription**
```
"Unlock full access"
"Subscribe to continue using all features"
[Subscribe Button]
```

---

## 🔄 Polling Strategy

### **On App Launch**
Call once to determine initial flow.

### **After Subscription Purchase**
Call again to update UI immediately:

```typescript
async function handleSubscriptionPurchase() {
  // 1. Process purchase with RevenueCat/Stripe
  await processPurchase();

  // 2. Check new onboarding status
  const status = await fetch('/api/v1/me/onboarding-status');
  const data = await status.json();

  // 3. Route to normal app if subscribed
  if (data.recommended_flow === 'normal_app') {
    navigation.replace('MainApp');
  }
}
```

### **Periodic Background Check** (Optional)
Check every 15 minutes when app is active:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await fetch('/api/v1/me/onboarding-status');
    const data = await status.json();

    // If suddenly needs paywall, navigate to it
    if (data.should_show_paywall) {
      navigation.replace('PaywallFlow', {
        reason: data.paywall_reason,
      });
    }
  }, 15 * 60 * 1000); // 15 minutes

  return () => clearInterval(interval);
}, []);
```

---

## 🧪 Testing

### **Test New User Flow**

```bash
# Simulate new user (no onboarding yet)
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer NEW_USER_TOKEN"

# Expected:
# {
#   "completed_initial_onboarding": false,
#   "recommended_flow": "initial_onboarding"
# }
```

### **Test Trial Ended Flow**

```bash
# User with expired trial
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer TRIAL_ENDED_USER_TOKEN"

# Expected:
# {
#   "trial_ended": true,
#   "needs_upgrade_flow": true,
#   "should_show_paywall": true,
#   "paywall_reason": "trial_ended",
#   "recommended_flow": "upgrade_paywall"
# }
```

### **Test Active Subscriber Flow**

```bash
# User with active subscription
curl "https://ever-reach-be.vercel.app/api/v1/me/onboarding-status" \
  -H "Authorization: Bearer SUBSCRIBED_USER_TOKEN"

# Expected:
# {
#   "has_active_subscription": true,
#   "needs_upgrade_flow": false,
#   "recommended_flow": "normal_app"
# }
```

---

## 🚨 Error Handling

### **Network Error**
Fallback to initial onboarding flow:

```typescript
try {
  const status = await fetchOnboardingStatus();
  routeUser(status);
} catch (error) {
  // Safest fallback: show onboarding
  navigation.replace('OnboardingFlow');
}
```

### **Server Error**
Endpoint returns safe defaults:

```json
{
  "completed_initial_onboarding": false,
  "recommended_flow": "initial_onboarding",
  "needs_upgrade_flow": false,
  "should_show_paywall": false
}
```

---

## 📊 Analytics Tracking

Track which flow users are routed to:

```typescript
const status = await fetchOnboardingStatus();

// Track in analytics
analytics.track('onboarding_status_checked', {
  completed_initial_onboarding: status.completed_initial_onboarding,
  recommended_flow: status.recommended_flow,
  subscription_status: status.subscription_status,
  paywall_reason: status.paywall_reason,
});

// Route user
routeUser(status);
```

---

## 🔗 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/v1/me/onboarding-status` | **Main routing endpoint** (use this) |
| `/v1/me/entitlements` | Detailed feature access and limits |
| `/v1/me/trial-stats` | Trial usage statistics |
| `/v1/me` | Full user profile |
| `/v1/onboarding/answers` | Submit onboarding responses |

---

## ✅ Best Practices

1. **Call on every app launch** - Subscription status can change
2. **Cache for 5-10 minutes** - Reduce redundant requests
3. **Handle all flows** - Initial onboarding, paywall, normal app
4. **Show loading state** - Don't flash wrong screen
5. **Track analytics** - Monitor which flows users hit
6. **Graceful fallback** - Default to onboarding on errors
7. **Update after purchase** - Re-fetch status immediately after subscription

---

## 🎯 Decision Tree

```
User launches app
       ↓
Call /v1/me/onboarding-status
       ↓
Check recommended_flow
       ↓
    ┌──────────────────┬──────────────────┐
    ↓                  ↓                  ↓
initial_onboarding  upgrade_paywall   normal_app
    ↓                  ↓                  ↓
Show 20-Q flow     Show paywall      Show main app
                   (with reason)
```

---

**Base URL:** `https://ever-reach-be.vercel.app`  
**Requires authentication:** Yes  
**Rate limited:** 60 requests/minute  
**Response time:** < 200ms

---

**Created:** November 1, 2025  
**Version:** 1.0  
**Status:** Production Ready
