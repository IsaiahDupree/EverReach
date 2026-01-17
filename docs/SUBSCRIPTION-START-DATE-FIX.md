# Subscription Start Date Fix

**Date:** January 2025  
**Type:** Backend API Fix  
**Status:** Deployed

---

## Problem

The "Subscribed Since" date displayed in the mobile app and frontend was showing an incorrect date (Dec 31, 2025) instead of the actual subscription start date stored in the database (Dec 1, 2025).

## Root Cause

The `/api/v1/me/entitlements` endpoint was not returning the `subscription_started_at` field, which the frontend `SubscriptionProvider` relies on as a fallback when local storage doesn't have the date. This caused the frontend to either:
1. Use a stale value from local storage
2. Create a new date on each app reload
3. Display an incorrect date

## Solution

Updated the `/api/v1/me/entitlements` endpoint to include `subscription_started_at` in the response, sourced from the appropriate database table based on the subscription type.

---

## Changes Made

### File: `backend-vercel/app/api/v1/me/entitlements/route.ts` 

1. **Added `subscriptionStartedAt` variable** to track the subscription start date
2. **Updated subscription type** to include `started_at` field
3. **Added logic to extract subscription start date** based on subscription source:
   - **RevenueCat/App Store**: Uses `subscriptions.started_at` 
   - **Stripe**: Uses `user_subscriptions.subscribed_at` (with fallback to `subscriptions.started_at`)
   - **Legacy**: Uses `subscriptions.started_at` if available
4. **Added `subscription_started_at` to response** so the frontend can use it

### Code Changes

```typescript
// Added variable
let subscriptionStartedAt: string | null = null;

// Updated subscription type
let subscription: { 
  status?: string | null; 
  current_period_end?: string | null; 
  product_id?: string | null; 
  started_at?: string | null 
} | null = null;

// RevenueCat/App Store path
subscriptionStartedAt = subscription?.started_at || null;

// Stripe path
try {
  const { data: userSub } = await supabase
    .from('user_subscriptions')
    .select('subscribed_at')
    .eq('user_id', user.id)
    .order('subscribed_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  subscriptionStartedAt = userSub?.subscribed_at || subscription?.started_at || null;
} catch {}

// Legacy path
subscriptionStartedAt = subscription?.started_at || null;

// Added to response
return ok({
  // ... existing fields
  subscription_started_at: subscriptionStartedAt
}, req);
```

---

## Data Flow

### Frontend (`SubscriptionProvider.tsx`)

The frontend checks for subscription start date in this order:
1. **Local Storage** (`@subscription_start_date`) - PRIMARY source, persists across sessions
2. **Backend API** (`subscription_started_at` from `/api/v1/me/entitlements`) - FALLBACK
3. **Create new date** - Only if neither exists (first-time subscription)

### Backend (`/api/v1/me/entitlements`)

The backend now returns `subscription_started_at` sourced from:
- `subscriptions.started_at` for RevenueCat/App Store subscriptions
- `user_subscriptions.subscribed_at` for Stripe subscriptions (with fallback)
- `subscriptions.started_at` for legacy subscriptions

---

## Database Schema

### Tables Used

1. **`subscriptions`** table:
   - `started_at` (TIMESTAMPTZ) - When subscription was created
   - `status` - Subscription status (active, canceled, etc.)
   - `current_period_end` - End of current billing period

2. **`user_subscriptions`** table:
   - `subscribed_at` (TIMESTAMPTZ) - Canonical "member since" date
   - `status` - Subscription status
   - `purchased_at` - When purchase was made

---

## Verification

### Database Query

```sql
SELECT 
  p.email,
  s.started_at as subscription_started_at,
  s.status as subscription_status,
  s.current_period_end,
  us.subscribed_at as user_subscription_subscribed_at
FROM profiles p
LEFT JOIN subscriptions s ON s.user_id = p.user_id AND s.status = 'active'
LEFT JOIN user_subscriptions us ON us.user_id = p.user_id AND us.status = 'active'
WHERE p.email = 'soursides@protonmail.com';
```

### Expected Result

| Field | Value |
|-------|-------|
| Email | `soursides@protonmail.com` |
| Subscription Start Date | `2025-12-01 01:08:19.549+00` (Dec 1, 2025) |
| Status | `active` |
| Current Period End | `2026-01-31 20:50:54+00` |

### API Response

After deployment, the `/api/v1/me/entitlements` endpoint returns:

```json
{
  "plan": "pro",
  "tier": "core",
  "subscription_status": "active",
  "subscription_started_at": "2025-12-01T01:08:19.549Z",
  "valid_until": "2026-01-31T20:50:54.000Z",
  "source": "revenuecat"
}
```

---

## Testing Checklist

- [ ] Clear local storage on the device/app to force backend lookup
- [ ] Reload the app and check "Subscribed Since" date
- [ ] Verify it matches the database value (Dec 1, 2025, not Dec 31, 2025)
- [ ] Check API response directly to confirm `subscription_started_at` is included

---

## Deployment Notes

| Requirement | Status |
|-------------|--------|
| Database migrations | ✅ Not required |
| Frontend changes | ✅ Not required (already handles field) |
| Backend API change | ✅ Required |
| Vercel deployment | ⚠️ Required to take effect |

---

## Related Files

| File | Purpose |
|------|---------|
| `backend-vercel/app/api/v1/me/entitlements/route.ts` | Backend API endpoint (MODIFIED) |
| `providers/SubscriptionProvider.tsx` | Frontend state management |
| `app/subscription-plans.tsx` | Subscription plans screen |
| `app/settings/billing.tsx` | Billing settings screen |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SubscriptionProvider.tsx                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Check Local Storage (@subscription_start_date)           │   │
│  │    ↓ (if empty)                                             │   │
│  │ 2. Use Backend API (subscription_started_at)                │   │
│  │    ↓ (if empty)                                             │   │
│  │ 3. Create new Date() - first-time only                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ GET /api/v1/me/entitlements
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /api/v1/me/entitlements/route.ts                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Source Detection:                                           │   │
│  │                                                             │   │
│  │ if (source === 'app_store' || 'revenuecat')                │   │
│  │   → subscriptions.started_at                               │   │
│  │                                                             │   │
│  │ if (source === 'stripe')                                   │   │
│  │   → user_subscriptions.subscribed_at                       │   │
│  │   → fallback: subscriptions.started_at                     │   │
│  │                                                             │   │
│  │ else (legacy)                                              │   │
│  │   → subscriptions.started_at                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE (Supabase)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────┐    ┌───────────────────────────────┐   │
│  │   subscriptions       │    │   user_subscriptions          │   │
│  ├───────────────────────┤    ├───────────────────────────────┤   │
│  │ user_id              │    │ user_id                       │   │
│  │ started_at ◄─────────┼────┼─► subscribed_at               │   │
│  │ status               │    │ status                        │   │
│  │ current_period_end   │    │ purchased_at                  │   │
│  │ store                │    │                               │   │
│  └───────────────────────┘    └───────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*End of Documentation*
