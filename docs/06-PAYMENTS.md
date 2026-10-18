# Payments & Subscriptions Guide

## Stripe + RevenueCat Complete Setup

This guide covers implementing payments for web (Stripe) and mobile (RevenueCat) with a unified subscription system.

---

## Payment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
│                                                              │
│  ┌─────────────┐                      ┌─────────────┐       │
│  │   Web App   │                      │ Mobile App  │       │
│  │             │                      │             │       │
│  │  Stripe     │                      │ RevenueCat  │       │
│  │  Checkout   │                      │  Paywall    │       │
│  └──────┬──────┘                      └──────┬──────┘       │
│         │                                    │               │
│         ▼                                    ▼               │
│  ┌─────────────┐                      ┌─────────────┐       │
│  │   Stripe    │                      │Apple/Google │       │
│  │   Server    │                      │   Stores    │       │
│  └──────┬──────┘                      └──────┬──────┘       │
│         │                                    │               │
│         │ Webhook                            │ Webhook       │
│         ▼                                    ▼               │
│  ┌───────────────────────────────────────────────────┐      │
│  │              Your Backend API                      │      │
│  │         /api/webhooks/stripe                       │      │
│  │         /api/webhooks/revenuecat                   │      │
│  └───────────────────────────────────────────────────┘      │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────┐      │
│  │              Supabase Database                     │      │
│  │           subscriptions table                      │      │
│  │    (unified subscription state)                    │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Subscription Tiers

### Define Your Tiers

```typescript
// constants/subscriptions.ts
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '10 contacts',
      'Basic messaging',
      'Email support'
    ],
    limits: {
      contacts: 10,
      messages_per_month: 50
    }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    features: [
      'Unlimited contacts',
      'Voice notes',
      'Priority support',
      'Analytics dashboard'
    ],
    limits: {
      contacts: -1, // unlimited
      messages_per_month: -1
    }
  },
  business: {
    name: 'Business',
    price: 29.99,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'API access',
      'Dedicated support'
    ],
    limits: {
      contacts: -1,
      messages_per_month: -1,
      team_members: 10
    }
  }
};
```

---

## Part 2: Stripe Setup (Web)

### 2.1 Create Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Create products matching your tiers:

```
Product: EverReach Pro
├── Price: $9.99/month (price_xxx)
└── Price: $99/year (price_yyy)

Product: EverReach Business  
├── Price: $29.99/month (price_zzz)
└── Price: $299/year (price_aaa)
```

### 2.2 Stripe Checkout Integration

```typescript
// services/stripe.ts
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export async function createCheckoutSession(priceId: string, userId: string) {
  const response = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId })
  });
  
  const { sessionId } = await response.json();
  
  const stripe = await stripePromise;
  await stripe?.redirectToCheckout({ sessionId });
}
```

### 2.3 Backend Checkout Endpoint

```typescript
// api/payments/create-checkout/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { priceId, userId } = await request.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    client_reference_id: userId,
    metadata: { userId }
  });

  return Response.json({ sessionId: session.id });
}
```

### 2.4 Stripe Webhook Handler

```typescript
// api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook Error', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancel(subscription);
      break;
    }
  }

  return new Response('OK');
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription as string;
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  
  // Determine tier from price ID
  const tier = priceId.includes('pro') ? 'pro' : 'business';
  
  // Update database
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    tier,
    status: 'active',
    provider: 'stripe',
    provider_subscription_id: subscriptionId,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000)
  });
}
```

---

## Part 3: RevenueCat Setup (Mobile)

### 3.1 RevenueCat Dashboard Setup

1. Create account at [revenuecat.com](https://revenuecat.com)
2. Create new project
3. Add iOS app:
   - Bundle ID: `com.yourcompany.everreach`
   - App Store Connect API Key (follow their guide)
4. Add Android app:
   - Package name: `com.yourcompany.everreach`
   - Google Play credentials

### 3.2 Create Products in App Stores

**App Store Connect:**
1. My Apps → Your App → In-App Purchases
2. Create Subscription Group: "EverReach Premium"
3. Add subscriptions:
   - `everreach_pro_monthly` - $9.99/month
   - `everreach_pro_yearly` - $99.99/year

**Google Play Console:**
1. Monetize → Products → Subscriptions
2. Create subscriptions matching iOS

### 3.3 Configure RevenueCat Products

1. Products → New Product
2. Map to store products
3. Create Entitlements:
   - `pro_access` → includes pro products
4. Create Offerings:
   - `default` → includes pro packages

### 3.4 Mobile Integration

```typescript
// services/revenuecat.ts
import Purchases, { PurchasesPackage } from 'react-native-purchases';

export async function initializePurchases(userId: string) {
  await Purchases.configure({
    apiKey: Platform.OS === 'ios' 
      ? process.env.REVENUECAT_API_KEY_IOS!
      : process.env.REVENUECAT_API_KEY_ANDROID!
  });
  
  await Purchases.logIn(userId);
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      success: true,
      isPro: customerInfo.entitlements.active['pro_access'] !== undefined
    };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw error;
  }
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active['pro_access'] !== undefined;
}

export async function getSubscriptionStatus() {
  const customerInfo = await Purchases.getCustomerInfo();
  return {
    isPro: customerInfo.entitlements.active['pro_access'] !== undefined,
    expirationDate: customerInfo.entitlements.active['pro_access']?.expirationDate
  };
}
```

### 3.5 Paywall Component

```tsx
// components/Paywall.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getOfferings, purchasePackage } from '@/services/revenuecat';

export function Paywall({ onPurchaseComplete }: { onPurchaseComplete: () => void }) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    const offering = await getOfferings();
    if (offering) {
      setPackages(offering.availablePackages);
    }
  }

  async function handlePurchase(pkg: PurchasesPackage) {
    setLoading(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        onPurchaseComplete();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="p-6">
      <Text className="text-2xl font-bold text-center mb-6">
        Upgrade to Pro
      </Text>
      
      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          onPress={() => handlePurchase(pkg)}
          disabled={loading}
          className="bg-blue-500 p-4 rounded-lg mb-4"
        >
          <Text className="text-white text-center font-semibold">
            {pkg.product.title} - {pkg.product.priceString}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### 3.6 RevenueCat Webhook Handler

```typescript
// api/webhooks/revenuecat/route.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Verify webhook auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await request.json();
  const { app_user_id, type, product_id, expiration_at_ms } = event;

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await supabase.from('subscriptions').upsert({
        user_id: app_user_id,
        tier: 'pro',
        status: 'active',
        provider: 'revenuecat',
        provider_subscription_id: product_id,
        current_period_end: new Date(expiration_at_ms)
      });
      break;
      
    case 'CANCELLATION':
    case 'EXPIRATION':
      await supabase.from('subscriptions').update({
        status: 'expired',
        tier: 'free'
      }).eq('user_id', app_user_id);
      break;
  }

  return new Response('OK');
}
```

---

## Part 4: Unified Subscription Hook

```typescript
// hooks/useSubscription.ts
import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { getSubscriptionStatus } from '@/services/revenuecat';
import { supabase } from '@/lib/supabase';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      // For mobile, check RevenueCat
      if (Platform.OS !== 'web') {
        return getSubscriptionStatus();
      }
      
      // For web, check database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isPro: false };
      
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      return {
        isPro: data?.tier === 'pro' || data?.tier === 'business',
        tier: data?.tier || 'free',
        expirationDate: data?.current_period_end
      };
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}
```

---

## Testing Payments

### Stripe Test Mode
- Use card: `4242 4242 4242 4242`
- Any future expiry, any CVC

### RevenueCat Sandbox
1. Create Sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account
4. Purchases won't charge real money

---

## Next Steps

- [Deployment Guide →](07-DEPLOYMENT.md)
- [Customization →](08-CUSTOMIZATION.md)
