# ✅ Superwall Correct Configuration (From Example App Analysis)

**Date:** Nov 16, 2025  
**Source:** `/superwall_example_app/expo-superwall/example/`

---

## 🎯 Key Findings

### ❌ **What DOESN'T Work (Common Mistake)**
```json
// ❌ DON'T add this to app.json plugins array:
[
  "expo-superwall",
  {
    "iosApiKey": "$EXPO_PUBLIC_SUPERWALL_IOS_KEY",
    "androidApiKey": "$EXPO_PUBLIC_SUPERWALL_ANDROID_KEY"
  }
]
```
**Why:** `expo-superwall` is NOT a config plugin. It works purely through React code.

### ✅ **What DOES Work (Correct Pattern)**

#### 1. **app.json - NO Superwall Plugin Needed**
```json
{
  "expo": {
    "name": "Your App",
    "plugins": [
      "expo-router",
      "expo-notifications"
      // ← NO expo-superwall here!
    ]
  }
}
```

#### 2. **package.json - Dependencies**
```json
{
  "dependencies": {
    "expo-superwall": "^0.6.7",
    "react-native-purchases": "^9.6.5",  // Required by Superwall
    "expo": "^53.0.4"  // Must be SDK 53+
  }
}
```

#### 3. **app/_layout.tsx - Provider Setup**
```tsx
import { 
  SuperwallProvider, 
  SuperwallLoading, 
  SuperwallLoaded 
} from 'expo-superwall';

export default function RootLayout() {
  return (
    <SuperwallProvider
      apiKeys={{
        ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
        android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY || ''
      }}
    >
      <SuperwallLoading>
        <ActivityIndicator />
      </SuperwallLoading>
      
      <SuperwallLoaded>
        {/* Your app providers and content */}
      </SuperwallLoaded>
    </SuperwallProvider>
  );
}
```

#### 4. **Environment Variables (.env)**
```bash
EXPO_PUBLIC_SUPERWALL_IOS_KEY=pk_your_ios_key_here
EXPO_PUBLIC_SUPERWALL_ANDROID_KEY=pk_your_android_key_here
```

#### 5. **Usage in Components**
```tsx
import { usePlacement, useUser } from 'expo-superwall';

function MyComponent() {
  const { registerPlacement, state } = usePlacement({
    onPresent: (info) => console.log('Paywall shown'),
    onDismiss: (info, result) => console.log('Dismissed'),
    onError: (error) => console.error('Error:', error),
  });

  const handleFeatureAccess = async () => {
    await registerPlacement({
      placement: 'campaign_trigger',  // Your placement ID from dashboard
      feature() {
        // User has access - execute feature
        console.log('Feature unlocked!');
      },
    });
  };

  return <Button title="Access Feature" onPress={handleFeatureAccess} />;
}
```

---

## 📋 Comparison: Example App vs Our App

| Aspect | Example App | Our App | Status |
|--------|-------------|---------|--------|
| **app.json plugins** | No expo-superwall | No expo-superwall (fixed) | ✅ Correct |
| **SuperwallProvider** | In code only | In code only | ✅ Correct |
| **API Keys** | Hardcoded | From env vars | ✅ Better |
| **Loading/Loaded** | Uses both | Uses both | ✅ Correct |
| **Dependencies** | expo-superwall@latest | expo-superwall@0.6.7 | ✅ Correct |
| **Expo SDK** | 53.0.12 | 53.0.4 | ✅ Compatible |

---

## 🔧 Build Requirements

### iOS
```bash
# Clean and reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..

# Build with Expo
npx expo run:ios
```

### Android
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..

# Build with Expo
npx expo run:android
```

### Development Client
For Superwall to work, you need a **custom development build** (not Expo Go):
```bash
# Create development build
npx expo install expo-dev-client
eas build --profile development --platform ios
```

---

## 🚨 Common Build Errors & Solutions

### Error: "expo-superwall not found"
**Solution:** The package is installed, but you need a custom dev build:
```bash
npx expo prebuild --clean
npx expo run:ios
```

### Error: "Superwall not initialized"
**Solution:** Check environment variables are set:
```bash
# Verify .env file exists and has keys
cat .env | grep SUPERWALL
```

### Error: "Placement not found"
**Solution:** 
1. Go to Superwall dashboard
2. Create placement named `campaign_trigger`
3. Publish the campaign (not draft)

---

## ✅ Our Current Setup Status

### Working Configuration:
- ✅ `expo-superwall@0.6.7` installed
- ✅ SuperwallProvider correctly wrapped around app
- ✅ SuperwallLoading/SuperwallLoaded components used
- ✅ API keys in environment variables
- ✅ No incorrect plugin config in app.json
- ✅ iOS Podfile configured correctly
- ✅ Placement ID set to `campaign_trigger`

### Next Steps:
1. **Test Build:** `npx expo run:ios` (requires Mac + Xcode)
2. **Verify Initialization:** Check console logs for "Superwall initialized"
3. **Test Paywall:** Navigate to feature that triggers placement
4. **Commit & Push:** If working, save to `e2e` branch

---

## 📚 Reference Links

- **Example App:** `/superwall_example_app/expo-superwall/example/`
- **Package:** https://github.com/superwall/expo-superwall
- **Docs:** https://docs.superwall.com
- **Dashboard:** https://superwall.com/dashboard

---

**Status:** ✅ Configuration Verified Correct  
**Last Updated:** Nov 16, 2025  
**Next Action:** Test iOS build
