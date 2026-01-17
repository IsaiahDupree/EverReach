# Subscription Cancellation System - Analysis & Playbook

Complete guide for implementing cross-platform subscription cancellation with entitlement portability across Apple (IAP), Google Play (Billing), and Web (Stripe).

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Battle-Tested Playbook](#battle-tested-playbook)
3. [Implementation Status](#implementation-status)
4. [Quick Start Guide](#quick-start-guide)

---

## Current State Analysis

### What We Have ✅

Based on existing migrations in `trial_tracking_system.sql`:

```sql
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS origin TEXT CHECK (origin IN ('stripe','app_store','play','manual')) DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
```

**Existing Infrastructure:**
- ✅ `user_subscriptions` table with `origin` field
- ✅ Trial tracking (started_at, ends_at)
- ✅ `cancel_at_period_end` boolean
- ✅ Stripe webhook handler (partial)
- ✅ Profile-level subscription fields (`stripe_customer_id`, `subscription_status`, `current_period_end`)
- ✅ Entitlement snapshot system

### What's Missing ❌

**Data Model Gaps:**

1. ❌ **`provider_subscription_id`** - Cross-platform subscription tracking
   - Stripe: `sub_xxx`
   - Apple: `originalTransactionId`
   - Google: `purchaseToken`

2. ❌ **`status` enum** - Normalized status across providers
   - Need: `trialing|active|in_grace|paused|canceled|expired|billing_issue`
   - Current: Using profile-level `subscription_status`

3. ❌ **`entitlement_active_until`** - Computed portable entitlement date
   - Single source of truth for "access until when?"
   - Considers trial_end, current_period_end, grace_end

4. ❌ **`is_primary`** - Multi-subscription conflict resolution
   - Which provider "wins" if user has iOS + web subs

5. ❌ **`origin_platform_user_key`** - Store account identifier
   - Apple ID, Google account email

6. ❌ **`canceled_at`** - Cancellation timestamp
   - When user requested cancellation (may still be active)

7. ❌ **`unclaimed_entitlements` table** - Buy-first, link-later flow
   - User purchases on mobile before account creation
   - Store receipt, claim after signup

8. ❌ **`subscription_audit_events` table** - Complete lifecycle tracking
   - purchase, cancel_request, provider_webhook, status_change, etc.

**Missing Endpoints:**

1. ❌ `POST /api/v1/link/apple` - Link Apple IAP subscription
2. ❌ `POST /api/v1/link/google` - Link Google Play subscription
3. ❌ `POST /api/v1/billing/cancel` - **Unified cancellation API**
4. ❌ `GET /api/v1/me/entitlement` - Portable entitlement resolver
5. ❌ `POST /api/webhooks/app-store` - Apple S2S Notifications
6. ❌ `POST /api/webhooks/play` - Google Real-Time Developer Notifications

**Missing Logic:**

- ❌ Cross-platform entitlement resolution (pay anywhere = entitled everywhere)
- ❌ Store-aware cancellation flow (server API vs store UI redirect)
- ❌ Conflict resolution when user has multiple active subscriptions
- ❌ Receipt/token validation for Apple & Google
- ❌ Auto-claim unclaimed entitlements on login

---

## Battle-Tested Playbook

### 1) Canonical Data Model (One Truth)

All subscription data flows into a single normalized structure:

**user_subscriptions (extended)**
```sql
user_id UUID
provider TEXT ('stripe'|'app_store'|'play')
provider_subscription_id TEXT (unique per provider)
  -- Stripe: sub_xxx
  -- Apple: originalTransactionId 
  -- Google: purchaseToken
status TEXT ('trialing'|'active'|'in_grace'|'paused'|'canceled'|'expired'|'billing_issue')
subscribed_at TIMESTAMPTZ
trial_started_at TIMESTAMPTZ
trial_ends_at TIMESTAMPTZ
current_period_end TIMESTAMPTZ
cancel_at_period_end BOOLEAN
canceled_at TIMESTAMPTZ
entitlement_active_until TIMESTAMPTZ (computed: max of trial_end/current_period_end/grace_end)
is_primary BOOLEAN (which provider "wins" if multiple are active)
origin_platform_user_key TEXT (store account handle if available)
```

**unclaimed_entitlements (new)**
```sql
id UUID
provider TEXT
raw_receipt_or_token TEXT (for re-validation)
hint_email TEXT (matching hint for claim)
product_id TEXT
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
claimed_by_user_id UUID (NULL until claimed)
claimed_at TIMESTAMPTZ
```

**subscription_audit_events (new)**
```sql
id UUID
user_id UUID
event_type TEXT ('purchase'|'cancel_request'|'provider_webhook'|'status_change'|...)
provider TEXT
provider_subscription_id TEXT
old_status TEXT
new_status TEXT
payload JSONB (full event data)
created_at TIMESTAMPTZ
```

**Key Principle:** Your UI/entitlement logic only reads from `user_subscriptions`. All providers normalized into one table.

---

### 2) Account Linking + Receipt Validation

**Endpoints:**
- `POST /api/v1/link/apple` → `{ receipt: base64 }`
- `POST /api/v1/link/google` → `{ purchaseToken, packageName, productId }`
- `POST /api/v1/link/stripe` → `{ customer_id? }` (optional; Stripe portal links via email)

**Server Steps:**
1. Verify receipt/token with the provider
2. Upsert `user_subscriptions` row (by `provider_subscription_id`)
3. If user not logged in:
   - Store in `unclaimed_entitlements`
   - Match by `hint_email` when they create/login
4. Set `is_primary` if it's the only active sub or most recent paid

**Result:** Once linked, single account unlocks web + iOS + Android

---

### 3) Unified Cancellation API (One Button Everywhere)

**Mobile Rules:** You cannot cancel Apple/Google from your backend. Must redirect users to store manage UI.

**Single Endpoint:**
```
POST /api/v1/billing/cancel
{
  "scope": "primary",  // or "provider:stripe|app_store|play"
  "when": "period_end",  // or "now" (web only)
  "reason": "user_request"
}
```

**Server Logic:**

1. Lookup user's primary active subscription (or chosen provider)

2. **If provider == 'stripe':**
   - Set `cancel_at_period_end = true` (or cancel immediately)
   - Write audit event
   - Return: `{ cancel_method: 'server', status: 'scheduled', current_period_end: ... }`

3. **If provider in ('app_store', 'play'):**
   - Persist `pending_cancel_request` audit event
   - Return `manage_url` to open native store UI
   - Optional: Email same link to user

**Client Side:**

```javascript
if (cancel_method == 'store') {
  // iOS: https://apps.apple.com/account/subscriptions
  // Android: https://play.google.com/store/account/subscriptions
  window.open(manage_url, '_blank');
  showMessage("We'll update your status automatically");
}
```

---

### 4) Entitlement Resolution (Portable + Conflict-Proof)

**Rule of Thumb:** Paying anywhere entitles everywhere (once linked).

**Resolver (Server):**
```javascript
function resolveEntitlement(userId, now) {
  subs = SELECT * FROM user_subscriptions WHERE user_id = userId

  // 1) Lift provider states into common state machine
  for (s in subs) {
    s.entitled = (s.status IN ['trialing','active','in_grace']) 
                 && (s.entitlement_active_until > now)
  }

  // 2) Choose primary if multiple entitlements
  primary = pick:
    a) any 'active' over 'trialing' over 'in_grace'
    b) most recent paid start if tie
    c) stable preference order (stripe > app_store > play) as tiebreaker

  // 3) Compute final
  entitled = any(s.entitled for s in subs)
  reason = primary.status
  until = max(s.entitlement_active_until for entitled s)

  return { 
    entitled, 
    reason, 
    provider: primary.provider, 
    active_until: until 
  }
}
```

**Transfers / Double Subs:**
- User buys on web after iOS sub → Keep iOS active until lapses; set web as `is_primary`
- Both renew → Prefer newest purchase
- Never show duplicate paywalls

---

### 5) Provider-Specific Cancellation Nuances

**Stripe (Web):**
- Use Customer Portal or API (`cancel_at_period_end` or immediate)
- Persist via webhooks: `customer.subscription.updated/deleted`

**Apple (IAP):**
- Cannot cancel from backend → Provide manage link
- Server-to-Server Notifications detect:
  - `is_in_billing_retry_period`
  - `grace_period_expires_date`
  - `auto_renew_status = false` (user canceled)

**Google Play:**
- Use `BillingClient` manage intent (in-app) or web URL
- Real-Time Developer Notifications:
  - `paymentState`, `autoRenewing`, `expiryTimeMillis`
  - Grace period windows

**Unified Update:**
```javascript
// All webhooks normalize to:
{
  provider,
  provider_subscription_id,
  status,
  subscribed_at,
  trial_started_at,
  trial_ends_at,
  current_period_end,
  cancel_at_period_end,
  canceled_at,
  entitlement_active_until  // computed
}
// Upsert user_subscriptions
// Emit audit_events
```

---

### 6) Webhooks + Validators (The Glue)

**Webhook Endpoints:**
- `/api/webhooks/stripe`
- `/api/webhooks/app-store`
- `/api/webhooks/play`

**Processing Flow:**
1. Receive provider event
2. Normalize to canonical format
3. Upsert `user_subscriptions`
4. Emit `subscription_audit_events`
5. Return 200 OK

**Scheduled Validator** (every 6-12h):
- Re-verify receipts/tokens near `current_period_end` or in `billing_issue`
- Heal missed webhooks
- Close `pending_cancel_request` if store shows `autoRenew=false`

**Frontend Contract:**
```json
GET /api/v1/me/trial-stats
{
  "entitled": true,
  "reason": "active",  // active|trialing|in_grace|none
  "provider": "stripe",
  "active_until": "2025-12-01T12:34:56Z",
  "cancel": {
    "allowed": true,
    "method": "server|store",
    "manage_url": "https://..."
  }
}
```

---

## Tiny Implementation Checklist

- [ ] Add `pending_cancel_request` audit event for store providers
- [ ] Always return `manage_url` + clear instructions
- [ ] Use server time as source of truth (never trust client clocks)
- [ ] Make all writes idempotent (event IDs / idempotency_key)
- [ ] Don't hardcode provider states in client—read normalized fields only
- [ ] Auto-compute `entitlement_active_until` via trigger
- [ ] Set `is_primary` automatically for first subscription
- [ ] Match unclaimed entitlements by email on signup
- [ ] Log all lifecycle events to audit table
- [ ] Test cancellation flow for all 3 providers

---

## Implementation Status

### ✅ Phase 1: Schema Updates (COMPLETE)

**File:** `migrations/subscription_cancellation_system.sql`

**Changes:**
- Extended `user_subscriptions` with 7 new columns
- Created `unclaimed_entitlements` table
- Created `subscription_audit_events` table
- Added 3 SQL helper functions
- Added auto-compute triggers

**What to run:**
```bash
psql $DATABASE_URL -f migrations/subscription_cancellation_system.sql
```

### ✅ Phase 2: Core Cancellation (COMPLETE)

**Files:**
- `app/api/v1/billing/cancel/route.ts` - Unified cancellation endpoint
- `lib/trial-stats.ts` - Updated with cancel info

**Features:**
- Handles Stripe via server API
- Returns store URLs for Apple/Google
- Logs all cancellation events
- Updates `/v1/me/trial-stats` response with cancel object

### ✅ Phase 3: Provider Linking (COMPLETE)

**Files:**
- `lib/receipt-validation.ts` - Apple & Google validation
- `app/api/v1/link/apple/route.ts` - Link Apple subscriptions
- `app/api/v1/link/google/route.ts` - Link Google subscriptions
- `app/api/webhooks/app-store/route.ts` - Apple S2S Notifications
- `app/api/webhooks/play/route.ts` - Google RTDN

**Features:**
- Receipt validation for both providers
- Buy-first, link-later support
- Auto-claim on login
- Webhook handlers for both stores

---

## Quick Start Guide

### 1. Apply Migration

```bash
# Connect to your Supabase database
psql postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres \
  -f migrations/subscription_cancellation_system.sql
```

### 2. Set Environment Variables

```bash
# Apple App Store
APPLE_SHARED_SECRET=your_app_specific_shared_secret

# Google Play  
GOOGLE_PLAY_ACCESS_TOKEN=your_oauth2_access_token

# Stripe (already configured)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Configure Webhooks

**Apple:**
- App Store Connect → Your App → App Information
- Server-to-Server Notification URL: `https://your-domain.com/api/webhooks/app-store`
- Version: V2 (JWT-signed)

**Google:**
- Play Console → Your App → Monetization → Subscriptions
- Real-time developer notifications
- Pub/Sub topic → Push to `https://your-domain.com/api/webhooks/play`

### 4. Test Cancellation Flow

**Web (Stripe):**
```bash
curl -X POST https://your-domain.com/api/v1/billing/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scope":"primary","when":"period_end","reason":"testing"}'
```

**iOS (Sandbox):**
1. Make test purchase with sandbox account
2. POST to `/v1/link/apple` with receipt
3. Cancel in iOS Settings → [Apple ID] → Subscriptions
4. Verify webhook updates status

**Android (Test):**
1. Make test purchase with test account
2. POST to `/v1/link/google` with purchase token
3. Cancel in Play Store
4. Verify RTDN updates status

### 5. Frontend Integration

```typescript
// Get cancellation info
const stats = await fetch('/api/v1/me/trial-stats').then(r => r.json());

if (stats.cancel.allowed) {
  if (stats.cancel.method === 'server') {
    // Stripe: Show cancel button
    await fetch('/api/v1/billing/cancel', { 
      method: 'POST',
      body: JSON.stringify({ scope: 'primary', when: 'period_end' })
    });
  } else {
    // Store: Open manage URL
    window.open(stats.cancel.manage_url, '_blank');
  }
}
```

---

## Key Design Decisions

### Why One Table?

**Single `user_subscriptions` table** for all providers because:
- ✅ Single query to check entitlement
- ✅ Consistent status normalization
- ✅ Easy conflict resolution (is_primary)
- ✅ Simple frontend contract
- ❌ Alternative (separate tables per provider) = complex joins + duplicate logic

### Why `entitlement_active_until`?

**Computed column** instead of calculating on-the-fly:
- ✅ Indexed for fast queries
- ✅ Auto-updated via trigger
- ✅ Single source of truth
- ✅ Handles trial → paid → grace transitions

### Why `unclaimed_entitlements`?

**Separate table** for buy-first scenarios:
- ✅ User can purchase before account creation
- ✅ Auto-claim on signup (match by email)
- ✅ No orphaned subscriptions
- ✅ Works with all providers

### Why `is_primary`?

**Flag** instead of always picking latest:
- ✅ User can have iOS + web subs simultaneously
- ✅ Deterministic conflict resolution
- ✅ Supports manual override if needed
- ✅ Prevents duplicate charges

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│           Frontend (Web, iOS, Android)              │
│                                                     │
│  [Cancel Button] → Checks trial-stats.cancel.*     │
│                    If server: POST /billing/cancel  │
│                    If store: Open manage_url        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (Next.js)                  │
│                                                     │
│  /v1/me/trial-stats ─────┐                         │
│  /v1/billing/cancel ──────┤                         │
│  /v1/link/apple ──────────┤                         │
│  /v1/link/google ─────────┤                         │
│                           │                         │
│  /webhooks/stripe ────────┤                         │
│  /webhooks/app-store ─────┤                         │
│  /webhooks/play ──────────┤                         │
│                           │                         │
│                           ▼                         │
│      ┌────────────────────────────────┐            │
│      │   user_subscriptions (single   │            │
│      │   source of truth for all      │            │
│      │   providers)                   │            │
│      └────────────────────────────────┘            │
│                 │                                   │
│                 ├─ unclaimed_entitlements          │
│                 └─ subscription_audit_events       │
└─────────────────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐
    │ Stripe │   │ Apple  │   │ Google │
    │   API  │   │   S2S  │   │  RTDN  │
    └────────┘   └────────┘   └────────┘
```

---

## FAQ

**Q: What if user has both iOS and web subscriptions?**
A: Both remain active. `is_primary` determines which shows in UI. Entitlement granted if ANY is active.

**Q: Can user cancel Apple subscription from web app?**
A: No. Must redirect to App Store. We detect cancellation via webhook and update status.

**Q: What if webhook is missed?**
A: Scheduled validator re-checks receipts every 6-12h and heals state.

**Q: How to handle refunds?**
A: Provider sends webhook → Status set to `canceled` → Audit event logged → Entitlement revoked immediately.

**Q: What about family sharing (Apple)?**
A: Use `origin_platform_user_key` to track purchaser. Each family member links their own account.

**Q: How to test without real subscriptions?**
A: Use sandbox/test accounts for each provider. Apple Sandbox, Google Test, Stripe Test mode.

---

## Related Documentation

- [Complete Implementation Guide](./SUBSCRIPTION_CANCELLATION_SYSTEM.md)
- [Trial Tracking System](./TRIAL_TRACKING_SYSTEM.md)
- [Supporting Cast API Reference](./SUPPORTING_CAST_API_REFERENCE.md)

---

## Summary

✅ **Implemented:**
- Cross-platform subscription tracking
- Unified cancellation API
- Provider linking (Apple, Google, Stripe)
- Webhook handlers for all providers
- Buy-first, link-later support
- Complete audit trail
- Conflict resolution for multiple subs

🚀 **Ready to deploy!**

Run migration → Configure webhooks → Test flows → Ship to production
