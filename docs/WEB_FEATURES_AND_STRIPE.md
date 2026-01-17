# Web Features & Stripe Payments

## Overview

EverReach uses **platform-specific** features and payment providers:

| Platform | Payment Provider | Additional Features |
|----------|------------------|---------------------|
| **Web** | Stripe | Advanced filters, bulk actions, export |
| **iOS** | RevenueCat + Superwall | Native IAP, paywalls |
| **Android** | RevenueCat + Superwall | Native IAP, paywalls |

---

## Environment Configuration

### Required Environment Variables

```env
# Platform Configuration
EXPO_PUBLIC_ENABLE_WEB_FEATURES=true

# Stripe (Web Payments)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat (Mobile Payments)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
REVENUECAT_SECRET_KEY=sk_...

# Superwall (Mobile Paywalls)
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_...
EXPO_PUBLIC_SUPERWALL_ANDROID_KEY=your_android_key
```

---

## Platform Detection

### Using the Platform Utility

```typescript
import { isWeb, isMobile, platformFeatures, paymentProvider } from '@/lib/platform';

// Check platform
if (isWeb) {
  // Web-specific code
  console.log('Running on web');
}

if (isMobile) {
  // Mobile-specific code
  console.log('Running on mobile');
}

// Check which payment provider to use
console.log('Payment provider:', paymentProvider); // 'stripe' or 'revenuecat'

// Check specific features
if (platformFeatures.advancedFilters) {
  // Show advanced filters (web only)
}

if (platformFeatures.stripePayments) {
  // Initialize Stripe
}
```

### Available Platform Checks

```typescript
import {
  isWeb,           // true if running on web
  isMobile,        // true if iOS or Android
  isIOS,           // true if iOS
  isAndroid,       // true if Android
  webFeaturesEnabled, // true if web + env var enabled
  useStripe,       // true if should use Stripe
  useRevenueCat,   // true if should use RevenueCat
} from '@/lib/platform';
```

---

## Payment Integration

### Web: Stripe Integration

#### 1. Install Stripe

```bash
npm install @stripe/stripe-react-native
# or for web specifically
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### 2. Initialize Stripe (Web)

```typescript
// lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js';
import { isWeb } from '@/lib/platform';

let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!isWeb) return null;
  
  if (!stripePromise) {
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};
```

#### 3. Create Payment Intent (Backend)

```typescript
// backend-vercel/app/api/v1/payments/create-intent/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'usd' } = await req.json();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    );
  }
}
```

#### 4. Checkout Component (Web)

```typescript
// app/subscription-plans.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { isWeb, useStripe } from '@/lib/platform';
import { apiFetch } from '@/lib/api';

export default function SubscriptionPlans() {
  const [loading, setLoading] = useState(false);
  
  const handleWebCheckout = async (priceId: string) => {
    if (!isWeb) return;
    
    setLoading(true);
    try {
      // Create checkout session
      const response = await apiFetch('/api/v1/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      });
      
      const { sessionUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMobileCheckout = async (productId: string) => {
    // RevenueCat/Superwall handles this
    // See: providers/SubscriptionProvider.tsx
  };
  
  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          if (useStripe) {
            handleWebCheckout('price_monthly');
          } else {
            handleMobileCheckout('monthly_plan');
          }
        }}
        disabled={loading}
      >
        <Text>Subscribe - $9.99/month</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Mobile: RevenueCat (Already Configured)

Mobile payments are already set up with RevenueCat and Superwall.
See existing files:
- `providers/SubscriptionProvider.tsx`
- `lib/revenuecat.ts`
- `lib/superwall.ts`

---

## Web-Specific Features

### Feature Flags

```typescript
import { platformFeatures } from '@/lib/platform';

// Advanced Filters (Web only)
{platformFeatures.advancedFilters && (
  <AdvancedFiltersPanel />
)}

// Bulk Actions (Web only)
{platformFeatures.bulkActions && (
  <BulkActionsToolbar />
)}

// Export Features (Web only)
{platformFeatures.exportFeatures && (
  <ExportButton format="csv" />
)}

// Desktop Layout (Web only)
{platformFeatures.desktopLayout && (
  <Sidebar />
)}
```

### Example: Advanced Filters Component

```typescript
// components/AdvancedFilters.tsx (Web only)
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { platformFeatures } from '@/lib/platform';

export function AdvancedFilters() {
  if (!platformFeatures.advancedFilters) {
    return null; // Don't render on mobile
  }
  
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        Advanced Filters
      </Text>
      
      {/* Date range picker */}
      <View>
        <Text>Date Range:</Text>
        <TextInput placeholder="Start date" />
        <TextInput placeholder="End date" />
      </View>
      
      {/* Multiple selection filters */}
      <View>
        <Text>Tags (multi-select):</Text>
        {/* Add multi-select component */}
      </View>
      
      {/* Warmth score range */}
      <View>
        <Text>Warmth Score:</Text>
        <TextInput placeholder="Min" />
        <TextInput placeholder="Max" />
      </View>
    </View>
  );
}
```

---

## Vercel Environment Variables

### For Web Deployment

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```env
# Platform
EXPO_PUBLIC_ENABLE_WEB_FEATURES=true

# Stripe (Production)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Don't set these for web (mobile only)
# EXPO_PUBLIC_REVENUECAT_IOS_KEY
# EXPO_PUBLIC_SUPERWALL_IOS_KEY
```

---

## Stripe Webhook Setup

### 1. Create Webhook Endpoint

```typescript
// backend-vercel/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update user subscription status in database
      break;
      
    case 'customer.subscription.updated':
      // Handle subscription changes
      break;
      
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
  }
  
  return NextResponse.json({ received: true });
}
```

### 2. Register Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. URL: `https://www.everreach.app/api/webhooks/stripe`
4. Events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** → Add to `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Testing

### Test Stripe Payments (Web)

```bash
# Use Stripe test card numbers
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

# Test specific scenarios
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Test RevenueCat (Mobile)

Use Sandbox testers in App Store Connect / Google Play Console.
See: `REVENUECAT_TESTING_GUIDE.md`

---

## Migration from RevenueCat to Stripe (Web Only)

If a user signs up on mobile then accesses web:

```typescript
// Sync subscription status across platforms
import { isWeb, isMobile } from '@/lib/platform';

export async function syncSubscriptionStatus(userId: string) {
  // Fetch from your backend which tracks both:
  // - Stripe subscriptions (web)
  // - RevenueCat subscriptions (mobile)
  
  const response = await apiFetch(`/api/v1/users/${userId}/subscription`);
  const { isActive, provider } = await response.json();
  
  return {
    isActive,
    provider, // 'stripe' | 'revenuecat'
    platform: isWeb ? 'web' : 'mobile',
  };
}
```

---

## Summary

### Platform Detection
✅ Use `lib/platform.ts` to detect web vs mobile
✅ Check `platformFeatures` for feature availability

### Payments
✅ **Web**: Stripe checkout + webhooks
✅ **Mobile**: RevenueCat + Superwall (already configured)

### Web Features
✅ Advanced filters
✅ Bulk actions
✅ Data export
✅ Desktop-optimized layout

### Environment Variables
✅ `EXPO_PUBLIC_ENABLE_WEB_FEATURES=true`
✅ `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...`
✅ `STRIPE_SECRET_KEY=sk_...` (backend only)
✅ `STRIPE_WEBHOOK_SECRET=whsec_...` (backend only)

---

## Next Steps

1. **Install Stripe SDK** for web
2. **Create Stripe checkout flow** in subscription-plans screen
3. **Set up webhook handler** for subscription events
4. **Add webhook URL to Stripe Dashboard**
5. **Test with Stripe test cards**
6. **Deploy to Vercel** with production keys
7. **Implement web-specific features** (filters, bulk actions, export)

