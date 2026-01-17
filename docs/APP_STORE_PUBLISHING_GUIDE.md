# App Store Publishing Guide - iOS & Android

**Project:** EverReach CRM  
**Last Updated:** November 1, 2025  
**Status:** Pre-submission planning phase

---

## 📋 Table of Contents

1. [Visual Assets (Sizes + Shot List)](#1-visual-assets-sizes--shot-list)
2. [Store Copy & Fields](#2-store-copy--fields)
3. [Compliance & Policy Checklist](#3-compliance--policy-checklist)
4. [Submission Workflows](#4-submission-workflows)
5. [Automation & Capture Plan](#5-automation--capture-plan)
6. [Pre-flight QA & Day-of Checklist](#6-pre-flight-qa--day-of-checklist)
7. [Ready-to-Fill Templates](#7-ready-to-fill-templates)

---

## 1) Visual Assets (Sizes + Shot List)

### iOS (App Store)

#### App Icon
- **Size:** 1024×1024 PNG
- **Requirements:** 
  - No transparency/alpha (opaque)
  - Added in your asset catalog
  - Apple masks the corners; provide full square
  - sRGB color space

#### Screenshots
- **Quantity:** 1–10 per device type
- **Current Specifications:** Use [Screenshot specifications list](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) in App Store Connect
- **Device Classes (2025):**
  - iPhone 6.7" (required)
  - iPhone 6.5" 
  - iPhone 5.5"
  - iPad Pro 12.9" (required for iPad apps)
  - iPad Pro 11"
- **Best Practice:** Capture on largest iPhone class + largest iPad class to satisfy smaller classes

#### App Preview Videos (Optional)
- **Quantity:** Up to 3 per locale
- **Duration:** Max 30 seconds
- **Format:** MP4/H.264
- **Sizes:** Device-specific (match screenshot sizes)

---

### Android (Google Play)

#### App Icon (High-Res)
- **Size:** 512×512
- **Requirements:**
  - 32-bit PNG
  - sRGB color space
  - ≤1024KB file size
  - Full square (Play applies mask/shadow automatically)

#### Feature Graphic (Highly Recommended)
- **Size:** 1024×500
- **Format:** JPEG or 24-bit PNG (no alpha)
- **Usage:** Used in store promos, featured sections

#### Screenshots
- **Phone:** At least 2 required
- **Tablet/Chromebook/TV/Wear OS:** Add if supported
- **Location:** Play Console → "Add preview assets"
- **Current Rules:** See [Graphic assets, screenshots, & video](https://support.google.com/googleplay/android-developer/answer/9866151)

---

### Shot List (Use Across Both Stores)

Priority order for marketing impact:

1. **Primary Home / Inbox** - Core value in one frame
2. **Trial Banner** - Showing "X days left"
3. **Second Onboarding / Paywall** - Post-trial with plan grid + benefits
4. **Manage Subscription** - Shows "Purchased via Apple/Google/Web (Stripe)" label
5. **AI Assistant Conversation** - Copy/like/dislike events visible
6. **Contacts / People** - With voice/text notes tiles
7. **Analytics / Activity Log** - Developer dashboard view (good for Play marketing)
8. **Settings** - Restore Purchases / Privacy / Terms / ATT toggle info (iOS)

---

## 2) Store Copy & Fields

### App Store (iOS)

#### Field Limits
| Field | Limit | Notes |
|-------|-------|-------|
| Name (Title) | ~30 chars | Apple enforces conciseness |
| Subtitle | ~30 chars | Shows below title in search |
| Promotional Text | ~170 chars | Editable without new build |
| Description | No hard limit | Narrative + feature bullets |
| Keywords | 100 chars | Comma-separated, no spaces after commas |

#### Required URLs
- **Privacy Policy** (required)
- **Support URL** (required)
- **Marketing URL** (optional)

#### Additional Fields
- Age rating questionnaire
- App Preview captions (if using video)
- What's New (release notes)

---

### Google Play

#### Field Limits
| Field | Limit | Policy Notes |
|-------|-------|--------------|
| Title | 30 chars | Strict enforcement |
| Short Description | 80 chars | No CTAs, emoji spam |
| Full Description | 4000 chars | Narrative + features |

#### Required URLs
- **Privacy Policy** (required for Data safety)

#### Additional Fields
- Feature graphic headline (optional overlay in image design)
- What's New (release notes)

---

### EverReach CRM - Copy Templates

#### iOS App Store

**Title:** `EverReach CRM – AI Contacts`  
**Subtitle:** `AI follow-ups that convert`  
**Promotional Text:**  
```
Ship faster: smart prompts, contact notes, and one-tap follow-ups.
```

**Description:**  
```
EverReach helps busy professionals maintain meaningful relationships without the overhead.

KEY BENEFITS:
• AI-powered follow-ups that feel personal
• Voice and text notes attached to every contact
• Smart reminders based on relationship strength
• One-tap message generation with context

FEATURES:
• Trial-based paywall (7 days free, then choose plan)
• Cross-platform sync (iOS, Android, Web)
• Subscription management (Apple, Google, Stripe)
• Privacy-first: your data stays yours
• Export anytime

PERFECT FOR:
Sales professionals, consultants, founders, and anyone managing complex networks.

Start your 7-day trial—cancel anytime.
```

**Keywords:**  
```
crm,contacts,ai,relationships,follow-up,sales,networking,notes,reminders,voice
```

---

#### Google Play

**Title:** `EverReach CRM – AI Contacts`  
**Short Description:**  
```
AI follow-ups, inbox, and trial-based paywall that's fair
```

**Full Description:**  
```
[Same as iOS description above - 4000 char limit allows full content]
```

---

## 3) Compliance & Policy Checklist

### iOS Requirements

#### ✅ App Privacy (Nutrition Labels)
- [ ] Complete data collection/usage per [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [ ] Map all SDK data collection:
  - RevenueCat (purchase history, identifiers)
  - Supabase (user data, content)
  - PostHog/Analytics (usage data)
  - Facebook SDK (if used - tracking data)
- [ ] Keep labels in sync with actual SDK behavior

#### ✅ ATT (App Tracking Transparency)
- [ ] Add `NSUserTrackingUsageDescription` to `Info.plist`
- [ ] Request permission via `AppTrackingTransparency` framework
- [ ] Only track after user grants permission
- [ ] Required if: cross-app tracking, ads, attribution

#### ✅ Export Compliance (Encryption)
- [ ] Answer encryption questions in App Store Connect
- [ ] Submit documentation if required
- [ ] Standard exemption: HTTPS-only, no custom crypto

#### ✅ Age Rating
- [ ] Complete updated questionnaire (July 24, 2025 changes)
- [ ] Deadline: January 31, 2026
- [ ] Avoid submission interruptions

#### ✅ Review Access
- [ ] Provide demo credentials (don't expire)
- [ ] Include in App Review Information section
- [ ] Test account must have access to all features

---

### Google Play Requirements

#### ✅ Data Safety Form
- [ ] Fill accurately (mandatory)
- [ ] Include all SDK data collection
- [ ] Must match app's actual behavior
- [ ] Update when adding new SDKs

#### ✅ App Access
- [ ] Add test credentials in App Content → App Access
- [ ] Provide credentials for Pre-launch report
- [ ] Ensure credentials don't expire
- [ ] Test account has full feature access

#### ✅ Title/Metadata Policies
- [ ] 30-char title limit
- [ ] No performance claims ("#1", "best")
- [ ] No emoji spam in descriptions
- [ ] No CTAs in short description

---

## 4) Submission Workflows

### iOS (App Store Connect)

**Step-by-Step:**

1. **Build & Archive**
   ```bash
   # Via Xcode Organizer
   Product → Archive
   
   # Or via EAS
   eas build --platform ios --profile production
   ```

2. **Upload to App Store Connect**
   - Wait for processing (10-30 mins)
   - Check for build errors/warnings

3. **Configure App Store Listing**
   - [ ] Add screenshots (all device sizes)
   - [ ] Upload app icon (1024×1024)
   - [ ] Fill copy (title, subtitle, description, keywords)
   - [ ] Complete privacy questionnaire
   - [ ] Answer age rating questions
   - [ ] Answer export compliance

4. **In-App Purchases/Subscriptions**
   - [ ] Create subscription products
   - [ ] Attach to build version
   - [ ] Fill pricing tiers
   - [ ] Add promotional content

5. **App Review Information**
   ```
   Demo Credentials:
   Email: demo@everreach.app
   Password: DemoPass2025!
   
   Notes:
   - Trial expires in 7 days
   - To test second onboarding: Settings → Payments (Dev) → Expire Trial
   - To test restore: Settings → View Plans → Restore Purchases
   ```

6. **Submit for Review**
   - [ ] Use TestFlight for internal testing first
   - [ ] Submit when ready
   - [ ] Monitor review status

---

### Android (Play Console)

**Step-by-Step:**

1. **Build AAB**
   ```bash
   # Via EAS
   eas build --platform android --profile production
   ```

2. **Upload to Internal Testing**
   - Create release
   - Upload AAB
   - Add release notes

3. **Complete Store Listing**
   - [ ] Upload icon (512×512)
   - [ ] Upload screenshots (phone + tablet)
   - [ ] Upload feature graphic (1024×500)
   - [ ] Fill copy (title, short desc, full desc)

4. **Complete App Content**
   - [ ] Data safety form
   - [ ] App access (test credentials)
   - [ ] Ads declaration
   - [ ] Target audience & content rating

5. **Pre-launch Report (Optional)**
   ```
   Test Credentials:
   Email: demo@everreach.app
   Password: DemoPass2025!
   ```
   - Run automated tests
   - Fix critical issues

6. **Roll Out**
   - Internal → Closed Testing → Open Testing → Production
   - Monitor crash reports
   - Gradual rollout recommended (10% → 50% → 100%)

---

## 5) Automation & Capture Plan

### Screenshot Automation

#### iOS (fastlane snapshot)

**Setup:**
```ruby
# fastlane/Snapfile
devices([
  "iPhone 15 Pro Max",  # 6.7"
  "iPad Pro (12.9-inch) (6th generation)"
])

languages([
  "en-US"
])

scheme("EverReach")

output_directory("./screenshots")
```

**Script Flow:**
1. Launch app with trial active
2. Navigate to Home → capture
3. Navigate to Trial Banner → capture
4. Trigger Second Onboarding → capture
5. Navigate to Subscription Management → capture
6. Navigate to AI Chat → capture
7. Navigate to Contacts → capture
8. Navigate to Analytics → capture
9. Navigate to Settings → capture

---

#### Android (ADB + screencap)

**Script:**
```bash
#!/bin/bash
# screenshots.sh

# Start app
adb shell am start -n com.everreach.app/.MainActivity

# Capture sequence
sleep 2
adb exec-out screencap -p > screenshots/01_home.png

sleep 1
# Navigate to trial banner (use UI Automator)
adb exec-out screencap -p > screenshots/02_trial.png

# ... continue for all screens
```

---

### Asset Upload Automation

#### iOS (fastlane deliver)

```ruby
# fastlane/Deliverfile
app_identifier("com.everreach.app")
username("your@apple.id")

screenshots_path("./screenshots")
metadata_path("./metadata")

submit_for_review(false)  # Manual submission
automatic_release(false)
```

#### Android (fastlane supply)

```ruby
# fastlane/Supplyfile
package_name("com.everreach.app")
track("internal")
aab("./build/app.aab")

metadata_path("./metadata/android")
screenshot_path("./screenshots/android")

skip_upload_apk(true)
skip_upload_aab(false)
```

---

### Build & Submit Automation

#### EAS (Expo Application Services)

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "releaseChannel": "production",
        "distribution": "store"
      },
      "android": {
        "releaseChannel": "production",
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Commands:**
```bash
# Build
eas build --platform all --profile production

# Submit
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## 6) Pre-flight QA & Day-of Checklist

### Functionality Tests

- [ ] **Trial countdown visible**
  - Open app
  - Verify "X days left" shows on subscription page
  - Verify countdown decrements daily

- [ ] **Trial expiry flow**
  - Set trial to 0 days (dev settings)
  - Tap primary action (e.g., "Compose Message")
  - Verify Second Onboarding/Paywall appears
  - Verify can't proceed without subscription

- [ ] **Restore Purchases**
  - Settings → View Plans → Restore Purchases
  - Verify existing subscription detected
  - Verify premium features unlock

- [ ] **Cross-platform labels**
  - Purchase via iOS → Check label shows "Apple Pay"
  - Purchase via Android → Check label shows "Google Play"
  - Purchase via Web → Check label shows "Stripe"

---

### Legal & Policy Verification

- [ ] **Privacy Policy accessible**
  - Settings → Legal → Privacy Policy
  - Subscription screen → Privacy Policy link
  - Verify opens correct URL

- [ ] **Terms of Use accessible**
  - Settings → Legal → Terms of Service
  - Subscription screen → Terms link
  - Verify opens correct URL

- [ ] **ATT prompt (iOS)**
  - Fresh install
  - Verify prompt appears before tracking
  - Verify app respects denial

- [ ] **SDK data matches declarations**
  - App Privacy (iOS) reflects RevenueCat, Supabase, PostHog
  - Data Safety (Play) matches actual collection

---

### Store Submission Checks

#### iOS

- [ ] **Review notes complete**
  ```
  Demo Account:
  Email: demo@everreach.app
  Password: DemoPass2025!
  
  Steps to test Second Onboarding:
  1. Sign in with demo account
  2. Go to Settings → Payments (Dev)
  3. Tap "Expire Trial (Test Paywall Gate)"
  4. Return to Home → Tap any action
  5. Second Onboarding should appear
  
  Steps to test Restore:
  1. Settings → View Plans
  2. Tap "Restore Purchases"
  3. Verify subscription restored
  ```

- [ ] Screenshots uploaded (all sizes)
- [ ] App icon uploaded
- [ ] Privacy questionnaire complete
- [ ] Age rating complete
- [ ] Export compliance answered
- [ ] In-app purchases created

---

#### Android

- [ ] **App access credentials added**
  - App Content → App Access → Add credentials
  - Same as demo account above

- [ ] **Feature graphic uploaded** (1024×500)

- [ ] **Pre-launch report run**
  - Credentials provided
  - Critical issues fixed

- [ ] Screenshots uploaded (phone + tablet)
- [ ] Icon uploaded (512×512)
- [ ] Data safety form complete
- [ ] Target audience set
- [ ] Content rating complete

---

## 7) Ready-to-Fill Templates

### Metadata CSV (iOS)

```csv
Language,Title,Subtitle,Promotional Text,Description,Keywords
en-US,EverReach CRM – AI Contacts,AI follow-ups that convert,Ship faster: smart prompts contact notes and one-tap follow-ups.,[FULL_DESCRIPTION],crm contacts ai relationships follow-up sales networking notes reminders voice
```

### Metadata CSV (Android)

```csv
Language,Title,Short Description,Full Description
en-US,EverReach CRM – AI Contacts,AI follow-ups inbox and trial-based paywall that's fair,[FULL_DESCRIPTION]
```

### Shot List CSV

```csv
Screen Name,Route,Description,iOS Priority,Android Priority
Home,/home,Primary inbox showing contacts and warmth alerts,1,1
Trial Banner,/subscription-plans,Trial countdown with days remaining,2,2
Second Onboarding,/upgrade-onboarding,Post-trial paywall with plan comparison,3,3
Manage Subscription,/subscription-plans,Shows current plan and billing platform,4,4
AI Chat,/chat,Conversation with AI assistant,5,5
Contacts,/contacts,Contact list with voice/text notes,6,6
Analytics,/analytics,Dashboard with relationship metrics,7,7
Settings,/settings,Restore purchases privacy terms,8,8
```

---

## 📚 Resources

- [Apple App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Screenshot Specifications (iOS)](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- [Graphic Assets Guide (Android)](https://support.google.com/googleplay/android-developer/answer/9866151)
- [App Privacy Details (iOS)](https://developer.apple.com/app-store/app-privacy-details/)
- [Data Safety Form (Android)](https://support.google.com/googleplay/android-developer/answer/10787469)

---

**End of Publishing Guide**
