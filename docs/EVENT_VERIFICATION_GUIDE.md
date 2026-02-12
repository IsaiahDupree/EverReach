# Event Verification Guide — End-to-End Testing

How to verify that Meta and RevenueCat events fire correctly from both the
test page and real user actions.

---

## Quick Start

```bash
# Terminal 1: Meta event monitor (intercepts client → Meta CAPI)
node scripts/meta-event-monitor.mjs

# Terminal 2: RevenueCat webhook monitor (intercepts RC → your backend)
node scripts/revenuecat-event-monitor.mjs

# Terminal 3: Run the app
npx expo start
```

---

## 1. Verify via Meta Pixel Test Screen (in-app)

The app includes a built-in test screen at `/meta-pixel-test`.

### Steps:
1. Open the app → navigate to **Meta Pixel Test** (dev menu or direct URL)
2. Tap each event button (PageView, Purchase, StartTrial, etc.)
3. Each button sends an event directly to Meta's Conversions API
4. The screen shows ✅/❌ for each event + Meta's response

### What to check:
- `events_received: 1` in the response
- No error codes (especially `#270` = token issue)
- `fbtrace_id` is returned (means Meta processed it)

### With monitor mode:
1. Start the monitor: `node scripts/meta-event-monitor.mjs`
2. In the test screen, enable **"Send via Monitor"** toggle
3. Events route through `localhost:3456` → you see full payloads in terminal
4. Monitor forwards to Meta and shows the response

---

## 2. Verify via Meta Events Manager

### Test Events Tab:
1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Select your pixel → **Test Events** tab
3. Test event code: `TEST48268`
4. Fire events from the app or test screen
5. Events appear in real-time (1-2 min delay)

### What to check:
- Event name matches (Purchase, StartTrial, CompleteRegistration, etc.)
- `custom_data` includes expected fields (value, currency, content_name)
- `user_data` match quality score (aim for >5 params)
- Event Match Quality (EMQ) score in the Overview tab

---

## 3. Verify Client-Side Events from Real User Actions

### Purchase Flow:
1. Open app → go to **Subscription Plans**
2. Select a plan → complete purchase (use sandbox/StoreKit testing)
3. **Expected events:**
   - `purchase_completed` → Meta **Purchase** (value, currency, plan)
   - `trial_started` → Meta **StartTrial** (if trial period detected)
   - `subscription_upgraded` → Meta **Subscribe**

### Auth Flow:
1. Sign out → sign up with a new email
2. **Expected event:**
   - `auth_sign_up` → Meta **CompleteRegistration** (method: email)

### Paywall View:
1. Trigger a feature gate (e.g., try to use a premium feature while on free tier)
2. **Expected event:**
   - `paywall_viewed` → Meta **ViewContent** (content_type: paywall)

### Contact Creation:
1. Add a new contact manually
2. **Expected event:**
   - `contact_created` → Meta **AddToWishlist**

### How to observe:
- **Terminal**: Run `node scripts/meta-event-monitor.mjs` with monitor mode enabled
- **Meta Events Manager**: Test Events tab (with test event code)
- **Console logs**: Look for `[MetaAppEvents]` and `[Analytics]` prefixes

---

## 4. Verify Server-Side Events (RevenueCat Webhooks)

### Using the RevenueCat Webhook Monitor:

```bash
# Monitor only (log events, don't forward to backend)
node scripts/revenuecat-event-monitor.mjs

# Monitor AND forward to your backend
node scripts/revenuecat-event-monitor.mjs --forward
```

The monitor listens on port `3457` and shows:
- Event type (INITIAL_PURCHASE, RENEWAL, etc.) with color coding
- User ID, product ID, period type, environment
- The Meta CAPI event that would be fired
- Trial conversion detection

### Testing with RevenueCat Sandbox:

1. Make a sandbox purchase in the iOS simulator (StoreKit Testing)
2. RevenueCat processes it and fires a webhook
3. Your backend receives it at `/api/webhooks/revenuecat`
4. The `processWebhookEvent()` function:
   - Updates Supabase `user_subscriptions` table
   - Calls `emitAll()` which fires `metaCAPIEmitter`
   - Meta CAPI receives the server-side event

### Testing with RevenueCat Dashboard:

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Find a test user → **Customer History**
3. You can see all subscription events
4. Cross-reference with Meta Events Manager

### Vercel Logs:

After deploying, check Vercel function logs for:
```
[MetaCAPI] Server-side event sent: { events_received: 1, count: 1 }
```

Or errors:
```
[MetaCAPI] Skipped (no credentials configured)
[MetaCAPI] Skipped sandbox event: initial_purchase
```

---

## 5. Verify with Jest Tests

```bash
# Client-side Meta pipeline tests (10 tests)
npx jest __tests__/lib/metaEventMappings.test.ts --no-coverage

# Server-side Meta CAPI emitter tests (15 tests)
npx jest __tests__/backend/emitters/meta-capi.test.ts --no-coverage

# All tests
npx jest --no-coverage --forceExit
```

### With real Meta credentials (live test):
```bash
# Set real creds to enable the live test
EXPO_PUBLIC_META_PIXEL_ID=10039038026189444 \
EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=EAAOhwk... \
npx jest __tests__/lib/metaEventMappings.test.ts --no-coverage
```

---

## 6. Verify with Playwright E2E Tests

```bash
# Requires Playwright installed
npx playwright test e2e/meta-pixel.spec.ts
```

These tests:
- Send all 7 standard events directly to Meta's API
- Verify `events_received: 1` for each
- Test both CLI-level and browser-context delivery

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `events_received: 0` | Invalid pixel ID or token | Check `.env` values |
| Error `#270` | Token has dev-level access | Regenerate from Events Manager → Settings → CAPI → Generate token |
| Events show in test but not production | Test event code still set | Remove `test_event_code` from payload |
| Duplicate Purchase events | Client + server both fire | Expected — Meta deduplicates by `event_id` (different IDs = both count) |
| No server-side events | Missing Vercel env vars | Add `META_PIXEL_ID` + `META_CONVERSIONS_API_TOKEN` to Vercel |
| `[MetaCAPI] Skipped sandbox event` | Sandbox purchases filtered | Expected — only PRODUCTION events forwarded |
| Low Event Match Quality | Missing user_data params | Check `identifyMetaUser()` is called after login |

---

## Scripts Reference

| Script | Port | Purpose |
|---|---|---|
| `scripts/meta-event-monitor.mjs` | 3456 | Proxy client Meta events, forward to CAPI, log everything |
| `scripts/revenuecat-event-monitor.mjs` | 3457 | Intercept RC webhooks, show Meta mapping, optionally forward |
| `scripts/push-vercel-env.mjs` | — | Push META_PIXEL_ID + token to Vercel env vars |
