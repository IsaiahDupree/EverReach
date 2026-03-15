# Meta Ads Integration

Complete guide to Meta (Facebook) advertising integration with iOS app tracking, Conversions API, and privacy compliance.

## Overview

This starter kit includes production-ready Meta advertising integration with:

1. **Facebook SDK** (`react-native-fbsdk-next`) for native app events
2. **Conversions API (CAPI)** for server-side event tracking
3. **App Tracking Transparency (ATT)** compliance
4. **Event deduplication** via `event_id`
5. **Audit logging** to Supabase

Both the native SDK and CAPI feed into the same Meta Events Manager and support deduplication.

---

## Setup

### 1. Create Facebook App

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app → Select "Business" type
3. Note your **App ID** and **Client Token**
4. Under Settings → Basic, configure iOS bundle ID

### 2. Create Meta Pixel

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Create a new pixel for your app
3. Note your **Pixel ID**

### 3. Generate Conversions API Access Token

1. In Events Manager, open your pixel
2. Go to Settings → Conversions API
3. Click "Generate Access Token"
4. Copy the token (starts with `EAA...`)

### 4. Configure Environment Variables

Add to `.env`:

```bash
# Facebook SDK (native app events)
EXPO_PUBLIC_FB_APP_ID=453049510987286
EXPO_PUBLIC_FB_CLIENT_TOKEN=3206c77601ed76cd74b6276904c20548

# Meta Conversions API (server-side events)
EXPO_PUBLIC_META_PIXEL_ID=1234567890123456
META_CONVERSIONS_API_TOKEN=EAAxxxxxxxxxxxxx
```

Add to EAS Secrets:

```bash
npx eas secret:create --scope project --name META_CONVERSIONS_API_TOKEN --value EAAxxxxxxxxxxxxx
```

### 5. Update app.json

Replace placeholder values in `plugins.react-native-fbsdk-next`:

```json
{
  "plugins": [
    [
      "react-native-fbsdk-next",
      {
        "appID": "YOUR_FB_APP_ID",
        "clientToken": "YOUR_CLIENT_TOKEN",
        "displayName": "Your App Name",
        "scheme": "fb{YOUR_FB_APP_ID}",
        "advertiserIDCollectionEnabled": true,
        "autoLogAppEventsEnabled": true,
        "isAutoInitEnabled": true
      }
    ]
  ]
}
```

---

## App Tracking Transparency (ATT)

iOS 14.5+ requires user permission to track across apps/websites.

### When to Request Permission

```tsx
import { requestATTPermission, isTrackingAuthorized } from '@/lib/att-permission';

// Request on first launch (after onboarding recommended)
const status = await requestATTPermission();

// Check current status
const canTrack = await isTrackingAuthorized();
```

### Privacy-Compliant Data Collection

The Meta CAPI client (`lib/metaAppEvents.ts`) respects ATT:

- **Tracking Authorized**: Send hashed email, phone, name, location
- **Tracking Denied**: Only send anonymous `fbp` cookie

```tsx
import { setAdvertisingTrackingEnabled } from '@/lib/metaAppEvents';

// Update after ATT prompt
const canTrack = await isTrackingAuthorized();
setAdvertisingTrackingEnabled(canTrack);
```

### infoPlist Configuration

Already configured in `app.json`:

```json
{
  "ios": {
    "infoPlist": {
      "NSUserTrackingUsageDescription": "EverReach uses this to measure advertising effectiveness and personalize your experience. Your data is handled securely.",
      "ITSAppUsesNonExemptEncryption": false,
      "LSApplicationQueriesSchemes": [
        "fbapi",
        "fb-messenger-share-api",
        "fbauth2",
        "fbshareextension"
      ],
      "SKAdNetworkItems": [
        // 20 Meta attribution networks
      ]
    }
  }
}
```

---

## Standard Events

### 1. CompleteRegistration

User completes account registration.

```tsx
import { trackRegistration } from '@/lib/metaAppEvents';

await trackRegistration();
```

**Maps to:** `CompleteRegistration` event in Meta

---

### 2. StartTrial

User starts free trial.

```tsx
import { trackTrialStart } from '@/lib/metaAppEvents';

await trackTrialStart(trialDurationDays);
```

**Maps to:** `StartTrial` event in Meta

---

### 3. Subscribe / Purchase

User upgrades to paid subscription.

```tsx
import { trackPurchase } from '@/lib/metaAppEvents';

await trackPurchase(9.99, 'USD', {
  subscription_id: 'monthly_plan',
  content_name: 'Monthly Pro Plan',
});
```

**Maps to:** Both `Subscribe` and `Purchase` events (for optimization)

---

### 4. ViewContent

User views a screen or piece of content.

```tsx
import { trackContentView } from '@/lib/metaAppEvents';

await trackContentView('contact_detail', {
  contact_id: '123',
  content_name: 'John Doe',
});
```

**Maps to:** `ViewContent` event in Meta

---

### 5. Lead

User completes a lead form or becomes a qualified lead.

```tsx
import { trackLead } from '@/lib/metaAppEvents';

await trackLead('onboarding_form', 85); // Lead score optional
```

**Maps to:** `Lead` event in Meta

---

### 6. Contact

User sends a message or initiates contact.

```tsx
import { trackContact } from '@/lib/metaAppEvents';

await trackContact();
```

**Maps to:** `Contact` event in Meta

---

### 7. AddToWishlist

User creates a new relationship or saves an item.

```tsx
import { trackContactCreated } from '@/lib/metaAppEvents';

await trackContactCreated('manual');
```

**Maps to:** `AddToWishlist` event in Meta

---

### 8. Search

User performs a search.

```tsx
import { trackSearch } from '@/lib/metaAppEvents';

await trackSearch('john doe', 5); // Query and result count
```

**Maps to:** `Search` event in Meta

---

## User Identification

Identify users after authentication for better event matching:

```tsx
import { identifyMetaUser } from '@/lib/metaAppEvents';

await identifyMetaUser(
  userId,
  email,
  phone,
  {
    firstName: 'John',
    lastName: 'Doe',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'US',
  }
);
```

All values are hashed (SHA-256) before sending to Meta.

---

## Testing

### Test Events in Development

Events sent in `__DEV__` mode include a `test_event_code` that appears in Meta Events Manager → Test Events.

1. Start app in development mode
2. Trigger an event (e.g., registration)
3. Open [Meta Events Manager](https://business.facebook.com/events_manager)
4. Go to your pixel → Test Events tab
5. Verify event appears

### Production Testing

Before going live:

1. **Verify ATT prompt shows**: Test on physical device running iOS 14.5+
2. **Test with tracking denied**: Verify events still fire (without user data)
3. **Test with tracking authorized**: Verify `em`, `ph`, `fn`, `ln` parameters appear
4. **Check deduplication**: Same `event_id` should not create duplicate events

---

## App Store Privacy Declarations

When submitting to App Store, declare Meta data collection:

### Data Types Collected (when ATT authorized)

- **Email Address** (hashed) - Used for analytics
- **Phone Number** (hashed) - Used for analytics
- **Name** (hashed) - Used for analytics
- **Location** (city/state/country, hashed) - Used for analytics
- **Advertising Data** - For ad measurement

### Data Linked to User

Select "Yes" for:
- Email Address
- Phone Number
- Name
- Location

### Purpose

- **Analytics** - Measure app events and conversions
- **Product Personalization** - Improve user experience
- **Advertising** - Measure ad campaign performance

---

## Troubleshooting

### Events not appearing in Meta

1. **Check environment variables**: Verify `EXPO_PUBLIC_META_PIXEL_ID` and `META_CONVERSIONS_API_TOKEN` are set
2. **Check backend logs**: Review `/api/capi` endpoint logs in Vercel
3. **Verify pixel ID**: Ensure pixel ID matches Events Manager
4. **Check access token**: Token must have `ads_management` and `business_management` permissions

### ATT prompt not showing

1. **Device requirements**: iOS 14.5+ required
2. **Reset tracking**: Settings → Privacy → Tracking → Reset tracking permission
3. **Check infoPlist**: Verify `NSUserTrackingUsageDescription` is set

### Duplicate events

Events are deduplicated by `event_id` (UUID). If you see duplicates:

1. **Check client-side**: Ensure each event generates a unique UUID
2. **Check backend**: Verify `/api/capi` forwards `event_id` to Meta
3. **Meta delay**: Deduplication can take a few minutes to process

---

## Best Practices

1. **Request ATT early**: Show prompt after onboarding, not immediately on first launch
2. **Explain value**: Tell users why tracking helps (better experience, relevant features)
3. **Respect denial**: App should work fully even if tracking is denied
4. **Test both states**: Test with ATT authorized AND denied
5. **Monitor logs**: Check `meta_conversion_event` table for debugging
6. **Use standard events**: Don't create custom events unless absolutely necessary

---

## Security

- **API tokens**: Never commit `META_CONVERSIONS_API_TOKEN` to git
- **User data**: All PII is hashed (SHA-256) before sending
- **Server-side proxy**: Mobile app never sends API token (uses `/api/capi` proxy)
- **ATT compliance**: User data only sent when tracking is authorized

---

## Database Schema

Events are logged to `meta_conversion_event` table for debugging:

```sql
SELECT
  event_name,
  event_time,
  user_data->>'em' as hashed_email,
  custom_data,
  test_event_code
FROM meta_conversion_event
ORDER BY created_at DESC
LIMIT 10;
```

---

## References

- [Meta Conversions API Documentation](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Facebook SDK for React Native](https://github.com/thebergamo/react-native-fbsdk-next)
- [App Tracking Transparency Guide](https://developer.apple.com/documentation/apptrackingtransparency)
- [Meta Events Manager](https://business.facebook.com/events_manager)
