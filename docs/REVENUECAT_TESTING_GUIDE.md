# RevenueCat Payment Testing Guide

## Overview
This guide walks through testing in-app purchases with RevenueCat on iOS simulator and real devices.

---

## Prerequisites

### 1. Xcode & StoreKit Configuration File
- ✅ **StoreKit Config**: `ios/EverReach.storekit` already exists with:
  - Monthly subscription: `com.everreach.core.monthly` ($14.99/month, 1 week free trial)
  - Annual subscription: `com.everreach.core.yearly` ($149.99/year, 1 week free trial)

### 2. RevenueCat Configuration
- iOS Public SDK Key: `appl_vFMuKNRSMlJOSINeBHtjivpcZNs`
- Offering ID: `default`
- Entitlement ID: `EverReach Core`
- Products configured in RevenueCat dashboard matching StoreKit config

### 3. Environment Variables
Ensure `.env` contains:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_vFMuKNRSMlJOSINeBHtjivpcZNs
```

---

## Testing Options

### Option 1: iOS Simulator (StoreKit Testing) ⭐ RECOMMENDED FOR QUICK TESTING

#### Setup Xcode StoreKit Testing
1. Open the project in Xcode:
   ```bash
   cd ios
   open EverReach.xcworkspace
   ```

2. **Enable StoreKit Configuration**:
   - In Xcode menu: **Product** → **Scheme** → **Edit Scheme...**
   - Select **Run** (left sidebar)
   - Go to **Options** tab
   - Under **StoreKit Configuration**, select `EverReach.storekit`
   - Click **Close**

3. **Build and run** from Xcode or via command line:
   ```bash
   npx expo run:ios
   ```

#### Testing Flow (Simulator)
1. **Navigate to Subscription Plans**:
   - Open app → Settings → Subscription → View Plans
   - OR: Go to Settings → Manage Billing

2. **View Available Plans**:
   - Should see two subscription options:
     - Monthly: $14.99/month (1 week free)
     - Annual: $149.99/year (1 week free)

3. **Test Purchase Flow**:
   ```
   1. Tap "Subscribe" on Monthly or Annual plan
   2. iOS payment sheet appears (StoreKit)
   3. Tap "Subscribe" in the sheet
   4. Confirmation appears (no real Apple ID needed in simulator)
   5. App should update to show "Subscribed" status
   6. Check Settings → should show active subscription
   ```

4. **Verify in App**:
   - Check subscription status in Settings
   - Verify premium features are unlocked
   - Look for "Pro" or "Core" badge

5. **Check Logs**:
   ```
   - Look for: "[RevenueCat] Purchase successful"
   - Look for: "[Subscription] Entitlements updated"
   - Check console for any errors
   ```

#### Managing Test Subscriptions (Simulator)
- **View Active Subscriptions**:
  - Xcode menu: **Debug** → **StoreKit** → **Manage Transactions**
  - Shows all test purchases
  
- **Expire Subscription**:
  - In Manage Transactions, select subscription
  - Right-click → **Expire Subscription**
  - Useful for testing renewal/expiration flows

- **Refund Test Purchase**:
  - In Manage Transactions, select transaction
  - Right-click → **Refund Purchase**
  - Tests refund webhook handling

- **Clear All Purchases**:
  - Xcode menu: **Debug** → **StoreKit** → **Delete All Transactions**
  - Resets to clean state

---

### Option 2: Real iOS Device (Sandbox Testing)

#### Setup Apple Sandbox Tester
1. **Create Sandbox Test User**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Navigate to: **Users and Access** → **Sandbox**
   - Click **+** to create new tester
   - Use a unique email (can be fake: `test+everreach1@example.com`)
   - Remember the password

2. **Sign Out of Production Apple ID on Device**:
   - Settings → [Your Name] → **Sign Out** (or scroll to bottom)
   - This is important - sandbox and production can't mix

3. **Build and Install on Device**:
   ```bash
   npx expo run:ios --device
   ```

4. **First Purchase Flow**:
   - When you tap "Subscribe" for the first time
   - iOS will prompt: "Sign In to iTunes Store"
   - Enter your sandbox tester email and password
   - Complete purchase

#### Sandbox Testing Features
- **Accelerated Renewals**: Subscriptions renew much faster in sandbox:
  - 1 month → renews every 5 minutes
  - 1 year → renews every 1 hour
  - Useful for testing renewal webhooks

- **Automatic Test Scenarios**:
  - Purchase completes instantly (no real payment)
  - Can test cancellations and refunds via App Store Connect

#### Reset Sandbox Testing
- Delete app from device
- Settings → App Store → Sandbox Account → Sign Out
- Reinstall and sign in with different sandbox tester

---

### Option 3: TestFlight (Pre-Production)

#### When to Use TestFlight
- Testing with real users before public launch
- Verifying production-like behavior
- Beta testing subscription flows

#### Setup
1. **Upload build to App Store Connect**:
   ```bash
   eas build --platform ios --profile production
   ```

2. **Add TestFlight testers**:
   - App Store Connect → TestFlight → **Add Testers**
   - Invite via email

3. **Testers Install via TestFlight App**:
   - Download TestFlight from App Store
   - Accept invitation
   - Install EverReach

#### TestFlight Notes
- Uses real App Store environment (sandbox mode)
- Testers need sandbox Apple ID
- All features work as in production

---

## Testing Checklist

### Basic Purchase Flow
- [ ] Monthly plan displays correct price and features
- [ ] Annual plan displays correct price and features
- [ ] Free trial shows "1 week free" correctly
- [ ] Tap "Subscribe" opens payment sheet
- [ ] Payment sheet shows correct product details
- [ ] Purchase completes successfully
- [ ] Subscription status updates in app
- [ ] Premium features unlock immediately

### Subscription Management
- [ ] Restore Purchases button works
- [ ] Active subscription shows in Settings
- [ ] Subscription end date displays correctly
- [ ] "Manage Subscription" opens correct settings

### Error Scenarios
- [ ] Cancel during payment → no charge, stays free
- [ ] Network error during purchase → retry works
- [ ] Already subscribed → shows "Already Subscribed"
- [ ] Expired trial → purchase without trial works

### Backend Integration
- [ ] Webhook receives `initial_purchase` event
- [ ] Entitlements API returns correct status
- [ ] Subscription status syncs to user profile
- [ ] Trial period tracked correctly

---

## Common Issues & Solutions

### Issue: "Failed to fetch offerings"
**Cause**: RevenueCat not initialized or wrong API key

**Fix**:
1. Check `.env` has correct `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
2. Verify key in RevenueCat dashboard (Project Settings → API Keys)
3. Rebuild app: `npx expo run:ios`

### Issue: "Products not found"
**Cause**: Product IDs mismatch between StoreKit config and RevenueCat

**Fix**:
1. Verify `ios/EverReach.storekit` has correct product IDs:
   - `com.everreach.core.monthly`
   - `com.everreach.core.yearly`
2. Check RevenueCat dashboard: **Products** section
3. Ensure offering `default` contains both packages

### Issue: Payment sheet doesn't appear
**Cause**: StoreKit config not enabled in Xcode

**Fix**:
1. Xcode: **Product** → **Scheme** → **Edit Scheme**
2. **Run** → **Options** tab
3. Select `EverReach.storekit` under StoreKit Configuration

### Issue: "Purchase Error: Invalid Product ID"
**Cause**: App Store Connect products not synced to RevenueCat

**Fix**:
1. Wait 24 hours after creating products in App Store Connect
2. RevenueCat: **Products** → click "Sync with App Store"
3. Verify products show as "Synced"

### Issue: Subscription doesn't unlock features
**Cause**: Entitlements not checking correctly

**Fix**:
1. Check console logs for entitlement status
2. Verify `SubscriptionProvider` is initialized
3. Check `useSubscription()` hook returns `isPaid: true`
4. Debug entitlements API: `GET /api/v1/me/entitlements`

---

## Quick Test Script

```bash
# 1. Clean build
rm -rf ios/build
npx expo run:ios

# 2. Navigate in app
# Settings → View Plans → Subscribe to Monthly

# 3. Check logs
# Look for: "[RevenueCat] Offering fetched successfully"
# Look for: "[RevenueCat] Purchase successful"

# 4. Verify status
# Settings → should show "EverReach Core (Active)"

# 5. Test restore
# Delete app, reinstall, tap "Restore Purchases"
# Should restore subscription without re-purchase
```

---

## Debugging Commands

### View RevenueCat Customer Info
```bash
# In app console, after initialization:
import Purchases from 'react-native-purchases';
const info = await Purchases.getCustomerInfo();
console.log('Customer Info:', JSON.stringify(info, null, 2));
```

### Check Active Entitlements
```bash
# In app:
const { isPaid } = useSubscription();
console.log('Is Paid?', isPaid);
```

### Backend Check
```bash
# Check user entitlements via API:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.vercel.app/api/v1/me/entitlements
```

---

## RevenueCat Dashboard Monitoring

### Real-Time Testing View
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Select **EverReach** project
3. Navigate to **Customers**
4. Search by email or user ID
5. View purchase history and entitlements

### Useful Dashboard Pages
- **Overview**: Active subscribers, revenue, churn
- **Customers**: Individual customer details
- **Products**: Product configuration and sync status
- **Charts**: Conversion rates, trial-to-paid
- **Webhooks**: Event logs for debugging

---

## Next Steps After Testing

### 1. Verify Backend Integration
- [ ] Webhook endpoint receives events
- [ ] Entitlements stored in database
- [ ] User profile shows subscription status

### 2. Test All Flows
- [ ] New subscription
- [ ] Free trial → paid
- [ ] Subscription renewal
- [ ] Subscription cancellation
- [ ] Refund handling
- [ ] Restore purchases

### 3. Production Readiness
- [ ] Real products created in App Store Connect
- [ ] RevenueCat production keys configured
- [ ] Privacy policy and terms accessible
- [ ] Account deletion flow implemented
- [ ] Support email configured

---

## Resources

- **RevenueCat Docs**: https://docs.revenuecat.com/
- **StoreKit Testing Guide**: https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode
- **App Store Connect**: https://appstoreconnect.apple.com/
- **RevenueCat Dashboard**: https://app.revenuecat.com/

---

## Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Review RevenueCat Customer page for user-specific issues
3. Verify webhook events in RevenueCat dashboard
4. Contact RevenueCat support via dashboard chat
