# Meta Conversions API Integration Guide

## Overview

This document describes the Meta Conversions API (server-side events) integration for EverReach CRM. This enables accurate conversion tracking for attribution optimization and campaign performance measurement.

## Environment Variables

Add these to your `.env` file:

```
# Meta Pixel Configuration
EXPO_PUBLIC_META_PIXEL_ID=1191876055285693
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=your_access_token_here

# Optional: Test event code for development
EXPO_PUBLIC_META_TEST_EVENT_CODE=TEST6473
```

To get your access token:
1. Go to https://business.facebook.com/
2. Navigate to Settings → Data Sources → Conversions API
3. Create or select your Data Source
4. Click "Generate Access Token"

## API Endpoints

### Server-Side Event Submission

**Endpoint:** `POST /api/v1/events/meta`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "eventName": "Purchase",
  "eventId": "purchase_1712973600_abc123",
  "value": 99.99,
  "currency": "USD",
  "userData": {
    "email": "user@example.com",
    "phone": "15551234567",
    "firstName": "John",
    "lastName": "Doe",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US",
    "externalId": "user_123",
    "userAgent": "Mozilla/5.0...",
    "clientIp": "192.168.1.1",
    "fbp": "fb.1.123456789.987654321",
    "fbc": "fb.1.123456789.IwAR0..."
  },
  "customData": {
    "content_name": "Pro Plan",
    "content_type": "product"
  },
  "testEventCode": "TEST6473"
}
```

**Response:**
```json
{
  "success": true,
  "eventsReceived": 1
}
```

## Supported Events

### Tier 1: Revenue Events (Critical)

| Event | Trigger | Custom Data |
|-------|---------|-------------|
| `Purchase` | Successful subscription payment | Plan name, billing period |
| `Subscribe` | Subscription activated | Plan tier, billing period |
| `StartTrial` | Free trial begins | Trial days |

### Tier 2: Funnel Events (High Priority)

| Event | Trigger | Custom Data |
|-------|---------|-------------|
| `Lead` | Waitlist signup | Source, campaign |
| `CompleteRegistration` | Account created | Method (email/oauth) |
| `InitiateCheckout` | Checkout started | Plan name, price |
| `AddPaymentInfo` | Payment method added | Payment type |

### Tier 3: Engagement Events (Medium Priority)

| Event | Trigger | Custom Data |
|-------|---------|-------------|
| `ViewContent` | Pricing page viewed | Content name |
| `ContactImported` | First contact import | Contact count |
| `VoiceNoteCreated` | First voice note | Duration |

## Integration Points

### 1. Stripe Webhook (Revenue Events)

When a user purchases or subscribes:
- ✅ Automatically sends `Purchase`, `Subscribe`, or `StartTrial` to Meta
- ✅ Hashes email for PII compliance
- ✅ Uses event deduplication ID

**File:** `app-kit/backend-vercel/app/api/webhooks/stripe/route.ts`

### 2. Frontend Events (Optional)

For client-side tracking:

```typescript
import { sendMetaEvent, normalizeUserData } from '@/lib/meta-conversions';

// Send event from frontend
const response = await fetch('/api/v1/events/meta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventName: 'ViewContent',
    eventId: 'view_' + Date.now() + '_' + Math.random(),
    userData: {
      email: user.email,
      externalId: user.id,
    },
    customData: {
      content_name: 'Pricing Page',
    },
  }),
});
```

## PII Hashing

All personally identifiable information (PII) is automatically hashed using SHA-256 before being sent to Meta. This includes:

- Email address
- Phone number (normalized, digits only)
- First name
- Last name
- City (lowercase, no spaces)
- State (2-letter code)
- ZIP code (first 5 digits)
- Country (2-letter code)

The hashing happens in `normalizeUserData()` function in `lib/meta-conversions.ts`.

## Event Deduplication

To prevent double-counting when both client and server events fire:

1. **Client-side:** Generate a unique event ID
   ```typescript
   const eventId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
   ```

2. **Server-side:** Use the same event ID when sending via CAPI
   ```typescript
   const eventId = generateEventId('purchase'); // Auto-generates unique ID
   ```

3. **Facebook:** Automatically deduplicates based on event_id within 48 hours

## Testing

### CLI Test Script

```bash
cd app-kit
node scripts/test-meta-pixel.mjs
```

To test a specific event:
```bash
node scripts/test-meta-pixel.mjs --event Purchase
```

### In Facebook Events Manager

1. Go to https://business.facebook.com/events_manager2
2. Select your Data Source
3. Go to "Test Events" tab
4. Look for your test event code (e.g., TEST6473)
5. Verify events appear with correct data

### Check Event Match Quality

1. In Events Manager, go to "Data Quality"
2. Look for Event Match Quality score > 6.0
3. Verify hashed user data is being matched correctly

## Debugging

### Missing Events

Check the browser console and Vercel function logs:
```bash
vercel logs app-kit --follow
```

### Failed Events

Response error codes:
- `400` - Invalid parameters
- `401` - Invalid token
- `500` - Server error

Common issues:
- Missing `EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN`
- Invalid email format (before hashing)
- Test event code not matching

### Verify Token

```bash
curl "https://graph.facebook.com/v21.0/1191876055285693/events?fields=name&access_token=YOUR_TOKEN"
```

## Privacy & Compliance

### GDPR/CCPA Compliance

- ✅ All PII is hashed before transmission
- ✅ No raw email/phone sent to Facebook
- ✅ User consent should be obtained (existing cookie banner)
- ✅ IP addresses are anonymized

### iOS App Tracking Transparency (ATT)

For mobile apps:
- Check user's ATT consent status
- Only send IDFA if user grants permission
- Server-side events still work without IDFA

## Performance Metrics

Once integrated, track these in Meta Events Manager:

| Metric | Target |
|--------|--------|
| Event Match Quality | > 6.0 |
| Events Per Day | >= 50 |
| Conversion Rate | >= 2% |
| ROAS | >= 1.5x |

## Troubleshooting

### Q: Events aren't showing in Events Manager
**A:**
1. Verify token is correct
2. Check test event code matches
3. Wait 5-10 minutes for data to appear
4. Check browser console for fetch errors

### Q: Low Event Match Quality score
**A:**
1. Ensure email is being hashed correctly
2. Add more user data (first name, last name, city, state, zip)
3. Include `fbp` and `fbc` if available

### Q: Too many "unmatched" events
**A:**
1. Verify PII is normalized correctly (lowercase, trimmed)
2. Check phone number format (digits only)
3. Ensure external_id matches your system's user ID

## References

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Server Event Parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event)
- [Event Deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Hashed User Data](https://developers.facebook.com/docs/marketing-api/conversions-api/hashed-data)
