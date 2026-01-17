# Session Summary: Meta Conversions API Implementation
**Date:** December 31, 2024  
**Branch:** `e2e-web`  
**Commits:** `9303cd69`, `996d2437`, `58bd2f01`

## Overview

Implemented Meta (Facebook) Conversions API server-side event tracking to improve ad attribution and Event Match Quality (EMQ) score from 4.4/10 to target 7.0+.

---

## What Was Built

### 1. Core Infrastructure

#### Backend Files Created
- **`backend-vercel/lib/meta-conversions.ts`** - Server-side Conversions API client
  - SHA-256 hashing for PII (email, phone, names)
  - Event sending to Meta Graph API v21.0
  - Convenience functions for all event types
  
- **`backend-vercel/app/api/v1/events/meta/route.ts`** - API endpoint
  - Receives events from frontend
  - Extracts IP and user agent from headers
  - Forwards to Meta Conversions API

#### Frontend Files Created
- **`lib/metaServerEvents.ts`** - Frontend helper
  - Dual tracking (client pixel + server API)
  - Event deduplication via shared `eventId`
  - Convenience functions for all events

#### Documentation Created
- **`docs/PRD_META_SERVER_SIDE_EVENTS.md`** - Product requirements
- **`docs/BACKEND_META_CONVERSIONS_SETUP.md`** - Backend team setup guide

---

## 2. Events Implemented

### Frontend Events Tracked

| Event | File | Trigger |
|-------|------|---------|
| `ViewContent` | `app/subscription-plans.tsx` | Pricing page view |
| `InitiateCheckout` | `app/subscription-plans.tsx` | Checkout started |
| `Purchase` | `app/subscription-plans.tsx` | Payment success |
| `CompleteRegistration` | `app/auth.tsx` | Account created |
| `StartTrial` | `app/auth.tsx` | Trial begins (7 days) |
| `ContactImported` | `app/import-contacts-review.tsx` | Contacts imported |
| `VoiceNoteCreated` | `app/voice-note.tsx` | Voice note saved |

### Event Parameters Sent

**User Data (hashed server-side):**
- `em` - Email (SHA-256)
- `fn` - First name (SHA-256)
- `ln` - Last name (SHA-256)
- `ph` - Phone (SHA-256)
- `external_id` - User ID (SHA-256)

**Browser Data:**
- `fbc` - Facebook Click ID (from URL or cookie)
- `fbp` - Facebook Browser ID (from cookie)
- `client_ip_address` - From request headers
- `client_user_agent` - From request headers

**Custom Data:**
- `value` - Transaction amount
- `currency` - USD
- `content_name` - Plan name
- `billing_period` - monthly/annual
- `trial_days` - Trial duration
- `contact_count` - Imported contacts

---

## 3. EMQ Improvements

### Changes for Better Event Match Quality

1. **Early fbc Capture** (`lib/metaPixel.ts`)
   - Captures `fbclid` from URL on page load
   - Saves to `_fbc` cookie (90 days)
   - Called in `app/_layout.tsx` initialization

2. **Server-Side IP Capture** (`backend-vercel/app/api/v1/events/meta/route.ts`)
   - Extracts from `x-forwarded-for` header
   - Fallback to `x-real-ip`

3. **Meta Business SDK** (`backend-vercel/package.json`)
   - Added `facebook-nodejs-business-sdk@^21.0.0`
   - For future parameter builder integration

---

## 4. Environment Variables

### Required for Backend (Vercel)

```bash
EXPO_PUBLIC_META_PIXEL_ID=1191876055285693
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=EAAOfxiFoZC4kBQVpO34Y4g5qxSe1M4BdUA3kQ8KlCAgUGJOYXcqjLnaaN6gYlLYdrCPZB4O2WmgX8vmcP3KIppvzhZAjCBeV3dFTsd4zjhF4ZB0kQmLSLJIkaZBkVSXlzChfeSX9YgZBaQ0iFZCV9nZBHuwdFzkxlUX8IFd8vHieppd7r4UuTsK9uRednPwXt3XZAyiViHoZBWNI7Jx8lhiNk2pjjnUbYmInD6KdKaXnA48L6NLphuZAnMsfSD5xqMFNWc12buZAaruZAPlbbxoR3XCAaDFM8ZA7cbcGcxtKSo8M2bb9AbeqYf07lrZCNJW4TUTML1ib
META_TEST_EVENT_CODE=TEST6473  # Remove for production
```

### Already Set (Local `.env`)

```bash
EXPO_PUBLIC_META_PIXEL_ID=1191876055285693
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=...
META_TEST_EVENT_CODE=TEST6473
```

---

## 5. Files Modified

### Frontend
- `app/_layout.tsx` - Added `initializeFbcCapture()` call
- `app/auth.tsx` - Added registration and trial tracking
- `app/subscription-plans.tsx` - Added checkout, purchase, view tracking
- `app/import-contacts-review.tsx` - Added contact import tracking
- `app/voice-note.tsx` - Added voice note tracking
- `lib/metaPixel.ts` - Added fbc capture and cookie persistence

### Backend
- `backend-vercel/package.json` - Added Meta SDK dependency

---

## 6. Testing

### Test Events Tool
Events appear in **Facebook Events Manager → Test Events** with code `TEST6473`

### Verification Steps
1. Check Events Manager → Diagnostics for parameter coverage
2. Verify deduplication (same `eventId` for pixel + server)
3. Monitor EMQ score improvement

### Test Command
```bash
curl -X POST https://ever-reach-be.vercel.app/api/v1/events/meta \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "ViewContent",
    "userData": {"email": "test@example.com"},
    "customData": {"contentName": "Test Page"}
  }'
```

---

## 7. Deployment Checklist

### Backend Team Actions
- [ ] Add env vars to Vercel (`ever-reach-be`)
- [ ] Run `npm install` in `backend-vercel/`
- [ ] Deploy backend
- [ ] Remove `META_TEST_EVENT_CODE` for production
- [ ] Verify events in Facebook Events Manager

### Optional Enhancements
- [ ] Add server-side tracking in Stripe webhook
- [ ] Add tracking in waitlist signup endpoint
- [ ] Implement Meta Parameter Builder SDK for advanced fbc handling

---

## 8. Expected Results

### Current State
- **EMQ Score:** 4.4/10
- **Missing Parameters:** fbc, email, IP address

### After Implementation
- **Expected EMQ:** 7.0+
- **Parameters Now Sent:**
  - ✅ fbc (Facebook Click ID)
  - ✅ fbp (Facebook Browser ID)
  - ✅ client_ip_address
  - ✅ client_user_agent
  - ✅ em (hashed email)
  - ✅ external_id (hashed user ID)

### Impact
- **100%+ median increase** in additional conversions reported (per Meta)
- Better ad targeting and attribution
- Lower cost per acquisition (CPA)

---

## 9. Architecture

### Event Flow

```
User Action (Frontend)
    ↓
Generate eventId
    ↓
    ├─→ Client Pixel (fbq) ─────────→ Meta (browser)
    │   - Fires immediately
    │   - Uses eventId
    │
    └─→ Server API Call ─────────────→ Backend ─────────→ Meta (server)
        - POST /api/v1/events/meta      - Hashes PII
        - Includes userData              - Adds IP/UA
        - Uses same eventId              - Sends to Graph API
```

### Deduplication
Both client and server events use the same `eventId`, allowing Meta to deduplicate and use the best available data from both sources.

---

## 10. Key Learnings

1. **fbc is critical** - Must capture `fbclid` from URL early and persist to cookie
2. **Server-side IP matters** - Significantly improves match quality
3. **Deduplication works** - Same `eventId` allows Meta to merge client + server data
4. **Hashing is required** - All PII must be SHA-256 hashed before sending
5. **Test mode is helpful** - `META_TEST_EVENT_CODE` allows testing without affecting live data

---

## 11. References

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Parameter Builder Library](https://developers.facebook.com/docs/marketing-api/conversions-api/parameter-builder-library)
- [Event Match Quality Guide](https://www.facebook.com/business/help/765081237991954)
- [Deduplication Best Practices](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)

---

## 12. Git History

### Commit 1: `9303cd69`
**feat: Add Meta Conversions API server-side event tracking**
- Created PRD document
- Added backend Conversions API client
- Added API endpoint `/api/v1/events/meta`
- Added frontend helper with dual tracking
- Integrated into subscription-plans.tsx and auth.tsx

### Commit 2: `996d2437`
**feat: Improve Meta Event Match Quality (EMQ) score**
- Added facebook-nodejs-business-sdk
- Added early fbc capture on page load
- Save fbc to cookie (90 days persistence)
- Added initializeFbcCapture() to app initialization

### Commit 3: `58bd2f01`
**docs: Add backend setup guide for Meta Conversions API**
- Created BACKEND_META_CONVERSIONS_SETUP.md
- Added tracking to contact import flow
- Added tracking to voice note creation

---

## Next Steps

1. **Deploy to Production**
   - Add env vars to Vercel backend
   - Deploy and verify events

2. **Monitor EMQ Score**
   - Check Facebook Events Manager after 24-48 hours
   - Target 7.0+ score

3. **Optional Enhancements**
   - Add server-side tracking in Stripe webhook for accurate purchase attribution
   - Implement Parameter Builder SDK for advanced fbc/fbp handling
   - Add tracking to more user flows (waitlist, etc.)

4. **Performance Monitoring**
   - Monitor API response times
   - Check error rates in Vercel logs
   - Verify deduplication is working correctly
