# EverReach v1.1.4 - App Store Submission Guide

## Prerequisites
- Expo CLI installed (`npm install -g eas-cli`)
- Apple Developer account with active membership
- App Store Connect access

## Build for App Store

### 1. Ensure version is updated
- ✅ Version updated to 1.1.4 in `app.json` and `package.json`
- ✅ EAS configured with Apple credentials in `eas.json`

### 2. Build for App Store
```bash
cd ios-app
eas build --platform ios --auto-submit
```

Or for manual submission:
```bash
eas build --platform ios
```

### 3. Submission (if not using --auto-submit)
```bash
eas submit --platform ios --latest
```

## App Store Connect Configuration

### Required Information
- **App Name**: EverReach
- **Bundle ID**: com.everreach.app
- **App Version**: 1.1.4
- **Privacy Policy**: [Link to privacy policy]
- **Support URL**: [Support website]

### Screenshots Requirements
- **Device**: iPhone 15 Pro Max (or latest)
- **Resolution**: 1440 x 3120 pixels
- **Count**: 2-10 screenshots per language
- **Formats**: PNG or JPEG

Current screenshots location: `/ios-app/screenshots/`

### Metadata
- **Description**: See `appstore-metadata/DESCRIPTION.txt`
- **Keywords**: See `appstore-metadata/KEYWORDS.txt`
- **Release Notes**: See `appstore-metadata/RELEASE_NOTES.txt`

## Build Configuration Highlights

### Enabled Plugins
- ✅ expo-router (routing)
- ✅ expo-av (audio recording)
- ✅ expo-apple-authentication
- ✅ expo-image-picker
- ✅ expo-contacts
- ✅ expo-notifications
- ✅ expo-font
- ✅ expo-web-browser

### Key Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`: Production Supabase
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`: Production RevenueCat iOS key
- `EXPO_PUBLIC_SUPERWALL_IOS_KEY`: Production Superwall key

## Features Shipped in v1.1.4

### Monetization
- ✅ RevenueCat SDK integration
- ✅ Superwall paywall integration
- ✅ Subscription status tracking
- ✅ Subscription tier management

### Features
- ✅ Core app features (CRM, contacts, interactions)
- ✅ User authentication (Apple Sign In)
- ✅ Push notifications
- ✅ Analytics tracking (PostHog + Meta Pixel)
- ✅ Voice notes recording
- ✅ Contact import

### Settings
- ✅ App production configuration
- ✅ Privacy policies properly configured
- ✅ All permissions requested (audio, camera, photos, contacts)

## Troubleshooting

### Common Issues

**Issue**: "App rejected for trial agreement"
- **Solution**: Ensure subscription terms are clearly in app store metadata

**Issue**: "Privacy Policy URL required"
- **Solution**: Add privacy policy URL in app.json or App Store Connect

**Issue**: "IDFA declaration required"
- **Solution**: Complete tracking consent form in App Store Connect
  - Uses: `EXPO_PUBLIC_META_PIXEL_ID` and analytics SDKs

## Success Metrics

After submission, monitor:
1. App review status in App Store Connect
2. RevenueCat dashboard for subscription metrics
3. Analytics (PostHog) for user engagement
4. Superwall dashboard for paywall performance

## Next Steps

1. ✅ Version bumped to 1.1.4
2. ✅ Monetization configured (RevenueCat + Superwall)
3. ✅ Metadata prepared
4. 🔄 Build and submit to App Store (run `eas build --platform ios --auto-submit`)
5. 📊 Monitor app review and post-launch metrics

---

**Estimated Review Time**: 24-48 hours
**Target Go-Live**: Immediately after approval
**Support Contact**: [Your contact info]
