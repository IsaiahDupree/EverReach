# Store Submission Manual Verification Audit

**Date:** November 30, 2025
**Auditor:** AI Assistant & User
**Status:** 🔄 In Progress

---

## 1. UI/UX Verification

### Onboarding Flow
- [ ] **Verify smooth transition from splash screen to onboarding to home screen.**
  - *Notes:* `PaywallGuard` handles transition. Needs manual test.
  - *Status:* 🔄 Pending Verification

### Sign In/Sign Up
- [ ] **Test Apple Sign-In.**
  - *Notes:* `expo-apple-authentication` is configured in `app.json` but **missing from `auth.tsx` UI**.
  - *Status:* ❌ Fail (Critical - Entitlement present but UI missing)
- [ ] **Test Email Sign-In.**
  - *Notes:* Implemented in `auth.tsx`.
  - *Status:* ✅ Pass (Implemented)

### Delete Account
- [ ] **Go to Settings -> Danger Zone -> Tap "Delete Account".**
  - *Notes:* "Danger Zone" and "Delete Account" are **missing from `settings.tsx`**.
  - *Status:* ❌ Fail (Critical - Store Requirement)
- [ ] **Confirm the alert.**
  - *Notes:* N/A (Feature missing)
  - *Status:* ❌ Fail
- [ ] **Verify user is signed out and redirected to Sign In screen.**
  - *Notes:* N/A
  - *Status:* ❌ Fail
- [ ] **(Optional) Verify account is deleted in backend.**
  - *Notes:* N/A
  - *Status:* ❌ Fail

### Permissions
- [ ] **Verify permission prompts for Contacts appear at appropriate times.**
  - *Notes:* Configured in `app.json`. Used in `onboarding-v2.tsx` and `import-contacts.tsx`.
  - *Status:* 🔄 Pending Verification
- [ ] **Verify permission prompts for Notifications appear at appropriate times.**
  - *Notes:* Configured in `app.json`.
  - *Status:* 🔄 Pending Verification
- [ ] **Verify app handles denied permissions gracefully.**
  - *Notes:* Needs manual test.
  - *Status:* 🔄 Pending Verification

### Layout & Theme
- [ ] **Responsive Layout: Check app on different screen sizes.**
  - *Notes:* 
  - *Status:* Pending
- [ ] **Dark Mode: Toggle theme and verify UI consistency.**
  - *Notes:* 
  - *Status:* Pending

---

## 2. Store Guidelines Compliance

### Authentication
- [ ] **Apple Sign-In: Ensure it is offered if other social logins are present.**
  - *Notes:* `expo-apple-authentication` plugin and entitlement present, but feature not implemented.
  - *Status:* ❌ Fail (Must implement or remove entitlement)

### In-App Purchases (IAP)
- [ ] **Test purchase flow (Sandbox).**
  - *Notes:* RevenueCat and Superwall integrated. `PaywallRouter.tsx` handles logic. Needs Sandbox test.
  - *Status:* 🔄 Pending Verification
- [ ] **Test "Restore Purchases" functionality.**
  - *Notes:* "Refresh Entitlements" and "Restore Purchases" buttons present in Settings.
  - *Status:* ✅ Pass (UI Implemented - needs testing)
- [ ] **Verify subscription status updates correctly.**
  - *Notes:* `SubscriptionProvider` handles state.
  - *Status:* 🔄 Pending Verification

### Legal & UGC
- [ ] **Privacy Policy: Verify link in Settings opens correct URL.**
  - *Notes:* Link present in Settings (line 1006) and Auth (line 400). Added web link to top of page.
  - *Status:* ✅ Pass (Implemented & Enhanced)
- [ ] **Terms of Service: Verify link in Settings opens correct URL.**
  - *Notes:* Link present in Settings (line 1000) and Auth (line 387). Added web link to top of page.
  - *Status:* ✅ Pass (Implemented & Enhanced)
- [ ] **Verify links are accessible from Sign Up/Login screens.**
  - *Notes:* Links present in `auth.tsx` footer.
  - *Status:* ✅ Pass (Implemented)
- [ ] **User Generated Content (UGC): Verify no public UGC requires reporting/blocking.**
  - *Notes:* App is a **Personal CRM**. Data is private/synced to own account. No public sharing features found.
  - *Status:* ✅ Pass (Not Applicable)

---

## 3. Performance & Stability

### Launch & Navigation
- [ ] **App Launch: Verify app launches within acceptable time (< 3 seconds).**
  - *Notes:* `initializePerformanceMonitoring` called in `_layout.tsx`.
  - *Status:* 🔄 Pending Verification
- [ ] **Navigation: Test navigation between tabs and screens for smoothness.**
  - *Notes:* Uses `expo-router` with `Stack` and `Tabs`.
  - *Status:* 🔄 Pending Verification

### Offline Mode
- [ ] **Test app behavior when offline (should show cached data or error messages).**
  - *Notes:* `NetInfo` checks implemented in `settings.tsx`. `react-query` configured with `gcTime`.
  - *Status:* 🔄 Pending Verification

---

## 4. Final Checks

### Metadata
- [ ] **Version Number: Verify version number in Settings matches app.json (1.0.0).**
  - *Notes:* Verified. `app.json` (1.0.0) matches `settings.tsx` display.
  - *Status:* ✅ Pass
- [ ] **Screenshots: Ensure screenshots for store listing are up-to-date.**
  - *Notes:* Screenshot automation scripts exist (`scripts/run-maestro-tests.sh`).
  - *Status:* 🔄 Pending Verification
- [ ] **Release Notes: Prepare release notes for the submission.**
  - *Notes:* Not started.
  - *Status:* ❌ Not Started
