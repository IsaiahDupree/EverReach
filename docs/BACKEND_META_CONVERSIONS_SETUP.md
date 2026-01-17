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
| `EXPO_PUBLIC_META_PIXEL_ID` | `1191876055285693` | Meta Pixel ID |
| `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` | `EAAOfxiFoZC4kBQVpO34Y4g5qxSe1M4BdUA3kQ8KlCAgUGJOYXcqjLnaaN6gYlLYdrCPZB4O2WmgX8vmcP3KIppvzhZAjCBeV3dFTsd4zjhF4ZB0kQmLSLJIkaZBkVSXlzChfeSX9YgZBaQ0iFZCV9nZBHuwdFzkxlUX8IFd8vHieppd7r4UuTsK9uRednPwXt3XZAyiViHoZBWNI7Jx8lhiNk2pjjnUbYmInD6KdKaXnA48L6NLphuZAnMsfSD5xqMFNWc12buZAaruZAPlbbxoR3XCAaDFM8ZA7cbcGcxtKSo8M2bb9AbeqYf07lrZCNJW4TUML1ib` | Conversions API access token |
| `META_TEST_EVENT_CODE` | `TEST6473` | **Remove for production** - only for testing |

---

## 2. Install Dependencies

Run in `backend-vercel/` directory:

```bash
npm install facebook-nodejs-business-sdk
```

Or the package is already added to `package.json`:
```json
"facebook-nodejs-business-sdk": "^21.0.0"
```

---

## 3. New Files Added

### `backend-vercel/lib/meta-conversions.ts`

Server-side Conversions API client with:
- SHA-256 hashing for PII (email, phone, names)
- Event sending to Meta Graph API
- Convenience functions for common events

**Key Functions:**
```typescript
// Send any event
sendMetaEvent(event: MetaServerEvent): Promise<{success, eventId, error}>

// Convenience functions
trackLead(userData, source)
trackCompleteRegistration(userData, method)
trackStartTrial(userData, trialDays)
trackPurchase(userData, planName, price, billingPeriod, orderId)
trackSubscribe(userData, planName, price, billingPeriod, orderId)
trackInitiateCheckout(userData, planName, price, billingPeriod)
trackViewContent(userData, contentName, contentCategory)
trackContactImported(userData, contactCount)
trackVoiceNoteCreated(userData)
trackTrialExpired(userData)
```

### `backend-vercel/app/api/v1/events/meta/route.ts`

API endpoint that receives events from frontend and forwards to Meta.

**Endpoint:** `POST /api/v1/events/meta`

**Request Body:**
```json
{
  "eventName": "Purchase",
  "eventId": "unique_event_id",
  "eventSourceUrl": "https://www.everreach.app/subscription-plans",
  "userData": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "externalId": "user_uuid",
    "fbc": "fb.1.1234567890.abcdef",
    "fbp": "fb.1.1234567890.123456789",
    "clientUserAgent": "Mozilla/5.0..."
  },
  "customData": {
    "value": 14.99,
    "currency": "USD",
    "contentName": "EverReach Core Monthly",
    "billingPeriod": "monthly"
  }
}
```

---

## 4. Key Parameters for High EMQ

These parameters improve Event Match Quality score:

| Parameter | Source | Priority |
|-----------|--------|----------|
| `fbc` | Facebook Click ID from `fbclid` URL param or `_fbc` cookie | **Critical** |
| `fbp` | Facebook Browser ID from `_fbp` cookie | **Critical** |
| `client_ip_address` | `x-forwarded-for` or `x-real-ip` header | **Critical** |
| `client_user_agent` | `user-agent` header | High |
| `em` | SHA-256 hashed email (lowercase, trimmed) | High |
| `external_id` | SHA-256 hashed user ID | Medium |
| `ph` | SHA-256 hashed phone (digits only) | Medium |

---

## 5. Integration Points (Optional Backend Events)

Consider adding server-side tracking to these backend flows:

### Stripe Webhook (Purchase/Subscribe)
**File:** `backend-vercel/app/api/webhooks/stripe/route.ts`

```typescript
import { trackPurchase, trackSubscribe } from '@/lib/meta-conversions';

// On successful payment
await trackPurchase(
  { email: customer.email, externalId: userId },
  'EverReach Core Monthly',
  14.99,
  'monthly',
  stripeSubscriptionId
);
```

### Waitlist Signup (Lead)
**File:** `backend-vercel/app/api/v1/waitlist/route.ts`

```typescript
import { trackLead } from '@/lib/meta-conversions';

// On waitlist signup
await trackLead(
  { email: body.email },
  'Waitlist'
);
```

### Contact Import
**File:** `backend-vercel/app/api/v1/contacts/import/route.ts`

```typescript
import { trackContactImported } from '@/lib/meta-conversions';

// On successful import
await trackContactImported(
  { email: userEmail, externalId: userId },
  importedCount
);
```

---

## 6. Testing

### Test Mode
With `META_TEST_EVENT_CODE=TEST6473` set, events appear in:
**Facebook Events Manager → Test Events**

### Verify Setup
1. Send a test event via the API
2. Check Events Manager → Diagnostics
3. Look for improved parameter coverage

### Test Command
```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/events/meta \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "ViewContent",
    "userData": {
      "email": "test@example.com"
    },
    "customData": {
      "contentName": "Test Page"
    }
  }'
```

---

## 7. Production Checklist

- [ ] Add `EXPO_PUBLIC_META_PIXEL_ID` to Vercel env vars
- [ ] Add `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` to Vercel env vars
- [ ] Run `npm install` to install Meta SDK
- [ ] Deploy backend
- [ ] Remove `META_TEST_EVENT_CODE` for production
- [ ] Verify events in Facebook Events Manager
- [ ] Check EMQ score improvement in Diagnostics

---

## 8. Troubleshooting

### Events Not Appearing
- Check Vercel logs for `[MetaConversions]` messages
- Verify env vars are set correctly
- Ensure `PIXEL_ID` and `ACCESS_TOKEN` are not empty

### Low EMQ Score
- Ensure `fbc` is being captured from URL on landing
- Verify `client_ip_address` is extracted from headers
- Check that email is being passed and hashed

### Deduplication Issues
- Ensure same `eventId` is used for both pixel and server events
- Frontend generates ID, passes to backend

---

## References

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Parameter Builder Guide](https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder-library)
- [Event Match Quality](https://www.facebook.com/business/help/765081237991954)
