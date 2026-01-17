# Frontend Entitlements API Guide

## Overview

This document explains the API calls made for subscription management and how the frontend should display subscription dates.

---

## API Endpoint

```
GET /api/v1/me/entitlements
Authorization: Bearer <access_token>
```

---

## Response Fields

```json
{
  "plan": "pro",
  "tier": "core",
  "source": "app_store",
  "subscription_status": "active",
  "subscription_started_at": "2025-12-01T01:08:19.549+00:00",
  "valid_until": "2026-01-17T03:32:58+00:00",
  "product_id": "com.everreach.core.monthly",
  "billing_period": "monthly",
  "trial_ends_at": null,
  "features": {
    "compose_runs": 1000,
    "voice_minutes": 300,
    "messages": 2000
  }
}
```

### Key Date Fields

| Field | Description | Example | Use For |
|-------|-------------|---------|---------|
| `valid_until` | When subscription expires/renews | `2026-01-17T03:32:58+00:00` | **"Renews On"** or **"Valid Until"** |
| `subscription_started_at` | When user first subscribed | `2025-12-01T01:08:19.549+00:00` | "Member Since" (optional) |

---

## Recommended UI Display

### ✅ Use `valid_until` for Active Subscriptions

Instead of showing "Subscribed Since", show **when the subscription renews**:

```tsx
// RECOMMENDED: Show renewal date
<Text>Renews: {formatDate(entitlements.valid_until)}</Text>
// Example: "Renews: Jan 17, 2026"

// OR
<Text>Valid Until: {formatDate(entitlements.valid_until)}</Text>
// Example: "Valid Until: Jan 17, 2026"
```

### ❌ Avoid "Subscribed Since" with Today's Date

The previous implementation was showing today's date because it wasn't using the API response:

```tsx
// DON'T DO THIS - creates new date if not found
const subscriptionDate = storedDate || new Date().toISOString();
```

---

## Frontend Implementation

### Fetch Entitlements

```typescript
// repos/SubscriptionRepo.ts or similar
export async function getEntitlements(): Promise<Entitlements> {
  const response = await apiFetch('/api/v1/me/entitlements', {
    method: 'GET',
    requireAuth: true,
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch entitlements');
  }
  
  return response.json();
}
```

### Display Subscription Status

```tsx
// components/SubscriptionStatus.tsx
import { useEntitlements } from '@/hooks/useEntitlements';

function SubscriptionStatus() {
  const { data: entitlements } = useEntitlements();
  
  if (!entitlements) return null;
  
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <View>
      <Text>Status: {entitlements.subscription_status}</Text>
      <Text>Plan: {entitlements.tier}</Text>
      
      {/* Use valid_until for renewal date */}
      {entitlements.valid_until && (
        <Text>Renews: {formatDate(entitlements.valid_until)}</Text>
      )}
      
      {/* Optional: Show member since date */}
      {entitlements.subscription_started_at && (
        <Text style={{ color: 'gray', fontSize: 12 }}>
          Member since {formatDate(entitlements.subscription_started_at)}
        </Text>
      )}
    </View>
  );
}
```

### Subscription Plans Screen Update

```tsx
// app/subscription-plans.tsx
function CurrentSubscriptionCard({ entitlements }) {
  const renewalDate = entitlements?.valid_until 
    ? new Date(entitlements.valid_until).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      })
    : null;

  return (
    <Card>
      <CardTitle>Current Subscription</CardTitle>
      
      <Row>
        <Label>Status:</Label>
        <Badge variant="success">Active</Badge>
      </Row>
      
      <Row>
        <Label>Plan:</Label>
        <Value>{entitlements.tier} ({entitlements.billing_period})</Value>
      </Row>
      
      {/* UPDATED: Show renewal date instead of "Subscribed Since" */}
      <Row>
        <Label>Renews:</Label>
        <Value>{renewalDate}</Value>
      </Row>
      
      <Row>
        <Label>Account:</Label>
        <Value>{user.email}</Value>
      </Row>
    </Card>
  );
}
```

---

## Date Field Summary

| What to Show | API Field | Format Example |
|--------------|-----------|----------------|
| **Renewal Date** | `valid_until` | "Jan 17, 2026" |
| **Member Since** (optional) | `subscription_started_at` | "Dec 1, 2025" |
| **Billing Period** | `billing_period` | "monthly" / "annual" |
| **Plan Name** | `tier` | "core" / "pro" |

---

## Backend Changes Made

### Endpoint: `/api/v1/me/entitlements`

**Added field:** `subscription_started_at`

The endpoint now returns:
- `subscription_started_at` - Date when user first subscribed (from `subscriptions.started_at`)
- `valid_until` - Date when subscription expires/renews (from `subscriptions.current_period_end`)

Both dates come from the database, not generated on the fly.

---

## Testing

### Verify API Response

```bash
# Production
curl -s https://ever-reach-be.vercel.app/api/v1/me/entitlements \
  -H "Authorization: Bearer <token>" | jq '{
    valid_until,
    subscription_started_at,
    subscription_status,
    tier
  }'

# Local development (port 3333)
curl -s http://localhost:3333/api/v1/me/entitlements \
  -H "Authorization: Bearer <token>" | jq '{
    valid_until,
    subscription_started_at,
    subscription_status,
    tier
  }'
```

### Expected Response

```json
{
  "valid_until": "2026-01-17T03:32:58+00:00",
  "subscription_started_at": "2025-11-01T21:53:47.122957+00:00",
  "subscription_status": "active",
  "tier": "core"
}
```

---

## Summary

| Before | After |
|--------|-------|
| "Subscribed Since: Dec 31, 2025" (wrong - today's date) | "Renews: Jan 17, 2026" (correct - from API) |

**Frontend should use `valid_until` to show when the subscription renews, not "Subscribed Since".**
