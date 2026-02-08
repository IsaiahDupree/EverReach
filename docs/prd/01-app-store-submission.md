# PRD 01: App Store Submission Prep

**Priority:** P0 — Blocking release
**Suggested Branch:** `release/app-store-v1`
**Estimated Effort:** 2–3 days
**Dependencies:** PRD 02 (Backend Hardening) should be done first or in parallel

---

## Objective

Prepare the EverReach iOS app for first App Store submission. Ensure all Apple requirements are met, production environment is properly configured, and the app passes App Store Review.

---

## Current State

| Item | Status | Notes |
|------|--------|-------|
| Bundle ID | ✅ `com.everreach.app` | Set in `app.json` |
| EAS Project ID | ✅ `c4c7bc9d-c16c-4a08-bfa4-80abb3ebead4` | Configured |
| Privacy Manifest | ✅ `PrivacyInfo.xcprivacy` | 4 API categories declared |
| Apple Sign-In | ✅ `usesAppleSignIn: true` | Configured |
| Info.plist permissions | ✅ Microphone, Camera, Photos, Contacts | All have user-facing descriptions |
| App version | ⚠️ `1.0.0` | Needs build number strategy |
| Dev feature flags | ❌ Enabled in `.env` | Must be disabled for production |
| `NSPrivacyCollectedDataTypes` | ❌ Empty array | Must declare collected data types |
| App Store metadata | ❌ Not started | Screenshots, description, keywords |
| Production `.env` | ❌ Not separated | Dev and prod share same `.env` |

---

## Deliverables

### 1. Production Environment Configuration
- [ ] Create `.env.production` with production-safe values:
  - `EXPO_PUBLIC_ENABLE_DEV_FEATURES=false`
  - `EXPO_PUBLIC_SHOW_DEBUG_INFO=false`
  - `EXPO_PUBLIC_SHOW_DEV_SETTINGS=false`
  - `EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=false`
  - `EXPO_PUBLIC_SHOW_REFRESH_BUTTONS=false`
  - `EXPO_PUBLIC_ENABLE_EXPERIMENTAL=false`
  - `EXPO_PUBLIC_META_TEST_EVENT_CODE=` (empty — no test events in prod)
- [ ] Verify `EXPO_PUBLIC_DISABLE_ONBOARDING=false` in production (users should see onboarding)
- [ ] EAS build profiles: `eas.json` with `preview`, `production` profiles

### 2. Privacy Manifest Completion
- [ ] Populate `NSPrivacyCollectedDataTypes` with actual data collected:
  - Email address (for auth) — `NSPrivacyCollectedDataTypeEmailAddress`
  - Name (for profile) — `NSPrivacyCollectedDataTypeName`
  - Phone number (optional) — `NSPrivacyCollectedDataTypePhoneNumber`
  - Contacts (user-initiated import) — `NSPrivacyCollectedDataTypeContacts`
  - Photos (user-initiated upload) — `NSPrivacyCollectedDataTypePhotos`
  - Audio (voice notes) — `NSPrivacyCollectedDataTypeAudioData`
  - Device ID (analytics) — `NSPrivacyCollectedDataTypeDeviceID`
  - Usage data (analytics/PostHog) — `NSPrivacyCollectedDataTypeProductInteraction`
- [ ] Set `NSPrivacyTracking` to `true` if Meta Pixel sends IDFA (or keep `false` if only server-side)
- [ ] Add tracking domains if applicable

### 3. App Store Metadata
- [ ] App name: "EverReach — Personal CRM"
- [ ] Subtitle (30 chars): "AI-Powered Relationship Manager"
- [ ] Description (4000 chars): Feature highlights, benefits, privacy stance
- [ ] Keywords (100 chars): crm, contacts, relationships, networking, follow-up, ai, voice notes
- [ ] Support URL: `https://everreach.app/support`
- [ ] Privacy Policy URL: `https://everreach.app/privacy`
- [ ] Categories: Primary = Productivity, Secondary = Business
- [ ] Age Rating: 4+ (no objectionable content)
- [ ] Screenshots: iPhone 6.7" (required), iPhone 6.1", iPad (if `supportsTablet: true`)
- [ ] App icon: Verify 1024x1024 version exists

### 4. Build & Signing
- [ ] EAS Build production profile configured
- [ ] Provisioning profile and certificates via EAS or manual
- [ ] Build number auto-increment strategy (`expo-build-properties` or EAS)
- [ ] TestFlight distribution setup for internal testing

### 5. Pre-Submission Checklist
- [ ] Remove all `console.log` statements (or ensure they're stripped in production)
- [ ] Verify no test screens accessible in production (Meta Pixel Test, Supabase Test, etc.)
- [ ] Test deep links work (`everreach://` scheme)
- [ ] Verify push notification entitlement
- [ ] Test app on physical device (not just simulator)
- [ ] Crash-free launch on cold start
- [ ] App size check (< 200MB for cellular download)

---

## Acceptance Criteria

1. `eas build --platform ios --profile production` succeeds
2. TestFlight build installs and runs on physical device
3. No dev features visible in production build
4. Privacy manifest passes Apple's automated checks
5. All App Store metadata fields populated
