# Quick Copy-Paste for EAS Environment Variables

## Direct Link
🔗 https://expo.dev/accounts/isaiahdupree/projects/ai-enhanced-personal-crm/settings/environment-variables

## Instructions
1. Click the link above
2. Select **"production"** environment
3. For each variable below, click **"Add Variable"**
4. Set **Visibility** to **"Plain text"** (for all EXPO_PUBLIC_* variables)
5. Copy-paste the variable name and value

---

## Minimum Required (Copy these first)

```
Variable: EXPO_PUBLIC_SUPABASE_URL
Value: https://utasetfxiqcrnwyfforx.supabase.co

Variable: EXPO_PUBLIC_SUPABASE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04

Variable: EXPO_PUBLIC_API_BASE_URL
Value: https://ever-reach-be.vercel.app

Variable: EXPO_PUBLIC_API_URL
Value: https://ever-reach-be.vercel.app

Variable: EXPO_PUBLIC_BACKEND_URL
Value: https://ever-reach-be.vercel.app

Variable: EXPO_PUBLIC_REVENUECAT_IOS_KEY
Value: appl_vFMuKNRSMlJOSINeBHtjivpcZNs

Variable: EXPO_PUBLIC_SUPERWALL_IOS_KEY
Value: pk_ACiUJ9wcjUecu-9D2eK3I
```

---

## Additional Recommended Variables

```
Variable: EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET
Value: attachments

Variable: EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
Value: test_KsnKaXlsDwOXbyRyCrQZjHcQDhv

Variable: EXPO_PUBLIC_IAP_OFFERING_ID
Value: default

Variable: EXPO_PUBLIC_IAP_ENTITLEMENT_ID
Value: EverReach Core

Variable: EXPO_PUBLIC_USE_SUPERWALL
Value: true

Variable: EXPO_PUBLIC_FORCE_CUSTOM_PAYWALL
Value: true

Variable: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_51RDA4DD7MP3Gp2rwN0DzAS8IPgf6hRPf3bWt33wxU2saHs4eC7C2ljUYU2KAn6VF8oYRvtHTYVR2HxIAfNApBEba00eaRpD0d3

Variable: EXPO_PUBLIC_ENABLE_DEV_FEATURES
Value: false

Variable: EXPO_PUBLIC_SHOW_DEBUG_INFO
Value: false

Variable: EXPO_PUBLIC_ENABLE_WEB_FEATURES
Value: true

Variable: EXPO_PUBLIC_DISABLE_ONBOARDING
Value: true
```

---

## After Setting Variables

Run the build:
```bash
eas build --platform ios --profile production
```
