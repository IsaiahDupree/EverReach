# Billing API

Stripe integration for subscription management.

**Base Endpoint**: `/api/billing`

---

## Overview

The billing system uses Stripe for:
- Subscription checkout
- Customer portal (update payment, cancel)
- Usage tracking
- Tier management

---

## Create Checkout Session

Redirect user to Stripe checkout for subscription.

```http
POST /api/billing/checkout
```

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/billing/checkout',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { url } = await response.json();

// Redirect user to Stripe
window.location.href = url;
```

### Response

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

---

## Create Portal Session

Access Stripe customer portal for subscription management.

```http
POST /api/billing/portal
```

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/billing/portal',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { url } = await response.json();

// Redirect to customer portal
window.location.href = url;
```

---

## Usage

### Check Subscription Status

```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Check profile for subscription
const { data: profile } = await supabase
  .from('profiles')
  .select('stripe_customer_id, subscription_status, subscription_tier')
  .eq('user_id', user.id)
  .single();

console.log('Subscription:', profile.subscription_status);
```

### Subscription Tiers

| Tier | Features |
|------|----------|
| Free | 50 contacts, basic features |
| Pro | Unlimited contacts, AI features, analytics |
| Enterprise | Custom limits, priority support, API access |

---

## Webhooks

Stripe sends webhooks to `/api/webhooks/stripe` for:
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Tier change
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_failed` - Payment issue

---

## Error Handling

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 500 Server Error (Stripe misconfigured)
```json
{
  "error": "Server misconfigured: STRIPE_PRICE_PRO_MONTHLY must be a price_ id"
}
```

---

## Next Steps

- [Authentication](./01-authentication.md) - Required for billing endpoints
- [Error Handling](./12-error-handling.md) - Common error scenarios
