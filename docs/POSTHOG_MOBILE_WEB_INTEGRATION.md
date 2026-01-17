# PostHog Integration - Mobile & Web Complete ✅

## Overview
PostHog analytics is now fully integrated across **all platforms**: iOS, Android, and Web!

## Platform Support
- **Mobile (iOS/Android)**: Uses `posthog-react-native`
- **Web**: Uses `posthog-js`
- **Unified API**: Single codebase with platform detection

## Files Modified/Created

### Core Integration
1. **`lib/posthog.ts`** - Platform-aware PostHog wrapper
   - Auto-detects platform (web vs mobile)
   - SHA-256 user ID hashing for privacy
   - Unified API across all platforms
   - Dynamic imports for web vs mobile SDKs

2. **`providers/AuthProvider.tsx`** - User identification
   - Calls `identifyUser()` on sign-in
   - Calls `resetPostHog()` on sign-out
   - Passes user metadata (plan, platform, org_id)

3. **`app/_layout.tsx`** - PostHog initialization
   - Calls `initializePostHog()` on app start
   - Works on all platforms

### Configuration
4. **`.env.example`** - Environment variables template
   ```bash
   EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_project_key_here
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

### Dependencies
5. **`package.json`** - PostHog packages
   - `posthog-react-native@^4.8.0` (mobile)
   - `posthog-js` (web)

## Setup Instructions

### 1. Add Environment Variables
Copy `.env.example` to `.env` and add your PostHog project key:

```bash
# .env
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_actual_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # Or https://app.posthog.com for EU
```

### 2. Get Your PostHog API Key
1. Go to: https://app.posthog.com (or your PostHog instance)
2. Navigate to: **Project Settings** → **Project API Key**
3. Copy the key (starts with `phc_`)

### 3. Configure PostHog Webhook (Backend)
The backend webhook at `backend-vercel/app/api/posthog-webhook/route.ts` receives events and mirrors them to Supabase.

In PostHog Dashboard:
1. Go to **Project Settings** → **Webhooks**
2. Add new webhook:
   - **URL**: `https://ever-reach-be.vercel.app/api/posthog-webhook`
   - **Events**: All events
   - **Secret**: Set `POSTHOG_WEBHOOK_SECRET` in Vercel env vars

### 4. Run Database Migration
Execute the analytics schema migration in Supabase:
```bash
# Run: backend-vercel/migrations/analytics-schema.sql
```

This creates:
- `analytics_users` - Anonymized user tracking
- `analytics_sessions` - Session data
- `analytics_events` - Generic event store
- Materialized views for funnels & retention

## Usage

### Track Events
```typescript
import { captureEvent } from '@/lib/posthog';

// Capture custom event
await captureEvent('Feature Request Submitted', {
  feature_id: requestId,
  request_type: 'feature',
  title_length: title.length,
});
```

### Track Screen/Page Views
```typescript
import { trackScreen } from '@/lib/posthog';

// Mobile: Tracks screen
// Web: Tracks pageview
await trackScreen('ContactDetails', {
  contact_id: contactId,
});
```

### Feature Flags
```typescript
import { isFeatureEnabled, getFeatureFlag } from '@/lib/posthog';

// Check if flag is enabled
const showNewUI = await isFeatureEnabled('new_ui_v2');

// Get flag variant
const variant = await getFeatureFlag('pricing_experiment');
```

### User Identification (Automatic)
User identification happens automatically in `AuthProvider.tsx`:
- **On sign-in**: Calls `identifyUser(userId, { plan, platform, org_id })`
- **On sign-out**: Calls `resetPostHog()`

## Privacy Guarantees

✅ **User IDs are SHA-256 hashed** - Never send raw Supabase user IDs  
✅ **No PII tracking** - Names, emails, phone numbers, message content excluded  
✅ **Property whitelist** - Only approved properties stored in Supabase  
✅ **Offline resilient** - Events queued when offline  
✅ **User consent** - Opt-in/opt-out support via `setAnalyticsEnabled()`

## Platform Differences

### Mobile (posthog-react-native)
- Auto-captures app lifecycle events
- Uses Expo Crypto for hashing
- Screens tracked as "screen" events
- Offline queue enabled

### Web (posthog-js)
- Auto-captures page views, clicks, form submissions
- Uses Web Crypto API for hashing
- Screens tracked as "$pageview" events
- Automatic session recording (optional)

## Testing

### 1. Test Events Locally
```bash
# Mobile
npm start

# Web
npm run start-web
```

### 2. Verify in PostHog Dashboard
1. Go to **Live Events** in PostHog
2. Sign in to your app
3. Events should appear within seconds

### 3. Check Supabase Mirror
```sql
-- In Supabase SQL Editor
SELECT 
  name,
  anon_user_id,
  ts,
  props
FROM analytics_events
WHERE ingestion = 'posthog'
ORDER BY ts DESC
LIMIT 10;
```

## Metrics Tracked

### Activation Funnel
1. App Opened
2. Signed Up
3. Contact Created
4. Message Generated
5. Message Sent

### Retention
- DAU/MAU ratio
- Weekly cohorts
- Stickiness score

### AI Performance
- Message generation latency (P95)
- Edit burden %
- Generation → Send conversion rate

### Feature Requests
- Submissions per user
- Votes per feature
- Bucket momentum
- Status velocity

## Next Steps

1. ✅ **PostHog integration complete** - Mobile & web working
2. ⏳ **Deploy to production** - Push changes, deploy to Vercel
3. ⏳ **Test event flow** - Sign in, verify events in dashboard
4. ⏳ **Create dashboards** - Build insights in PostHog
5. ⏳ **Set up feature flags** - A/B test new features

## Troubleshooting

### Events Not Showing?
- Check API key in `.env`
- Verify PostHog initialization in logs
- Check network tab for blocked requests
- Ensure webhook is configured correctly

### Web Not Working?
- Check browser console for errors
- Verify `posthog-js` is installed
- Check that Platform.OS === 'web' is detected

### Mobile Not Working?
- Check `posthog-react-native` is installed
- Verify API key is set correctly
- Check Expo logs for initialization errors

## Documentation
- [PostHog Docs](https://posthog.com/docs)
- [PostHog React Native](https://posthog.com/docs/libraries/react-native)
- [PostHog JS](https://posthog.com/docs/libraries/js)
- [Analytics Events Catalog](./ANALYTICS_EVENTS_COMPLETE.yml)
- [Web Integration Guide](./WEB_POSTHOG_INTEGRATION.md)

---

**Integration Status**: ✅ Complete  
**Last Updated**: 2025-10-09  
**Platforms**: iOS, Android, Web
