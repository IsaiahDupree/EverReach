# PRD: Meta Conversions API Server-Side Events

## Overview

Implement Facebook/Meta server-side event tracking via the Conversions API to improve ad attribution accuracy and enable better campaign optimization for EverReach.

## Problem Statement

Client-side pixel tracking has limitations:
- Ad blockers can prevent pixel firing
- iOS App Tracking Transparency reduces accuracy
- Browser privacy features limit cookie tracking

Server-side events provide:
- More reliable event delivery
- Better data matching with hashed user data
- Improved attribution for iOS 14.5+ users

## Goals

1. Track key conversion events server-side for accurate attribution
2. Enable Facebook to optimize ad delivery based on real conversions
3. Maintain user privacy by hashing PII before transmission
4. Support both client-side (pixel) and server-side (Conversions API) tracking

## Technical Configuration

| Variable | Value |
|----------|-------|
| Pixel ID | `1191876055285693` |
| Conversions API Token | `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN` (in .env) |
| Test Event Code | `TEST6473` |
| API Version | `v21.0` |

## Events to Implement

### Tier 1: Revenue Events (Critical)

| Event | Trigger Point | Value | Custom Data |
|-------|---------------|-------|-------------|
| `Purchase` | Successful subscription payment | Subscription price | `content_name`: plan name, `currency`: USD |
| `Subscribe` | Subscription activated | Monthly/Annual price | `billing_period`, `plan_tier` |
| `StartTrial` | Free trial begins | 0 | `trial_days`: 7 |

### Tier 2: Funnel Events (High Priority)

| Event | Trigger Point | Custom Data |
|-------|---------------|-------------|
| `Lead` | Waitlist signup | `content_name`: "Waitlist" |
| `CompleteRegistration` | Account created | `registration_method`: email/oauth |
| `InitiateCheckout` | Checkout flow started | `plan_name`, `price` |
| `AddPaymentInfo` | Payment method added | `payment_type`: card/apple_pay |

### Tier 3: Engagement Events (Medium Priority)

| Event | Trigger Point | Custom Data |
|-------|---------------|-------------|
| `ViewContent` | Pricing page viewed | `content_name`: "Pricing" |
| `ContactImported` (custom) | First contact import | `contact_count` |
| `VoiceNoteCreated` (custom) | First voice note | - |

## User Data (Hashed)

All PII must be SHA-256 hashed before sending:

| Field | Source | Required |
|-------|--------|----------|
| `em` | User email | Yes (if available) |
| `fn` | First name | Optional |
| `ln` | Last name | Optional |
| `ph` | Phone number | Optional |
| `client_user_agent` | Browser user agent | Yes |
| `fbc` | Facebook click ID (from URL/cookie) | If available |
| `fbp` | Facebook browser ID (from cookie) | If available |

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React Native)                │
├─────────────────────────────────────────────────────────────┤
│  User Action (signup, purchase, etc.)                       │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Client Pixel    │    │ API Call to     │                │
│  │ (fbq track)     │    │ Backend         │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            ▼                      ▼
    Facebook Pixel           Backend Server
    (client-side)           (Vercel Functions)
                                   │
                                   ▼
                            ┌─────────────────┐
                            │ Conversions API │
                            │ (server-side)   │
                            └─────────────────┘
```

## Implementation Files

### New/Modified Files

1. **`lib/metaConversions.ts`** - Server-side event helper functions
2. **`backend-vercel/lib/meta-conversions.ts`** - Backend Conversions API client
3. **`backend-vercel/app/api/v1/events/meta/route.ts`** - API endpoint for server events

### Integration Points

| Flow | File | Event |
|------|------|-------|
| Signup | `providers/AuthProvider.tsx` | `CompleteRegistration` |
| Trial Start | `providers/SubscriptionProvider.tsx` | `StartTrial` |
| Checkout | `app/subscription-plans.tsx` | `InitiateCheckout` |
| Purchase | `backend-vercel/app/api/v1/billing/*/webhook` | `Purchase`, `Subscribe` |
| Waitlist | `backend-vercel/app/api/v1/waitlist/route.ts` | `Lead` |
| Pricing View | `app/subscription-plans.tsx` | `ViewContent` |

## Event Payload Structure

```typescript
interface MetaServerEvent {
  event_name: string;
  event_time: number; // Unix timestamp
  event_id: string;   // Unique ID for deduplication
  event_source_url: string;
  action_source: 'website' | 'app';
  user_data: {
    em?: string;      // Hashed email
    fn?: string;      // Hashed first name
    client_user_agent: string;
    fbc?: string;     // Facebook click ID
    fbp?: string;     // Facebook browser ID
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_ids?: string[];
    [key: string]: any;
  };
}
```

## Deduplication Strategy

To prevent double-counting when both client and server events fire:
1. Generate a unique `event_id` for each event
2. Pass the same `event_id` to both client pixel and server API
3. Facebook will deduplicate based on `event_id` within 48 hours

## Testing

1. Use `TEST6473` test event code during development
2. Verify events in Facebook Events Manager → Test Events
3. Check for proper hashing of user data
4. Validate deduplication is working

## Privacy & Compliance

- All PII is hashed with SHA-256 before transmission
- No raw email/phone/names sent to Facebook
- User consent should be obtained (cookie banner)
- GDPR/CCPA compliant implementation

## Success Metrics

- Event Match Quality score > 6.0 in Events Manager
- Attribution accuracy improvement vs pixel-only
- Reduced "unknown" conversions in ad reporting

## Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| 1 | Backend Conversions API client | 1 hour |
| 2 | Revenue events (Purchase, Subscribe) | 1 hour |
| 3 | Funnel events (Lead, Registration) | 1 hour |
| 4 | Testing & validation | 30 min |

## References

- [Meta Conversions API Documentation](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Server Event Parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event)
- [Event Deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
