# RevenueCat Integration - Quick Start Guide

**Status**: ✅ **CODE COMPLETE - READY FOR DEPLOYMENT**

---

## 🎯 What We Built

Complete RevenueCat webhook integration for EverReach that:
- ✅ Mirrors subscription state from RevenueCat to our backend
- ✅ Supports all event types (purchase, renewal, cancellation, expiration, refund, etc.)
- ✅ Secure HMAC signature verification
- ✅ Idempotent (handles duplicate events)
- ✅ Works with both App Store and Google Play
- ✅ Automatically updates entitlements endpoint
- ✅ Comprehensive test suite (10 tests)

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20251026172100_revenuecat_subscriptions.sql` | Database schema (2 tables, helper functions) |
| `lib/revenuecat-webhook.ts` | Event processing logic |
| `app/api/v1/billing/revenuecat/webhook/route.ts` | Webhook endpoint |
| `app/api/v1/me/entitlements/route.ts` | Updated to use subscription data |
| `test/revenuecat-webhook.mjs` | 10 comprehensive E2E tests |
| `scripts/test-revenuecat-webhook.ps1` | Test runner |
| `REVENUECAT_IMPLEMENTATION.md` | Complete documentation (800 lines) |
| `REVENUECAT_QUICK_START.md` | This file |

**Total**: ~2,200 lines of code + docs

---

## 🚀 Deployment Steps

### 1. Apply Database Migration

```powershell
cd backend-vercel
npx supabase db push
```

**Or via SQL Editor** (if CLI fails):
1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new
2. Copy content from: `supabase/migrations/20251026172100_revenuecat_subscriptions.sql`
3. Paste and run

### 2. Configure RevenueCat Webhook

1. Go to: https://app.revenuecat.com → **Integrations** → **Webhooks**
2. Add new webhook:
   - **URL**: `https://ever-reach-be.vercel.app/api/v1/billing/revenuecat/webhook`
   - **Secret**: Generate and copy
3. Save webhook secret to `.env`:
   ```bash
   REVENUECAT_WEBHOOK_SECRET=your_secret_here
   ```

### 3. Deploy to Vercel

```powershell
# Option A: Via CLI
vercel --prod

# Option B: Via Git (auto-deploys)
git add -A
git commit -m "feat: RevenueCat webhook integration"
git push origin feat/backend-vercel-only-clean
```

### 4. Run Tests

```powershell
# Set webhook secret for tests
$env:REVENUECAT_WEBHOOK_SECRET = "your_secret_here"

# Run tests
.\scripts\test-revenuecat-webhook.ps1
```

### 5. Verify Webhook

1. Go to RevenueCat dashboard → Webhooks → Your webhook
2. Click **Send test event**
3. Select `INITIAL_PURCHASE`
4. Check response (should be 200 OK)
5. Verify in database:
   ```sql
   SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM revenuecat_webhook_events ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📊 What It Does

### Webhook Processing Flow

```
RevenueCat → [Webhook] → Verify Signature → Check Duplicate → Process Event → Update DB → Return 200 OK
```

### Supported Events

✅ `INITIAL_PURCHASE` - First purchase (trial or paid)  
✅ `RENEWAL` - Subscription renewed  
✅ `CANCELLATION` - User canceled (access until period end)  
✅ `EXPIRATION` - Subscription expired  
✅ `REFUND` - Purchase refunded (immediate access removal)  
✅ `PRODUCT_CHANGE` - Upgraded/downgraded  
✅ `UNCANCELLATION` - User reactivated

### Database Tables

**`user_subscriptions`**
- Stores current subscription state per user
- One record per user per platform (app_store or play)
- Updated on every webhook event

**`revenuecat_webhook_events`**
- Tracks processed event IDs (idempotency)
- Prevents duplicate processing
- Auto-cleanup after 48 hours

---

## 🧪 Testing

### Run All Tests

```powershell
.\scripts\test-revenuecat-webhook.ps1
```

### Test Coverage

1. ✅ Signature verification (valid, invalid, missing)
2. ✅ INITIAL_PURCHASE (trial)
3. ✅ RENEWAL
4. ✅ CANCELLATION  
5. ✅ EXPIRATION
6. ✅ REFUND
7. ✅ PRODUCT_CHANGE
8. ✅ Idempotency (duplicate events)
9. ✅ Invalid event data
10. ✅ Entitlements integration

### Expected Output

```
✅ Tests Passed: 10
Total: 10 tests
```

---

## 🔗 API Endpoints

### Webhook Endpoint

**POST** `/api/v1/billing/revenuecat/webhook`
- Receives RevenueCat events
- Verifies HMAC signature
- Updates subscription state
- Returns 200 OK on success

### Entitlements Endpoint (Updated)

**GET** `/v1/me/entitlements`
- Returns user's subscription tier and features
- Based on active subscription from RevenueCat
- Includes trial status, period end, payment platform

---

## 📱 Mobile Integration

### iOS Configuration

```swift
import RevenueCat

Purchases.configure(withAPIKey: "appl_YOUR_API_KEY", appUserID: userId)
```

### Android Configuration

```kotlin
Purchases.configure(
    PurchasesConfiguration.Builder(this, "goog_YOUR_API_KEY")
        .appUserID(userId)
        .build()
)
```

**Important**: Use EverReach user ID as `appUserID` so webhooks can match users!

---

## ✅ Verification Checklist

### Before Deployment
- [ ] Migration file created
- [ ] Webhook endpoint implemented
- [ ] Entitlements endpoint updated
- [ ] Tests written

### After Deployment
- [ ] Database migration applied
- [ ] RevenueCat webhook configured
- [ ] Webhook secret saved in `.env`
- [ ] Vercel deployment complete
- [ ] Tests passing
- [ ] Test webhook sent from RevenueCat dashboard
- [ ] Subscription data visible in database
- [ ] Entitlements endpoint returns correct data

---

## 🐛 Troubleshooting

### Webhook receives 401 (Invalid signature)
**Fix**: Check `REVENUECAT_WEBHOOK_SECRET` matches RevenueCat dashboard

### Subscription not updating
**Fix**: 
1. Check webhook URL is correct and accessible
2. Verify RLS policies allow service role to write
3. Check Vercel logs for errors

### Duplicate events creating errors
**Fix**: Ensure `revenuecat_webhook_events` table exists

### Tests failing
**Fix**:
1. Check `API_BASE` environment variable
2. Verify webhook secret matches
3. Ensure migration is applied

---

## 📞 Quick Commands

```powershell
# Apply migration
npx supabase db push

# Run tests
.\scripts\test-revenuecat-webhook.ps1

# Deploy to Vercel
vercel --prod

# Check logs
vercel logs --prod | Select-String "RevenueCat"

# Query subscriptions
# (Run in Supabase SQL Editor)
SELECT * FROM user_subscriptions WHERE user_id = 'your-user-id';
```

---

## 📚 Full Documentation

See `REVENUECAT_IMPLEMENTATION.md` for:
- Complete API reference
- Database schema details
- Mobile app integration guide
- Monitoring and debugging
- Status transition diagrams

---

**Status**: ✅ **CODE COMPLETE**  
**Next**: Deploy → Test → Integrate mobile apps  
**Estimated Time**: 30-60 minutes for full deployment
