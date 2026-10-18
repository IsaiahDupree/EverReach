# Reviewer Accounts & Review Notes (Apple + Google)

Use this file to populate App Store Connect “Review Information” and Google Play “App Content → App Access” sections. Replace placeholders before submission.

---

## Contact

- Name: EverReach Submissions Team
- Email: submissions@everreach.app
- Phone: +1 (___) ___‑____ (optional)

---

## Sign‑in & Access

- Sign‑in required: Yes
- Authentication methods: Email + Password (primary). Sign in with Apple optional.
- Region limitations: None

### Reviewer Test Account (in‑app)

Provide an in‑app account for both Apple and Google reviewers.

- Email: reviewer+everreach@yourdomain.com
- Password: REPLACE_ME

Notes:
- This account has no PII beyond sample data.
- It is safe to reset at any time after review.

### Optional: Additional Test Accounts
- Email: reviewer2+everreach@yourdomain.com / Password: REPLACE_ME
- Email: qa+everreach@yourdomain.com / Password: REPLACE_ME

---

## Features To Verify (Happy Path)

1. Sign in with the reviewer account
2. Open any contact → view context (interests, last topics, warmth)
3. Add a note (voice or text)
4. Search for a tag or interest
5. Open Settings → Subscription → View Plans
6. Start 7‑day trial → subscribe (StoreKit test on iOS or Play internal track on Android)
7. Verify subscription status reflects “Active” and premium features unlock

---

## In‑App Purchases / Subscriptions

- Entitlement: EverReach Core
- Subscription group: EverReach Core
- Products:
  - Monthly: `com.everreach.core.monthly` — $14.99
  - Annual: `com.everreach.core.yearly` — $152.99
- Trial: 7 days

### iOS (Apple App Store)
- Purchase flow uses StoreKit and RevenueCat.
- Apple reviewers may test purchase with internal tooling; no sandbox steps required from us.
- If needed for reproducibility, we also support StoreKit Configuration for local testing.

### Android (Google Play)
- Purchase flow uses Google Play Billing (via RevenueCat).
- Test on Internal Testing track with license tester account.

---

## App Behavior Notes (For Review Team)

- **Contacts & Notes**: Contacts may include generated demo content for demonstration.
- **Voice Notes**: First‑time microphone permission request explains usage clearly.
- **Privacy**: No third‑party advertising or tracking. Data is encrypted in transit. Users can request account deletion.
- **Notifications**: Not required for core usage. No background tracking.

---

## How To Reach Paywall Quickly

- Settings tab → Subscription → View Plans → Tap “Subscribe” on Monthly/Annual.

---

## Demo Data Reset (If Needed)

- If the reviewer account appears modified from prior tests, you can reset it. Contact submissions@everreach.app and we’ll refresh the account within 24 hours.

---

## Known Limitations (None blocking)

- Initial analytics may be sparse on a brand‑new reviewer account.

---

## Attachments (Optional)

- PDF: Product overview one‑pager (attach if available)
- Privacy policy URL: https://everreach.app/privacy
- Support URL: https://everreach.app/support
