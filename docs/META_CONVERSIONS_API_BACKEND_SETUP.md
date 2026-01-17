# Backend Setup: Meta Conversions API

This document outlines all changes needed for the backend team to enable Meta Conversions API server-side event tracking.

## Overview

Meta Conversions API sends events server-side to Facebook for improved ad attribution. This complements the client-side pixel and improves Event Match Quality (EMQ) score.

**Current EMQ Score:** 4.4/10  
**Target EMQ Score:** 7.0+ (recommended for optimal ad performance)

---

## 1. Environment Variables

Add these to **Vercel → ever-reach-be → Settings → Environment Variables**:

| Variable | Value | Description |
|----------|-------|-------------|
| `META_DATASET_ID` | `10039038026189444` | Meta Dataset ID (Dupree Ops Meta Pixel) |
| `EXPO_PUBLIC_META_PIXEL_ID` | `10039038026189444` | Meta Pixel ID |
| `META_CONVERSIONS_API_TOKEN` | `EAAOhwkTLb4MBQVSPt6v2WJ8C7YyKwc1NXkUHmAWRbZAT4VPZAjuc8XrRqbgnD4U99uXWODcoAyGVIq0WIVThgG6TJLLsKS7SxAZAlcEqZAZBiMLPURwVguvjRCGeG1P7nc5yZAcqkdrPAMrmfD5iUZBphi8EJ0UfqouISohQ4zZAq4d0d0SG1Xxv9VagZA66ALwZDZD` | Conversions API access token |
| `META_TEST_EVENT_CODE` | `TEST6473` | **Remove for production** - only for testing |

---

## 2. Implementation (Already Complete)

The Meta Conversions API is already implemented. No additional dependencies are required - the implementation uses the native Web Crypto API for SHA-256 hashing, making it compatible with Vercel Edge Runtime.

---

## 3. Files Added

### `backend-vercel/lib/meta-conversions.ts` 

Server-side Conversions API client with:
- SHA-256 hashing for PII (email, phone, names) using Web Crypto API
- Event sending to Meta Graph API v21.0
- Edge runtime compatible
- Convenience functions for common events

**Key Functions:**
```typescript
// Send any event
sendMetaEvent(event: MetaServerEvent): Promise<{success, events_received, error}>

// Convenience functions
trackLead(params)
trackCompleteRegistration(params)
trackStartTrial(params)
trackPurchase(params)
trackSubscribe(params)
trackInitiateCheckout(params)
trackViewContent(params)
trackCustomEvent(params)
```

### `backend-vercel/app/api/v1/events/meta/route.ts` 

API endpoint that receives events from frontend and forwards to Meta.

**Endpoint:** `POST /api/v1/events/meta` 

**Request Body:**
```json
{
  "event_name": "Purchase",
  "event_id": "unique_event_id",
  "email": "user@example.com",
  "value": 14.99,
  "currency": "USD",
  "content_name": "EverReach Core Monthly",
  "custom_data": {
    "billing_period": "monthly"
  },
  "fbc": "fb.1.1234567890.abcdef",
  "fbp": "fb.1.1234567890.123456789"
}
```

**Health Check:** `GET /api/v1/events/meta`

Returns:
```json
{
  "status": "ok",
  "pixel_id": "10039038026189444",
  "token_configured": true,
  "test_mode": true,
  "supported_events": ["Purchase", "Subscribe", "StartTrial", "Lead", ...]
}
```

---

## 4. Supported Events

| Event | Trigger | Value |
|-------|---------|-------|
| `Purchase` | Payment success | Price |
| `Subscribe` | Subscription activated | Price |
| `StartTrial` | Trial begins | 0 |
| `Lead` | Waitlist signup | - |
| `CompleteRegistration` | Account created | - |
| `InitiateCheckout` | Checkout started | Price |
| `ViewContent` | Page viewed | - |
| Custom events | Any custom event name | Optional |

---

## 5. Key Parameters for High EMQ

These parameters improve Event Match Quality score:

| Parameter | Source | Priority |
|-----------|--------|----------|
| `fbc` | Facebook Click ID from `fbclid` URL param or `_fbc` cookie | **Critical** |
| `fbp` | Facebook Browser ID from `_fbp` cookie | **Critical** |
| `client_ip_address` | Extracted from `x-forwarded-for` header automatically | **Critical** |
| `client_user_agent` | Extracted from `user-agent` header automatically | High |
| `em` | SHA-256 hashed email (lowercase, trimmed) | High |
| `external_id` | SHA-256 hashed user ID | Medium |
| `ph` | SHA-256 hashed phone (digits only) | Medium |

---

## 6. Integration Points (Optional Backend Events)

Consider adding server-side tracking to these backend flows:

### Stripe Webhook (Purchase/Subscribe)
**File:** `backend-vercel/app/api/webhooks/stripe/route.ts` 

```typescript
import { trackPurchase, trackSubscribe } from '@/lib/meta-conversions';

// On successful payment
await trackPurchase({
  email: customer.email,
  userId: stripeCustomerId,
  value: 14.99,
  currency: 'USD',
  contentName: 'EverReach Core Monthly',
});
```

### RevenueCat Webhook (iOS/Android Purchase)
**File:** `backend-vercel/app/api/webhooks/revenuecat/route.ts` 

```typescript
import { trackPurchase } from '@/lib/meta-conversions';

// On successful purchase
await trackPurchase({
  email: subscriber.email,
  userId: app_user_id,
  value: price,
  currency: 'USD',
  contentName: product_id,
});
```

### Waitlist Signup (Lead)
**File:** `backend-vercel/app/api/v1/funnel/waitlist/route.ts` 

```typescript
import { trackLead } from '@/lib/meta-conversions';

// On waitlist signup
await trackLead({
  email: body.email,
  contentName: 'Waitlist',
});
```

---

## 7. Testing

### Test Mode
With `META_TEST_EVENT_CODE=TEST6473` set, events appear in:
**Facebook Events Manager → Dupree Ops Meta Pixel → Test Events**

### Verify Setup
1. Send a test event via the API
2. Check Events Manager → Diagnostics
3. Look for improved parameter coverage

### Test Command (Local)
```bash
curl -X POST http://localhost:3333/api/v1/events/meta \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Lead",
    "email": "test@example.com",
    "content_name": "Test Waitlist"
  }'
```

### Test Command (Production)
```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/events/meta \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "ViewContent",
    "email": "test@example.com",
    "content_name": "Test Page"
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "event_name": "Lead",
  "event_id": "1767229163666-8cb5c03c93793856",
  "events_received": 1,
  "fbtrace_id": "A4YLuANuHeBTB05buPXvg6s"
}
```

---

## 8. Production Checklist

- [x] Create `backend-vercel/lib/meta-conversions.ts`
- [x] Create `backend-vercel/app/api/v1/events/meta/route.ts`
- [x] Test locally with `META_TEST_EVENT_CODE`
- [ ] Add `META_DATASET_ID` to Vercel env vars
- [ ] Add `EXPO_PUBLIC_META_PIXEL_ID` to Vercel env vars  
- [ ] Add `META_CONVERSIONS_API_TOKEN` to Vercel env vars
- [ ] Deploy backend
- [ ] Verify events in Facebook Events Manager → Test Events
- [ ] Remove `META_TEST_EVENT_CODE` for production
- [ ] Check EMQ score improvement in Diagnostics

---

## 9. Troubleshooting

### Events Not Appearing
- Check Vercel logs for `[MetaConversions]` messages
- Verify env vars are set correctly in Vercel
- Ensure `META_DATASET_ID` and `META_CONVERSIONS_API_TOKEN` are not empty
- Check the GET endpoint: `GET /api/v1/events/meta` should show `token_configured: true`

### Low EMQ Score
- Ensure `fbc` is being captured from URL on landing
- Verify `client_ip_address` is extracted from headers (automatic)
- Check that email is being passed and hashed
- Pass `fbp` cookie value from frontend

### Deduplication Issues
- Ensure same `event_id` is used for both pixel and server events
- Frontend generates ID, passes to backend via `event_id` parameter

### Token Errors
If you see "access token could not be decrypted" or "missing permissions":
1. Go to Events Manager → Dupree Ops Meta Pixel → Settings
2. Scroll to Conversions API section
3. Click "Set up direct integration" → "Set up with Dataset Quality API"
4. Generate a new token and update `META_CONVERSIONS_API_TOKEN`

---

## 10. Meta Account Details

| Property | Value |
|----------|-------|
| Dataset Name | Dupree Ops Meta Pixel |
| Dataset ID | `10039038026189444` |
| Ad Account | Dupree Ops Ads (`120226380372710481`) |
| Business Manager | TechMeStuff (`3364807517151319`) |
| Test Event Code | `TEST6473` |

---

## References

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Parameter Builder Guide](https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder-library)
- [Event Match Quality](https://www.facebook.com/business/help/765081237991954)
- [Events Manager](https://business.facebook.com/events_manager)
