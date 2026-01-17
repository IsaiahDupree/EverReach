# RevenueCat & Apple Sandbox Testing Guide

## 🎯 Objective
Test Apple App Store in-app purchases using RevenueCat SDK with Apple Sandbox environment.

## 📋 Prerequisites

### 1. Apple Sandbox Test Account
- Go to App Store Connect → Users and Access → Sandbox Testers
- Create a test account (or use existing)
- **Important**: Use a DIFFERENT email than your real Apple ID

### 2. Device Setup
- Sign OUT of your real Apple ID in Settings → App Store
- DO NOT sign in to sandbox account yet
- Sandbox prompt will appear during first purchase attempt

### 3. RevenueCat Dashboard Setup
- Products configured in RevenueCat dashboard
- Offerings created with packages
- iOS app bundle ID matches: `com.everreach.app`

## 🧪 Test Flow

### Phase 1: Verify Current Setup

#### 1.1 Check Subscription Status
**Path**: Settings → Subscription Plans

**Expected**:
- ✅ Status: **Active** (green badge)
- ✅ Payment Method: **Apple**
- ✅ Plan: EverReach Core
- ✅ Account: isaiahdupree33@gmail.com

**Screenshot**: Take screenshot of this screen

#### 1.2 Check RevenueCat User ID
**Path**: Settings → Payments (Dev) → RC Show App User ID

**Expected**:
- Alert shows current RevenueCat app user ID
- Should be a UUID or your Supabase user ID

**Note**: Record this ID for reference

---

### Phase 2: Test Fresh User Purchase Flow

#### 2.1 Log Out of Current RC User
**Path**: Settings → Payments (Dev) → RC Log Out

**Expected**:
- Alert: "Logged out of RC on this device"

#### 2.2 Create New Test User
**Path**: Settings → Payments (Dev) → RC Log In New Test User

**Expected**:
- Alert shows: "Linked to rc_test_ios_[timestamp]"
- This simulates a brand new user

#### 2.3 Verify Offerings Available
**Path**: Settings → Payments (Dev) → RC Fetch Offerings

**Expected**:
- Alert shows: "X packages available" (should be > 0)
- If 0 packages, check RevenueCat dashboard configuration

---

### Phase 3: Apple Sandbox Purchase

#### 3.1 Trigger Purchase Flow
**Path**: Settings → Payments (Dev) → RC Purchase Monthly

**Expected Flow**:
1. Apple native purchase sheet appears
2. Shows product: "EverReach Core" or similar
3. Price: $15.00 (or your configured price)
4. **Sandbox prompt**: "Sign In to iTunes Store"
   - Enter your sandbox test account email
   - Enter sandbox password
   - Tap "OK"

**Important**: 
- First purchase with sandbox account may take 30-60 seconds
- Don't tap "Buy" multiple times
- Watch for "Purchase Successful" or similar confirmation

#### 3.2 Handle Purchase Result
**Expected**:
- Alert: "Success" or "Purchase completed"
- If "Cancelled/Failed", check console logs

**Troubleshooting**:
- "Cannot connect to iTunes Store" → Check internet connection
- "This Apple ID has not yet been used" → Normal for new sandbox account, tap "Review"
- "Purchase failed" → Check RevenueCat dashboard for product configuration

---

### Phase 4: Verify Purchase Recorded

#### 4.1 Recompute Backend Entitlements
**Path**: Settings → Payments (Dev) → Backend Recompute Entitlements

**Expected**:
- Alert: "Entitlements recomputed and refreshed"
- This syncs RevenueCat purchase to your backend

#### 4.2 Check Updated Subscription
**Path**: Settings → Subscription Plans

**Expected**:
- Status: **Active**
- Payment Method: **Apple**
- Subscribed Since: Today's date
- Access message: "You have access to all premium features"

---

### Phase 5: Test Restore Purchases

#### 5.1 Simulate App Reinstall
**Path**: Settings → Payments (Dev) → RC Log Out

Then: Settings → Payments (Dev) → RC Log In as Current User

#### 5.2 Restore Purchases
**Path**: Settings → Payments (Dev) → RC Restore Purchases

**Expected**:
- Alert: "Restored purchases"
- Previous purchase should be recognized

#### 5.3 Verify Restored Status
**Path**: Settings → Payments (Dev) → Backend Recompute Entitlements

Then: Settings → Subscription Plans

**Expected**:
- Status still shows **Active**
- Payment method: **Apple**

---

## 🎨 Test Custom Paywall

### Show Subscription Plans Screen
**Path**: Settings → Payments (Dev) → Show Subscription Plans (Paywall)

**Expected**:
- Navigates to Subscription Plans screen
- Shows available plans
- "Current Subscription" card at top
- "Manage Billing" button

**This is your custom paywall UI** - you can enhance it with:
- Feature comparisons
- Pricing highlights
- Call-to-action buttons
- Trial messaging

---

## 📊 Monitoring & Debugging

### Console Logs to Watch
```
[RevenueCat] Initialized
[RevenueCat] Fetching offerings…
[RevenueCat] Purchase successful
[Backend] Entitlements recomputed
```

### RevenueCat Dashboard
- Go to RevenueCat dashboard → Customers
- Search for your test user ID
- Verify purchase appears in transaction history
- Check entitlement status

### Supabase Database
Check `subscriptions` table:
```sql
SELECT * FROM public.subscriptions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```

Check `entitlements` table:
```sql
SELECT * FROM public.entitlements 
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🐛 Common Issues & Solutions

### Issue: "No packages available"
**Solution**: 
- Check RevenueCat dashboard → Products
- Verify offerings are configured
- Ensure iOS app bundle ID matches

### Issue: "Purchase failed"
**Solution**:
- Check sandbox account is valid
- Verify product IDs match between App Store Connect and RevenueCat
- Check console for specific error messages

### Issue: "Cannot connect to iTunes Store"
**Solution**:
- Check internet connection
- Sign out and back into sandbox account
- Restart app

### Issue: Subscription not showing as Apple origin
**Solution**:
- Run "Backend Recompute Entitlements"
- Check backend logs for errors
- Verify ASN v2 webhook is configured (for production)

---

## ✅ Success Criteria

- [x] Can fetch RevenueCat offerings
- [x] Apple purchase sheet appears
- [x] Purchase completes successfully
- [x] Backend records purchase with Apple origin
- [x] Subscription Plans shows Active status
- [x] Restore purchases works
- [x] Custom paywall screen displays correctly

---

## 🚀 Next Steps After Testing

### For Production:
1. **Configure ASN v2 Webhook**
   - URL: `https://ever-reach-be.vercel.app/api/v1/webhooks/app-store`
   - In App Store Connect → App Information → App Store Server Notifications

2. **Test with Real Sandbox Account**
   - Create multiple test accounts
   - Test different subscription tiers
   - Test subscription cancellation
   - Test subscription renewal

3. **Production Release**
   - Switch to production RevenueCat keys
   - Update App Store Connect with production webhook
   - Submit app for review

---

## 📞 Support Resources

- RevenueCat Docs: https://docs.revenuecat.com
- Apple Sandbox Testing: https://developer.apple.com/apple-pay/sandbox-testing/
- Your Backend API: https://ever-reach-be.vercel.app/api/health

---

**Last Updated**: November 1, 2025
**App Version**: Development Build
**RevenueCat SDK**: 9.6.1 (via react-native-purchases)
