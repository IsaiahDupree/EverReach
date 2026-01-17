# RevenueCat Paywall UI Setup Guide

Show the **exact paywall design** from your RevenueCat dashboard in your app.

**Your Paywall**: `pw10ff5cbdce5444ef`  
**Dashboard**: https://app.revenuecat.com/projects/f143188e/paywalls/pw10ff5cbdce5444ef/builder

---

## 🎨 What You'll Get

The beautiful paywall design you showed:
- "Keep the people who matter close" headline
- 3 feature cards (Voice Notes, Warmth Scores, Quick Reach Out)
- Yearly/Monthly toggle with 19% OFF badge
- Native iOS/Android UI - matches your dashboard design perfectly

---

## ⚙️ Step 1: Link Paywall to Offering (RevenueCat Dashboard)

1. **Go to Products → Offerings**:
   - https://app.revenuecat.com/projects/f143188e/products/offerings

2. **Select or Create an Offering**:
   - If you have "default" → Edit it
   - Or create new: "everreach_premium"

3. **Attach the Paywall**:
   - In the offering settings, find "Paywall"
   - Select `pw10ff5cbdce5444ef` (your paywall)
   - Save

4. **Add Products/Packages**:
   - Add your subscription products (Yearly $5.83/mo, Monthly $9.99/mo)
   - Make sure they match your paywall design

5. **Note the Offering ID**:
   - e.g., "default" or "everreach_premium"
   - You'll use this in the backend config

---

## 📦 Step 2: Install RevenueCat Paywalls UI

```bash
# Install the Paywalls UI package
npm install @revenuecat/purchases-ui-react-native

# iOS only: Install pods
cd ios && pod install && cd ..
```

---

## 🔧 Step 3: Update PaywallRouter

```typescript
// components/paywall/PaywallRouter.tsx

import RevenueCatPaywallUI from '@/components/paywall/RevenueCatPaywallUI';

export function PaywallRouter(props: PaywallRouterProps) {
  const { config, loading, error } = useLivePaywall();
  
  // ... existing code ...
  
  switch (config.provider) {
    case 'custom':
      return <Paywall {...props} />;
      
    case 'revenuecat':
      if (Platform.OS === 'web') {
        analytics.track('paywall_provider_fallback', {
          reason: 'unsupported_platform',
          provider: 'revenuecat',
          platform: 'web'
        });
        return <Paywall {...props} />;
      }
      
      // Use the new RevenueCatPaywallUI component
      return (
        <RevenueCatPaywallUI
          remoteConfig={config}
          onPurchaseComplete={() => {
            // Handle successful purchase
            props.onSelectPlan?.('revenuecat_purchase');
          }}
          onRestoreComplete={() => {
            // Handle restore
            console.log('[PaywallRouter] Restore completed');
          }}
          onDismiss={() => {
            // Handle dismiss (if modal)
            console.log('[PaywallRouter] Paywall dismissed');
          }}
        />
      );
      
    // ... rest of cases ...
  }
}
```

---

## 🔗 Step 4: Configure Backend Response

The backend `/api/v1/config/paywall-strategy` should return:

```json
{
  "platform": "ios",
  "provider": "revenuecat",
  "paywall_id": "default",  // ← Your OFFERING ID (not paywall design ID!)
  "configuration": {},
  "updated_at": "2025-11-15T19:00:00Z"
}
```

**Important**: Use the **Offering ID** (e.g., "default"), NOT the paywall design ID (pw10ff5cbdce5444ef).  
RevenueCat automatically shows the correct paywall design linked to that offering.

---

## 🧪 Step 5: Test the Paywall

### **Build the App**:

```bash
# iOS
npm run ios

# Android
npm run android
```

### **Test Flow**:

1. **Navigate to PaywallDebug**:
   - Go to `/paywall-debug` screen
   - Tap "RevenueCat" button

2. **Go to Subscription Screen**:
   - Navigate to subscription-plans
   - You should see YOUR paywall design!

3. **Verify**:
   - ✅ Headline: "Keep the people who matter close"
   - ✅ 3 feature cards
   - ✅ Yearly/Monthly toggle
   - ✅ 19% OFF badge
   - ✅ Continue button

---

## 📊 What Happens Behind the Scenes

1. **App starts** → useLivePaywall fetches remote config
2. **Config says** `provider=revenuecat, paywall_id=default`
3. **PaywallRouter** routes to RevenueCatPaywallUI
4. **RevenueCatPaywallUI** fetches offering "default" from RevenueCat SDK
5. **RevenueCat SDK** sees "default" is linked to paywall `pw10ff5cbdce5444ef`
6. **Your dashboard design** renders natively! 🎉

---

## 🎯 Quick Test (Dev Override)

Don't want to set up backend yet? Test immediately with AsyncStorage override:

```typescript
// On device/simulator
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force RevenueCat with specific offering
await AsyncStorage.setItem('dev:paywallProvider', 'revenuecat');
await AsyncStorage.setItem('dev:paywallId', 'default'); // Your offering ID

// Reload app
```

Or use the PaywallDebug screen → Tap "RevenueCat" button.

---

## 🐛 Troubleshooting

### **Paywall not showing**:
- ✅ Check offering ID is correct (not paywall design ID)
- ✅ Verify paywall is linked to offering in RevenueCat dashboard
- ✅ Check products/packages are added to the offering
- ✅ Look at console logs: `[RevenueCatPaywallUI] ...`

### **TypeScript errors**:
Install types:
```bash
npm install --save-dev @types/react-native
```

### **iOS build fails**:
```bash
cd ios && pod install && cd ..
npm run ios
```

### **Still showing custom paywall**:
- Check `dev:paywallProvider` in AsyncStorage
- Verify backend config returns `provider: 'revenuecat'`
- Check console: `[PaywallRouter] Rendering...`

---

## 📖 Reference

- **RevenueCat Paywalls Docs**: https://www.revenuecat.com/docs/displaying-paywalls
- **Your Paywall**: https://app.revenuecat.com/projects/f143188e/paywalls/pw10ff5cbdce5444ef/builder
- **Offerings**: https://app.revenuecat.com/projects/f143188e/products/offerings

---

## ✅ Success Checklist

- [ ] Paywall linked to offering in RevenueCat dashboard
- [ ] Offering ID noted (e.g., "default")
- [ ] Package installed: `@revenuecat/purchases-ui-react-native`
- [ ] PaywallRouter updated to use RevenueCatPaywallUI
- [ ] Backend config returns correct offering ID
- [ ] Built and tested on iOS/Android
- [ ] Paywall design matches dashboard 🎉

---

**Next**: Run `npm install @revenuecat/purchases-ui-react-native` and test!
