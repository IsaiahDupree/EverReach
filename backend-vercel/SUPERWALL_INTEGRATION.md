# Superwall + RevenueCat Integration

**Status**: ✅ **READY FOR DEPLOYMENT & TESTING**  
**Date**: October 31, 2025  
**API Key**: `pk_ACiUJ9wcjUecu-9D2eK3I`

---

## 📋 EverReach Information for Superwall Dashboard

### Supporting Email Information
**Support Email**: `info@everreach.app` or your actual support email

### Webhook URLs

#### **Superwall Webhook URL**
```
https://ever-reach-be.vercel.app/api/v1/billing/superwall/webhook
```

#### **App Store Server Notifications URL**  
(Use this for App Store Connect → App Information → App Store Server Notifications)
```
https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
```

#### **Google Play Store Notifications URL**
```
https://ever-reach-be.vercel.app/api/v1/webhooks/play
```

#### **RevenueCat Webhook URL** (Existing)
```
https://ever-reach-be.vercel.app/api/v1/billing/revenuecat/webhook
```

---

## 🏗️ Architecture

### Components

1. **Superwall Webhook Processing** (`lib/superwall-webhook.ts`)
   - HMAC SHA256 signature verification
   - 18+ Superwall event types supported
   - Automatic subscription sync with database
   - Idempotency for duplicate events
   - Analytics tracking

2. **Webhook Endpoint** (`app/api/v1/billing/superwall/webhook/route.ts`)
   - POST endpoint for Superwall webhooks
   - Development mode: allows testing without auth
   - Production: requires signature or auth token
   - 30-second timeout for long-running operations

3. **Unified Entitlements** (`app/api/v1/me/entitlements/route.ts`)
   - Merges data from Superwall + RevenueCat
   - Returns unified subscription status
   - Fallback to free tier on error

4. **Test Suite** (`test/backend/superwall-webhook.mjs`)
   - 10 comprehensive tests
   - All event types covered
   - Idempotency tests
   - Platform tests (iOS + Android)

---

## 📊 Supported Superwall Events

### Transaction Events
- ✅ `transaction.start` - Purchase initiated
- ✅ `transaction.complete` - Purchase successful
- ✅ `transaction.fail` - Purchase failed
- ✅ `transaction.abandon` - User abandoned purchase flow
- ✅ `transaction.restore` - Restored previous purchase

### Subscription Events
- ✅ `subscription_status.did_change` - Status changed
- ✅ `subscription.renew` - Subscription renewed
- ✅ `subscription.cancel` - Subscription canceled
- ✅ `subscription.expire` - Subscription expired
- ✅ `subscription.billing_issue` - Billing problem

### Trial Events
- ✅ `trial.start` - Trial started
- ✅ `trial.convert` - Trial converted to paid
- ✅ `trial.cancel` - Trial canceled

### Paywall Events (Analytics)
- ✅ `paywall.open` - Paywall displayed
- ✅ `paywall.close` - Paywall closed
- ✅ `paywall.decline` - User declined purchase

---

## 🔐 Security Configuration

### Environment Variables

Add these to your Vercel project settings:

```bash
# Superwall Configuration
SUPERWALL_API_KEY=pk_ACiUJ9wcjUecu-9D2eK3I
SUPERWALL_WEBHOOK_SECRET=<your_webhook_secret_from_superwall>
SUPERWALL_WEBHOOK_AUTH_TOKEN=<optional_bearer_token>

# Existing RevenueCat (keep these)
REVENUECAT_WEBHOOK_SECRET=<existing>
REVENUECAT_SECRET_KEY=<existing>
REVENUECAT_WEBHOOK_AUTH_TOKEN=<existing>
```

### Webhook Signature Verification

Superwall signs webhooks with HMAC SHA256. The signature is sent in the `X-Superwall-Signature` header.

**To generate webhook secret:**
1. Go to Superwall Dashboard → Settings → Webhooks
2. Click "Generate Secret"
3. Copy the secret to `SUPERWALL_WEBHOOK_SECRET` env var

---

## 🧪 Testing

### Run Comprehensive Test Suite

```bash
# Run all Superwall webhook tests (10 tests)
node test/backend/superwall-webhook.mjs

# Run with specific API base
API_BASE=https://ever-reach-be.vercel.app node test/backend/superwall-webhook.mjs
```

### Test Coverage

1. ✅ Transaction Complete (New Subscription)
2. ✅ Trial Start
3. ✅ Subscription Renewal
4. ✅ Subscription Cancellation
5. ✅ Paywall Events (Non-Subscription)
6. ✅ Idempotency (Duplicate Event Detection)
7. ✅ Android Platform Support
8. ✅ Subscription Expire
9. ✅ Invalid Event Rejection
10. ✅ Entitlements Integration

### Manual Testing

```bash
# Test webhook endpoint directly
curl -X POST https://ever-reach-be.vercel.app/api/v1/billing/superwall/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "event_name": "transaction.complete",
    "timestamp": "2025-10-31T22:00:00Z",
    "user_id": "test_user_123",
    "subscription": {
      "id": "sub_123",
      "product_id": "com.everreach.pro.monthly",
      "status": "active",
      "period_type": "normal",
      "purchased_at": "2025-10-31T22:00:00Z",
      "current_period_end": "2025-11-30T22:00:00Z",
      "platform": "ios",
      "environment": "production"
    }
  }'
```

---

## 🚀 Deployment Steps

### 1. Configure Superwall Dashboard

1. **Add Webhook URL**
   - Go to Superwall Dashboard → Settings → Webhooks
   - Add URL: `https://ever-reach-be.vercel.app/api/v1/billing/superwall/webhook`
   - Select ALL events to track
   - Generate and save webhook secret

2. **Configure SDK**
   ```swift
   // iOS (Swift)
   import Superwall
   
   Superwall.configure(
       apiKey: "pk_ACiUJ9wcjUecu-9D2eK3I",
       userId: currentUserId // Your backend user ID
   )
   ```

   ```kotlin
   // Android (Kotlin)
   import com.superwall.sdk.Superwall
   
   Superwall.configure(
       application = this,
       apiKey = "pk_ACiUJ9wcjUecu-9D2eK3I",
       userId = currentUserId
   )
   ```

### 2. Configure App Store Connect

1. Go to App Store Connect → Your App → App Information
2. Scroll to "App Store Server Notifications"
3. Add Production URL:
   ```
   https://ever-reach-be.vercel.app/api/v1/webhooks/app-store
   ```
4. Test the connection

### 3. Configure Google Play Console

1. Go to Google Play Console → Your App → Monetization Setup
2. Add Real-time Developer Notifications:
   ```
   https://ever-reach-be.vercel.app/api/v1/webhooks/play
   ```
3. Ensure Cloud Pub/Sub topic is configured

### 4. Add Environment Variables to Vercel

```bash
vercel env add SUPERWALL_API_KEY
vercel env add SUPERWALL_WEBHOOK_SECRET
vercel env add SUPERWALL_WEBHOOK_AUTH_TOKEN
```

### 5. Deploy Backend

```bash
# Deploy to production
vercel --prod

# Or let GitHub Actions deploy automatically
git push origin main
```

### 6. Run Tests

```bash
# After deployment, run comprehensive tests
node test/backend/superwall-webhook.mjs
```

---

## 📊 Database Schema

Uses existing `user_subscriptions` table (shared with RevenueCat):

```sql
-- Already exists from RevenueCat migration
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  original_transaction_id TEXT NOT NULL UNIQUE,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  
  status TEXT CHECK (status IN ('trial', 'active', 'canceled', 'expired', 'refunded')),
  platform TEXT CHECK (platform IN ('app_store', 'play')),
  environment TEXT CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
  
  purchased_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  last_event_id TEXT,
  last_event_type TEXT,
  last_event_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Events stored in `revenuecat_webhook_events` (supports both systems):

```sql
CREATE TABLE revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY, -- Prefixed with 'sw_' for Superwall, 'rc_' for RevenueCat
  event_type TEXT NOT NULL,
  app_user_id TEXT NOT NULL,
  product_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Data Flow

### Superwall → Backend

1. User completes purchase in Superwall paywall
2. Superwall sends webhook to `/api/v1/billing/superwall/webhook`
3. Backend verifies signature
4. Backend updates `user_subscriptions` table
5. Backend stores event in `revenuecat_webhook_events` for idempotency
6. User's next API call to `/api/v1/me/entitlements` returns updated status

### RevenueCat → Backend

1. RevenueCat receives store notification (App Store or Google Play)
2. RevenueCat sends webhook to `/api/v1/billing/revenuecat/webhook`
3. Backend processes and updates `user_subscriptions`
4. Events merged with Superwall events

### App → Backend

```
Mobile App
  ↓
GET /api/v1/me/entitlements
  ↓
Backend checks user_subscriptions
  ↓
Returns unified status from Superwall + RevenueCat
```

---

## 🎯 Next Steps

1. ✅ **Backend Integration Complete**
   - Webhook endpoint created
   - Event processing implemented
   - Tests written

2. ⏳ **Configure Superwall Dashboard**
   - Add webhook URL
   - Generate webhook secret
   - Select ALL events

3. ⏳ **Add Environment Variables**
   - `SUPERWALL_API_KEY`
   - `SUPERWALL_WEBHOOK_SECRET`

4. ⏳ **Deploy to Production**
   - `vercel --prod`

5. ⏳ **Run Tests**
   - `node test/backend/superwall-webhook.mjs`

6. ⏳ **Monitor Webhooks**
   - Check Vercel logs for webhook events
   - Verify subscription updates in database

---

## 📈 Monitoring

### Webhook Logs

```bash
# View Superwall webhook logs in Vercel
vercel logs --follow | grep Superwall
```

### Check Subscription Status

```bash
# Via API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ever-reach-be.vercel.app/api/v1/me/entitlements
```

### Database Queries

```sql
-- Check recent Superwall events
SELECT event_id, event_type, app_user_id, created_at
FROM revenuecat_webhook_events
WHERE event_id LIKE 'sw_%'
ORDER BY created_at DESC
LIMIT 20;

-- Check active subscriptions
SELECT user_id, product_id, status, platform, current_period_end
FROM user_subscriptions
WHERE status IN ('trial', 'active')
ORDER BY updated_at DESC;
```

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct in Superwall dashboard
2. Verify environment variables are set in Vercel
3. Check Vercel function logs for errors
4. Test with manual curl request

### Signature Verification Failing

1. Ensure `SUPERWALL_WEBHOOK_SECRET` matches dashboard
2. Check header name is `X-Superwall-Signature`
3. Verify payload is not modified before verification

### Subscription Not Updating

1. Check event type is in subscription events list
2. Verify event has `subscription` or `transaction` data
3. Check database for duplicate event_id
4. Review Vercel logs for processing errors

---

## 📞 Support

- **Superwall Docs**: https://superwall.com/docs
- **RevenueCat Docs**: https://docs.revenuecat.com
- **Backend Issues**: Check Vercel logs and GitHub issues

---

## ✅ Checklist

- [x] Superwall webhook processing library created
- [x] Webhook endpoint implemented
- [x] Comprehensive test suite (10 tests)
- [x] Documentation complete
- [ ] Environment variables configured
- [ ] Superwall dashboard configured
- [ ] Deployed to production
- [ ] Tests passing
- [ ] Monitoring active
