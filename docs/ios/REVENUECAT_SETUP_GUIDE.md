# RevenueCat Setup Guide - Core SDK Implementation

**Date**: November 15, 2025  
**Status**: ✅ **READY TO DEPLOY**

---

## ✅ **What's Installed**

```bash
react-native-purchases@9.6.3  # Core SDK
```

**Implementation**: Uses core SDK to fetch offerings + custom Paywall UI  
**Works**: iOS, Android (requires custom dev build)  
**Doesn't Work**: Web (falls back to custom), Expo Go (needs prebuild)

---

## 🚀 **Quick Start (3 Steps)**

### **Step 1: Get Your RevenueCat API Keys**

1. Go to https://app.revenuecat.com
2. Navigate to your project
3. Go to **API Keys** section
4. Copy your **Public SDK Keys**:
   - iOS: `appl_xxxxx`
   - Android: `goog_xxxxx`

### **Step 2: Add Environment Variables**

Add to your `.env` file:

```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_your_android_key_here
```

### **Step 3: Initialize RevenueCat in Your App**

Add initialization code to `app/_layout.tsx` (or your app root):

```typescript
import { useEffect } from 'react';
import { Platform } from 'react-native';

// In your root component
useEffect(() => {
  if (Platform.OS === 'web') return; // Skip on web

  // Initialize RevenueCat
  const initRevenueCat = async () => {
    try {
      const Purchases = await import('react-native-purchases');
      
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      });

      if (!apiKey) {
        console.warn('[RevenueCat] API key not configured');
        return;
      }

      Purchases.default.configure({ apiKey });
      console.log('[RevenueCat] Initialized successfully');
    } catch (error) {
      console.error('[RevenueCat] Failed to initialize:', error);
    }
  };

  initRevenueCat();
}, []);
```

---

## 📋 **Complete Setup Checklist**

### **1. RevenueCat Dashboard**
- [ ] Create project at https://app.revenuecat.com
- [ ] Add iOS app (Bundle ID from `app.json`)
- [ ] Add Android app (Package name from `app.json`)
- [ ] Create products in App Store Connect / Google Play Console
- [ ] Import products to RevenueCat
- [ ] Create offerings (e.g., "default", "premium")
- [ ] Add packages to offerings (e.g., monthly, annual)
- [ ] Copy API keys (iOS and Android)

### **2. App Store / Play Store**
- [ ] **iOS**: Create in-app purchases in App Store Connect
- [ ] **Android**: Create subscriptions in Google Play Console
- [ ] Configure pricing and billing periods
- [ ] Submit for review (if required)

### **3. Frontend Setup**
- [x] Install `react-native-purchases` ✅
- [x] Create `RevenueCatPaywallUI` component ✅
- [x] Update `PaywallRouter` ✅
- [ ] Add environment variables (`.env`)
- [ ] Initialize SDK in app root
- [ ] Run `npx expo prebuild`
- [ ] Test on device

### **4. Backend Setup**
- [ ] Update backend endpoint to return `provider: 'revenuecat'`
- [ ] Set `paywall_id` to your offering ID (e.g., "default")
- [ ] Test endpoint: `GET /api/v1/config/paywall-strategy`

---

## 🔧 **How It Works**

### **Flow Diagram**

```
1. User opens subscription screen
   ↓
2. Frontend calls: GET /api/v1/config/paywall-strategy
   ↓
3. Backend returns: { provider: 'revenuecat', paywall_id: 'default' }
   ↓
4. PaywallRouter routes to RevenueCatPaywallUI
   ↓
5. RevenueCatPaywallUI:
   - Loads react-native-purchases SDK
   - Calls Purchases.getOfferings()
   - Finds offering by paywall_id
   - Maps packages → Paywall plans
   ↓
6. Renders custom Paywall UI with RevenueCat products
   ↓
7. User selects plan
   ↓
8. Calls Purchases.purchasePackage()
   ↓
9. Handles purchase completion
   ↓
10. Analytics tracked, entitlements updated
```

### **Code Flow**

```typescript
// 1. Backend config
{ provider: 'revenuecat', paywall_id: 'default' }

// 2. RevenueCatPaywallUI fetches offerings
const offerings = await Purchases.getOfferings();
const offering = offerings.all['default'];

// 3. Maps to Paywall format
const plans = offering.availablePackages.map(pkg => ({
  id: pkg.identifier,
  name: pkg.product.title,
  price: pkg.product.priceString,
  interval: 'month' | 'year',
}));

// 4. Renders with custom UI
<Paywall plans={plans} onSelectPlan={handlePurchase} />

// 5. Purchase flow
await Purchases.purchasePackage(selectedPackage);
```

---

## 📱 **Testing**

### **Local Testing (Sandbox)**

```bash
# 1. Generate native code
npx expo prebuild

# 2. Run on Android
npx expo run:android

# 3. Run on iOS
npx expo run:ios

# 4. Test with sandbox accounts
# iOS: Settings > App Store > Sandbox Account
# Android: Google Play Console > License Testing
```

### **What to Test**

- [ ] Paywall displays with correct plans
- [ ] Prices show in local currency
- [ ] Monthly/annual plans appear
- [ ] Purchase flow completes
- [ ] Restore purchases works
- [ ] Analytics events fire
- [ ] Error handling (no network, etc.)

### **Dev Overrides (Testing)**

You can test provider switching without backend changes:

```typescript
// In app
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force RevenueCat provider
await AsyncStorage.setItem('dev_paywall_provider', 'revenuecat');

// Force offering ID
await AsyncStorage.setItem('dev_paywall_id', 'premium');
```

---

## 🎯 **RevenueCat Dashboard Setup**

### **1. Create Offerings**

**Offering Structure**:
```
Offering: "default" (or "premium", "basic", etc.)
  └── Package: "$rc_monthly" (Monthly subscription)
  └── Package: "$rc_annual" (Annual subscription)
  └── Package: "$rc_lifetime" (Lifetime purchase)
```

**In RevenueCat Dashboard**:
1. Go to **Offerings** tab
2. Click **+ New Offering**
3. Set Identifier: `default` (must match backend `paywall_id`)
4. Add packages:
   - Monthly: Link to monthly product
   - Annual: Link to annual product
5. Save

### **2. Create Products**

**iOS (App Store Connect)**:
1. Go to App Store Connect
2. Select your app
3. Go to **Features** > **In-App Purchases**
4. Create **Auto-Renewable Subscription** group
5. Add subscriptions:
   - Product ID: `com.yourapp.monthly.premium`
   - Duration: 1 month
6. Add to RevenueCat

**Android (Google Play Console)**:
1. Go to Google Play Console
2. Select your app
3. Go to **Monetize** > **Subscriptions**
4. Create subscription:
   - Product ID: `premium_monthly`
   - Billing period: 1 month
5. Add to RevenueCat

---

## 🔐 **Environment Variables**

Add to `.env`:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx

# Optional: Default offering ID
EXPO_PUBLIC_REVENUECAT_DEFAULT_OFFERING=default
```

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

---

## 📊 **Analytics Events**

All events are automatically tracked:

### **Offering Events**
```typescript
analytics.track('revenuecat_offering_loaded', {
  offering_id: 'default',
  package_count: 2,
  platform: 'ios',
});

analytics.track('revenuecat_offering_error', {
  error: 'No offering found',
  offering_id: 'default',
});
```

### **Purchase Events**
```typescript
analytics.track('revenuecat_purchase_started', {
  plan_id: '$rc_monthly',
  offering_id: 'default',
});

analytics.track('revenuecat_purchase_success', {
  plan_id: '$rc_monthly',
  entitlements: ['premium'],
});

analytics.track('revenuecat_purchase_error', {
  error: 'Payment failed',
  code: 'E_PURCHASE_FAILED',
});

analytics.track('revenuecat_purchase_cancelled', {
  plan_id: '$rc_monthly',
});
```

### **Restore Events**
```typescript
analytics.track('revenuecat_restore_started');
analytics.track('revenuecat_restore_success', {
  entitlements: ['premium'],
});
analytics.track('revenuecat_restore_error', {
  error: 'No purchases to restore',
});
```

---

## 🐛 **Troubleshooting**

### **"No offerings found"**
- **Cause**: Offering ID doesn't match
- **Fix**: Check backend `paywall_id` matches RevenueCat offering identifier

### **"SDK not initialized"**
- **Cause**: `Purchases.configure()` not called
- **Fix**: Add initialization code to app root (see Step 3)

### **"Invalid API key"**
- **Cause**: Wrong key or not set
- **Fix**: Verify `.env` has correct keys from RevenueCat dashboard

### **"Products not loaded"**
- **Cause**: Products not created in App Store/Play Store
- **Fix**: Create products and import to RevenueCat

### **Web shows "Not Supported"**
- **Expected**: RevenueCat only works on native (iOS/Android)
- **Behavior**: Automatically falls back to custom paywall

### **Expo Go crashes**
- **Expected**: RevenueCat requires custom dev build
- **Fix**: Run `npx expo prebuild` and use `expo run:ios/android`

---

## ✅ **Deployment Checklist**

### **Pre-Deployment**
- [ ] RevenueCat account created
- [ ] Products created in App Store Connect / Play Console
- [ ] Products imported to RevenueCat
- [ ] Offerings configured
- [ ] API keys obtained
- [ ] Environment variables set
- [ ] SDK initialization added
- [ ] Tested on sandbox

### **Deployment**
- [ ] Run `npx expo prebuild`
- [ ] Build iOS: `eas build --platform ios`
- [ ] Build Android: `eas build --platform android`
- [ ] Test on TestFlight / Internal Testing
- [ ] Update backend: `provider: 'revenuecat'`
- [ ] Deploy backend changes
- [ ] Submit to App Store / Play Store

### **Post-Deployment**
- [ ] Monitor RevenueCat dashboard
- [ ] Check purchase analytics
- [ ] Verify entitlements working
- [ ] Test restore purchases
- [ ] Monitor error logs

---

## 📚 **Resources**

**RevenueCat Docs**:
- Getting Started: https://www.revenuecat.com/docs/getting-started
- React Native: https://www.revenuecat.com/docs/getting-started/installation/reactnative
- Offerings: https://www.revenuecat.com/docs/entitlements/offering
- Testing: https://www.revenuecat.com/docs/test-and-launch/sandbox

**Apple Docs**:
- In-App Purchase: https://developer.apple.com/in-app-purchase/
- App Store Connect: https://appstoreconnect.apple.com

**Google Docs**:
- Subscriptions: https://developer.android.com/google/play/billing/subscriptions
- Play Console: https://play.google.com/console

**Our Docs**:
- `SUPERWALL_INTEGRATION_SUMMARY.md` - Alternative provider
- `REMOTE_PAYWALL_FRONTEND_CHECKLIST.md` - Testing guide
- `REVENUECAT_STATUS.md` - Current status

---

**Last Updated**: November 15, 2025, 8:45 PM  
**Status**: ✅ Ready to deploy  
**Implementation**: Core SDK + Custom UI  
**Next Step**: Initialize SDK and test on device
