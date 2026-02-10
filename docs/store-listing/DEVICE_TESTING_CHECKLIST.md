# Physical Device Testing Checklist — Pre-Submission QA

Run through this checklist on a **real iOS device via TestFlight** before submitting to App Store Review.

---

## Build & Install

- [ ] `eas build --profile production --platform ios` completes without errors
- [ ] `eas submit --platform ios --latest` uploads to App Store Connect
- [ ] Build appears in TestFlight → install on device
- [ ] App launches without crash on first open

---

## ATT & Privacy (Critical for Meta Pixel)

- [ ] ATT prompt appears on first launch ("Allow EverReach to track…")
- [ ] Tapping "Allow" → Meta events include hashed user data (check Events Manager)
- [ ] Tapping "Ask App Not to Track" → Meta events sent without PII fields
- [ ] ATT preference persists across app restarts
- [ ] Changing ATT in iOS Settings → Privacy & Security → Tracking is respected

---

## Authentication

- [ ] Sign up with email/password
- [ ] Sign in with existing account
- [ ] Sign in with Apple
- [ ] Sign out and sign back in
- [ ] Session persists across app restart (no re-login required)
- [ ] Forgot password flow sends reset email

---

## Onboarding

- [ ] Welcome screens display correctly
- [ ] Pre-auth onboarding questions work
- [ ] Post-auth onboarding completes
- [ ] Skipping onboarding works (if applicable)

---

## Core Features

- [ ] Contact list loads and scrolls smoothly
- [ ] Create new contact (manual)
- [ ] Edit contact fields (name, phone, email, notes)
- [ ] Delete contact
- [ ] Import contacts from device (permission prompt appears)
- [ ] Contact detail shows context summary, warmth score
- [ ] Voice note: microphone permission prompt → record → playback → transcription
- [ ] Text note: create, edit, save
- [ ] Search contacts by name, tag, or interest
- [ ] Warmth score displays and updates after interaction

---

## Messaging & AI

- [ ] Goal picker opens
- [ ] AI message generates successfully
- [ ] Tone selection works
- [ ] Copy message to clipboard
- [ ] Mark as sent works
- [ ] Message sent success screen displays

---

## Subscription & Paywall

- [ ] Paywall appears for free/trial users at appropriate limits
- [ ] Subscription plans display with correct pricing ($14.99/mo, $152.99/yr)
- [ ] 7-day free trial starts correctly (sandbox)
- [ ] Purchase flow completes (sandbox)
- [ ] Restore purchases works
- [ ] Subscription status updates in app
- [ ] Premium features unlock after purchase

---

## Navigation & UI

- [ ] Tab bar navigation works (all tabs)
- [ ] Back button/swipe-back works throughout
- [ ] Modal screens (add contact, voice note, goal picker) open and close
- [ ] No broken layouts in landscape (if supported) or on different screen sizes
- [ ] Dark mode renders correctly (if supported)
- [ ] Splash screen shows then dismisses

---

## Notifications

- [ ] Permission prompt appears when appropriate
- [ ] Push notifications deliver (if implemented)

---

## Deep Links

- [ ] `everreach://` scheme opens app
- [ ] Facebook ad deep link with `fbclid` parameter captures click ID
- [ ] Auth callback redirect works (password reset, etc.)

---

## Performance

- [ ] No visible lag or jank when scrolling contact list (100+ contacts)
- [ ] Voice note recording starts instantly
- [ ] AI message generation completes in < 5 seconds
- [ ] App doesn't crash during extended use (10+ minutes)
- [ ] Memory usage stays reasonable (check Xcode Instruments if possible)
- [ ] No "Application Not Responding" freezes

---

## Meta Pixel Verification

- [ ] Open Meta Events Manager → Test Events
- [ ] Trigger sign-up → `CompleteRegistration` appears
- [ ] Trigger subscription → `Subscribe` appears
- [ ] Trigger contact view → `ViewContent` appears
- [ ] Verify `user_data` contains hashed fields (when ATT granted)
- [ ] Verify `app_data.advertiser_tracking_enabled` = 1 (ATT granted) or 0 (denied)

---

## Edge Cases

- [ ] Kill app mid-operation → relaunch → no data corruption
- [ ] Airplane mode → graceful error messages (not crashes)
- [ ] Low storage → app handles gracefully
- [ ] Switch between Wi-Fi and cellular → no broken state
- [ ] Background → foreground → state preserved

---

## Sign-Off

| Tester | Device | iOS Version | Date | Result |
|--------|--------|-------------|------|--------|
| | | | | Pass / Fail |
