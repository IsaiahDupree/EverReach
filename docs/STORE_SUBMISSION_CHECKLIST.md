# EverReach - App Store Submission Checklist

## Status Legend
- ✅ Complete
- 🔄 In Progress
- ⏸️ Blocked/Waiting
- ❌ Not Started

---

## 1. Configuration & Setup

### 1.1 Expo Configuration (app.json)
- [x] ✅ App name, slug, and version configured
- [x] ✅ iOS bundleId set (`com.everreach.app`)
- [x] ✅ Android package set (`com.everreach.crm`)
- [x] ✅ App icons configured (icon.png, adaptive-icon.png)
- [x] ✅ Splash screen configured
- [x] ✅ Required plugins added (router, AV, image-picker, contacts, notifications)
- [x] ✅ `expo-tracking-transparency` plugin added with ATT description
- [ ] ❌ Add `react-native-purchases` config plugin for IAP support

### 1.2 EAS Build Configuration
- [x] ✅ `eas.json` created with build profiles:
  - [x] ✅ Development profile (dev client builds)
  - [x] ✅ Preview/Internal profile (TestFlight/Internal Testing)
  - [x] ✅ Production profile (App Store/Play Store, autoIncrement)
- [x] ✅ Build settings configured (iOS submit: Apple ID, ASC App ID, Team ID)

### 1.3 Environment Variables
- [ ] ❌ Add to EAS Secrets:
  - [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
  - [ ] `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- [ ] ❌ Verify backend API URLs are set correctly
- [ ] ❌ Configure any other required env vars (analytics keys, etc.)

---

## 2. In-App Purchases (IAP) Setup

### 2.1 RevenueCat Configuration
- [x] ✅ RevenueCat SDK integration code present (`lib/revenuecat.ts`)
- [x] ✅ Subscription screen implemented (`app/subscription-plans.tsx`)
- [ ] ❌ Create RevenueCat project (if not exists)
- [ ] ❌ Add iOS app to RevenueCat project
- [ ] ❌ Add Android app to RevenueCat project
- [ ] ❌ Create offerings and packages in RevenueCat dashboard
- [ ] ❌ Map product identifiers to App Store/Play Store IDs

### 2.2 Apple App Store Connect
- [ ] ❌ Create app listing in App Store Connect
- [ ] ❌ Configure In-App Purchases:
  - [ ] Create subscription group
  - [ ] Create subscription product (EverReach Core - $15/month)
  - [ ] Set product ID (match RevenueCat offering)
  - [ ] Configure pricing in all territories
  - [ ] Set subscription duration (1 month)
  - [ ] Enable free trial (7 days)
- [ ] ❌ Set up App Store Server Notifications (webhooks)
- [ ] ❌ Create Sandbox tester accounts

### 2.3 Google Play Console
- [ ] ❌ Create app listing in Google Play Console
- [ ] ❌ Configure In-App Products:
  - [ ] Create subscription
  - [ ] Create base plan (monthly)
  - [ ] Set product ID (match RevenueCat offering)
  - [ ] Configure pricing
  - [ ] Enable free trial (7 days)
- [ ] ❌ Set up Real-time Developer Notifications (RTDN)
- [ ] ❌ Add license tester accounts

### 2.4 Backend Webhook Integration
- [ ] ❌ Verify webhook endpoints exist:
  - [ ] `/api/v1/webhooks/appstore` (Apple)
  - [ ] `/api/v1/webhooks/play` (Google)
- [ ] ❌ Configure RevenueCat webhooks to point to backend
- [ ] ❌ Test webhook delivery and processing

---

## 3. Build & Testing

### 3.1 Development Builds
- [ ] ❌ Run iOS development build:
  ```bash
  eas build --profile development --platform ios
  ```
- [ ] ❌ Run Android development build:
  ```bash
  eas build --profile development --platform android
  ```
- [ ] ❌ Install dev clients on test devices
- [ ] ❌ Verify app launches and all features work

### 3.2 IAP Testing (Sandbox/Test)
- [ ] ❌ iOS Sandbox Testing:
  - [ ] Configure Sandbox tester account in App Store Connect
  - [ ] Sign in with Sandbox account on device
  - [ ] Test subscription purchase flow
  - [ ] Test free trial activation
  - [ ] Test subscription restoration
  - [ ] Verify RevenueCat customer info updates
- [ ] ❌ Android Testing:
  - [ ] Add test account to license testers
  - [ ] Test subscription purchase flow
  - [ ] Test free trial activation
  - [ ] Test subscription restoration
  - [ ] Verify RevenueCat customer info updates

### 3.3 QA Testing Checklist
- [ ] ❌ **Cold Start**
  - [ ] App launches without crashes
  - [ ] Splash screen displays correctly
  - [ ] Initial loading completes successfully
- [ ] ❌ **Authentication & Onboarding**
  - [ ] Sign up flow works
  - [ ] Sign in flow works
  - [ ] Apple Sign In works (iOS)
  - [ ] Google Sign In works (Android)
  - [ ] Onboarding screens display correctly
- [ ] ❌ **Core Features**
  - [ ] Contact list loads
  - [ ] Add/edit contact works
  - [ ] Import contacts works
  - [ ] Voice notes recording and playback
  - [ ] Text notes creation and editing
  - [ ] Screenshot upload and analysis
  - [ ] Social media channels CRUD operations
- [ ] ❌ **Message Generation**
  - [ ] Generate message from goal picker
  - [ ] Message displays correctly
  - [ ] Tone selection works
  - [ ] Regenerate works
  - [ ] Copy message works
  - [ ] Mark as sent works
  - [ ] Navigation to dashboard works
- [ ] ❌ **Subscription & Paywall**
  - [ ] Paywall displays for trial users
  - [ ] Purchase flow works (sandbox/test)
  - [ ] Restore purchases works
  - [ ] Manage billing portal opens
  - [ ] Subscription status reflects correctly
  - [ ] Usage limits display correctly
- [ ] ❌ **Deep Links & Navigation**
  - [ ] Deep links work (if applicable)
  - [ ] Back navigation works throughout app
  - [ ] Tab navigation works
- [ ] ❌ **Notifications**
  - [ ] Permission request appears
  - [ ] Push notifications deliver (if implemented)
- [ ] ❌ **Performance**
  - [ ] No memory leaks
  - [ ] No ANR (Android Not Responding)
  - [ ] Smooth scrolling in all lists
  - [ ] Fast message generation

---

## 4. Store Assets & Metadata

### 4.1 App Store (iOS)
- [ ] ❌ **App Icons**
  - [x] ✅ 1024x1024 App Store icon (appstore-icon-1024.png)
- [ ] ❌ **Screenshots** (Required sizes per [Screenshot Checklist](./store-listing/SCREENSHOT_CHECKLIST.md))
  - [ ] iPhone 6.7" (1290x2796) - 3-10 screenshots
  - [ ] iPhone 6.5" (1284x2778) - 3-10 screenshots
  - [ ] iPhone 5.5" (1242x2208) - Optional
  - [ ] iPad Pro 12.9" (2048x2732) - If supporting iPad
  - [ ] iPad Pro 11" (1668x2388) - If supporting iPad
- [ ] ❌ **App Preview Videos** (Optional)
  - [ ] 6.7" video
  - [ ] 6.5" video
- [ ] ❌ **Metadata**
  - [ ] App name (30 char max): "EverReach"
  - [ ] Subtitle (30 char max): "AI-Enhanced Personal CRM"
  - [ ] Description (4000 char max)
  - [ ] Keywords (100 char max, comma-separated)
  - [ ] Promotional text (170 char)
  - [ ] Category: Productivity
  - [ ] Age rating: 4+
- [ ] ❌ **URLs**
  - [ ] Privacy Policy URL (public)
  - [ ] Terms of Use URL (public)
  - [ ] Support URL
  - [ ] Marketing URL (optional)
- [ ] 🔄 **App Privacy**
  - [ ] Complete Privacy Nutrition Label questionnaire in App Store Connect
  - [x] ✅ All data types listed in PrivacyInfo.xcprivacy (10 types declared)
  - [x] ✅ Data usage purposes specified per type

### 4.2 Google Play Store (Android)
- [ ] ❌ **App Icons**
  - [x] ✅ 512x512 Hi-res icon (play-icon-512.png)
- [ ] ❌ **Screenshots** (Required per device)
  - [ ] Phone (min 2, max 8): 1080x1920 or higher
  - [ ] 7" Tablet (min 1): 1920x1200 or higher (if supporting)
  - [ ] 10" Tablet (min 1): 2560x1600 or higher (if supporting)
- [ ] ❌ **Feature Graphic**
  - [x] ✅ 1024x500 (feature-graphic-1024x500.svg)
- [ ] ❌ **Promo Video** (Optional)
  - [ ] YouTube URL
- [ ] ❌ **Metadata**
  - [ ] App name (50 char max): "EverReach - AI Personal CRM"
  - [ ] Short description (80 char max)
  - [ ] Full description (4000 char max)
  - [ ] Category: Productivity
  - [ ] Content rating: Everyone
- [ ] ❌ **URLs**
  - [ ] Privacy Policy URL (required, public)
  - [ ] Website URL (optional)
- [ ] ❌ **Data Safety**
  - [ ] Complete Data Safety form
  - [ ] List all data types collected
  - [ ] Specify data sharing practices
  - [ ] Specify security practices

### 4.3 Legal Documents
- [x] ✅ Privacy Policy drafted and updated for Meta Pixel (`docs/policies/PRIVACY_POLICY.md`)
- [x] ✅ Privacy Manifest updated: NSPrivacyTracking=true, 10 collected data types, tracking domains
- [x] ✅ ATT (App Tracking Transparency) implemented and gated on user consent
- [ ] ❌ Host Privacy Policy publicly (web URL)
- [ ] ❌ Create Terms of Service document
- [ ] ❌ Host Terms of Service publicly (web URL)
- [ ] ❌ Update app metadata with legal URLs

---

## 5. Submission Preparation

### 5.1 Internal/Preview Builds
- [ ] ❌ Build preview/internal release:
  ```bash
  eas build --profile preview --platform ios
  eas build --profile preview --platform android
  ```
- [ ] ❌ Submit iOS to TestFlight:
  ```bash
  eas submit --platform ios --latest
  ```
- [ ] ❌ Submit Android to Internal Testing:
  ```bash
  eas submit --platform android --latest
  ```
- [ ] ❌ Invite internal testers
- [ ] ❌ Collect feedback and fix critical bugs

### 5.2 Production Builds
- [ ] ❌ Update version number in app.json
- [ ] ❌ Create release notes
- [ ] ❌ Build production release:
  ```bash
  eas build --profile production --platform ios
  eas build --profile production --platform android
  ```
- [ ] ❌ Test production builds on physical devices
- [ ] ❌ Verify no crashes or critical bugs

### 5.3 Final Submission
- [ ] ❌ **iOS - App Store Connect**
  - [ ] Upload production build
  - [ ] Complete all metadata fields
  - [ ] Upload all screenshots and assets
  - [ ] Set pricing and availability
  - [ ] Add release notes
  - [ ] Submit for review
  - [ ] Add App Review Notes (test accounts, special instructions)
- [ ] ❌ **Android - Google Play Console**
  - [ ] Upload production AAB
  - [ ] Complete all metadata fields
  - [ ] Upload all screenshots and assets
  - [ ] Set pricing and availability
  - [ ] Add release notes
  - [ ] Submit for review
  - [ ] Complete Content Rating questionnaire

---

## 6. Post-Submission

### 6.1 Monitoring
- [ ] ❌ Monitor RevenueCat dashboard for IAP events
- [ ] ❌ Monitor crash reporting (Sentry/Firebase)
- [ ] ❌ Monitor analytics for user behavior
- [ ] ❌ Monitor App Store/Play Store reviews
- [ ] ❌ Monitor webhook delivery and backend logs

### 6.2 Launch Preparation
- [ ] ❌ Prepare marketing materials
- [ ] ❌ Set up customer support channels
- [ ] ❌ Prepare launch announcement
- [ ] ❌ Plan social media posts
- [ ] ❌ Prepare press kit

---

## Known Issues to Address

### Errors Seen in Development
- [x] ✅ **"Native module doesn't exist" errors**
  - Resolved: Expected in Expo Go, requires dev build
- [ ] 🔄 **"Manage billing error … default of undefined"**
  - Status: Needs testing in dev build with proper env setup
- [x] ✅ **Multiple compose API calls causing flickering**
  - Resolved: Implemented singleflight + caching + session guards
- [x] ✅ **GET cache "Already read" errors**
  - Resolved: Response cloning implemented
- [ ] 🔄 **Social channels not saving**
  - Status: Debug logging added, needs testing

---

## Quick Reference Commands

### Check EAS Login
```bash
npx expo whoami
```

### Development Builds
```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Preview/Internal Builds
```bash
# iOS (TestFlight)
eas build --profile preview --platform ios
eas submit --platform ios --latest

# Android (Internal Testing)
eas build --profile preview --platform android
eas submit --platform android --latest
```

### Production Builds
```bash
# iOS
eas build --profile production --platform ios
eas submit --platform ios --latest

# Android
eas build --profile production --platform android
eas submit --platform android --latest
```

### OTA Updates (JS-only changes)
```bash
# To e2e channel
eas update --branch e2e --message "Description of changes"

# To production
eas update --branch production --message "Description of changes"
```

---

## References
- [Screenshot Checklist](./store-listing/SCREENSHOT_CHECKLIST.md)
- [Screenshot Capture Guide](./store-listing/SCREENSHOT_CAPTURE_GUIDE.md)
- [Store Submission Package](./store-listing/STORE_SUBMISSION_PACKAGE.md)
- [Reviewer Accounts & Notes](./store-listing/REVIEWER_ACCOUNTS_AND_NOTES.md)
- [RevenueCat Testing Guide](./REVENUECAT_TESTING_GUIDE.md)
- [Privacy Policy](./policies/PRIVACY_POLICY.md)

---

## Next Immediate Actions (Priority Order)

1. **Create `eas.json`** with build profiles
2. **Add `react-native-purchases` plugin** to app.json
3. **Set up RevenueCat** projects and offerings
4. **Configure EAS secrets** (RevenueCat keys)
5. **Build development clients** for iOS and Android
6. **Set up IAP products** in App Store Connect and Google Play
7. **Test sandbox purchases** on physical devices
8. **Generate store assets** (screenshots, feature graphics)
9. **Host legal documents** (Privacy Policy, Terms)
10. **Submit to internal testing** (TestFlight/Internal)
