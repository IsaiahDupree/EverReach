# Event Tracking Audit — Full Map

> Generated from codebase audit. Shows every tracked event, where it fires,
> whether it reaches Meta, and whether it reaches RevenueCat server-side.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Meta | Event is mapped to a Meta standard/custom event via `autoTrackToMeta()` |
| ❌ Meta | Event is NOT forwarded to Meta (internal analytics only) |
| 🔄 Server | Event is forwarded server-side via RevenueCat webhook → Meta CAPI emitter |

---

## 1. Monetization Funnel (ROAS-Critical)

These events directly affect Meta ad optimization and ROAS measurement.

| Internal Event | Meta Event | Fired From | Source |
|---|---|---|---|
| `purchase_completed` ✅ | **Purchase** | `app/subscription-plans.tsx:697` | Client (after RevenueCat purchase) |
| `trial_started` ✅ | **StartTrial** | `app/subscription-plans.tsx:711` | Client (detected from entitlement periodType) |
| `subscription_upgraded` ✅ | **Subscribe** | `app/subscription-plans.tsx:718` | Client |
| `auth_sign_up` ✅ | **CompleteRegistration** | `app/auth.tsx:111` | Client (after Supabase signUp) |
| `paywall_viewed` ✅ | **ViewContent** (paywall) | `metaAppEvents.ts` mapping | Client (when paywall screen loads) |
| `payment_info_added` ✅ | **AddPaymentInfo** | `metaAppEvents.ts` mapping | Client |

### Server-Side (RevenueCat Webhook → Meta CAPI)

| RevenueCat Event | Meta Event | Emitter |
|---|---|---|
| `INITIAL_PURCHASE` 🔄 | **Purchase** | `meta-capi.ts` |
| `INITIAL_PURCHASE` (trial) 🔄 | **StartTrial** | `meta-capi.ts` |
| `RENEWAL` 🔄 | **Purchase** (renewal) | `meta-capi.ts` |
| `CANCELLATION` 🔄 | **Cancel** (custom) | `meta-capi.ts` |
| `EXPIRATION` 🔄 | **Churn** (custom) | `meta-capi.ts` |
| `BILLING_ISSUE` 🔄 | **BillingIssue** (custom) | `meta-capi.ts` |
| `PRODUCT_CHANGE` 🔄 | **Subscribe** | `meta-capi.ts` |
| `UNCANCELLATION` 🔄 | **Reactivate** (custom) | `meta-capi.ts` |
| `REFUND` 🔄 | **Refund** (custom) | `meta-capi.ts` |

### Deduplication

- Client events use auto-generated `event_id` (UUID)
- Server events prefix with `rc_` (e.g., `rc_evt_abc123`)
- Meta deduplicates by `event_id` within 48h window
- `INITIAL_PURCHASE` fires both client-side (`purchase_completed`) and server-side — different event_ids, both reach Meta

---

## 2. Marketing Funnel

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `welcome_screen_viewed` ❌ | — | `app/welcome.tsx:169` |
| `welcome_slide_viewed` ❌ | — | `app/welcome.tsx:178` |
| `welcome_completed` ❌ | — | `app/welcome.tsx:208` |
| `welcome_skipped` ❌ | — | `app/welcome.tsx:221` |
| `welcome_focus_selected` ❌ | — | `app/welcome.tsx:239` |
| `lead_captured` ✅ | **Lead** | mapping only (not yet fired from UI) |
| `install_tracked` ✅ | **AppInstall** | mapping only |
| `first_open_post_install` ✅ | **AppInstall** | mapping only |
| `qualified_signup` ✅ | **Lead** | mapping only |
| `activation_event` ✅ | **Activation** (custom) | mapping only |

---

## 3. Onboarding Flow

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `onboarding_viewed` ❌ | — | `app/onboarding.tsx:78` |
| `onboarding_step_viewed` ❌ | — | `app/onboarding.tsx:83` |
| `onboarding_focus_selected` ❌ | — | `app/onboarding.tsx:91` |
| `onboarding_contact_chosen` ❌ | — | `app/onboarding.tsx:114` |
| `onboarding_contact_selected` ❌ | — | `app/onboarding.tsx:137` |
| `onboarding_message_regenerated` ❌ | — | `app/onboarding.tsx:174` |
| `onboarding_message_copied` ❌ | — | `app/onboarding.tsx:206` |
| `onboarding_mark_sent` ❌ | — | `app/onboarding.tsx:221` |
| `onboarding_voice_recorded` ❌ | — | `app/onboarding.tsx:252` |
| `onboarding_voice_transcribed` ❌ | — | `app/onboarding.tsx:258` |
| `onboarding_completed` ❌ | — | `app/onboarding.tsx:272` |
| `onboarding_skipped` ❌ | — | `app/onboarding.tsx:278` |
| `onboarding_reminder_selected` ❌ | — | `app/onboarding.tsx:242` |

---

## 4. Content & Engagement

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `screen_viewed` ✅ | **ViewContent** | `useAnalytics` hook (auto on mount) |
| `contact_viewed` ✅ | **ViewContent** (contact) | `useAnalytics` hook |
| `contact_created` ✅ | **AddToWishlist** | `app/add-contact.tsx:284` (via `analytics.contacts.created`) |
| `contact_searched` ✅ | **Search** | mapping exists |
| `message_sent` ✅ | **Contact** | mapping exists |
| `ai_message_generated` ✅ | **CustomizeProduct** | mapping exists |
| `contact_saved` ❌ | — | `app/add-contact.tsx:309` |

---

## 5. Messaging Flow

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `Message Generated` ❌ | — | `app/message-results.tsx:215` |
| `Message Sent` ❌ | — | `app/message-results.tsx:504` |
| `message_regenerated` ❌ | — | `app/message-results.tsx:413` |
| `message_copied` ❌ | — | `app/message-results.tsx:573` |

> Note: `Message Sent` and `message_sent` are different events. The `message_sent` mapping exists but the app fires `Message Sent` (capitalized). Consider normalizing.

---

## 6. Subscription Screens

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `purchase_succeeded` ❌ | — | `app/subscription-plans.tsx:690` |
| `purchase_completed` ✅ | **Purchase** | `app/subscription-plans.tsx:697` |
| `trial_started` ✅ | **StartTrial** | `app/subscription-plans.tsx:711` |
| `subscription_upgraded` ✅ | **Subscribe** | `app/subscription-plans.tsx:718` |
| `purchase_failed` ❌ | — | `app/subscription-plans.tsx:738` |
| `restore_purchases_initiated` ❌ | — | `app/subscription-plans.tsx` |
| `restore_purchases_succeeded` ❌ | — | `app/subscription-plans.tsx` |
| `restore_purchases_failed` ❌ | — | `app/subscription-plans.tsx` |
| `subscription_checkout_cancelled` ❌ | — | `app/billing/cancel.tsx:14` |
| `subscription_success_viewed` ❌ | — | `app/billing/success.tsx:27` |

---

## 7. RevenueCat Component Events

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `revenuecat_offerings_loaded` ❌ | — | `components/paywall/RevenueCatPaywall.tsx:59` |
| `revenuecat_plan_selected` ❌ | — | `components/paywall/RevenueCatPaywall.tsx:163` |
| `revenuecat_purchase_success` ❌ | — | `components/paywall/RevenueCatPaywall.tsx:187` |
| `revenuecat_purchase_failed` ❌ | — | `components/paywall/RevenueCatPaywall.tsx:201` |
| `revenuecat_purchase_cancelled` ❌ | — | `components/paywall/RevenueCatPaywall.tsx:208` |

---

## 8. Upgrade Onboarding

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `upgrade_onboarding_viewed` ❌ | — | `app/upgrade-onboarding.tsx:81` |
| `upgrade_cta_clicked` ❌ | — | `app/upgrade-onboarding.tsx:97` |
| `upgrade_onboarding_page_viewed` ❌ | — | `app/upgrade-onboarding.tsx:106` |
| `upgrade_onboarding_cta_clicked` ❌ | — | `app/upgrade-onboarding.tsx:116-127` |

---

## 9. Settings & Notifications

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `notifications_frequency_changed` ❌ | — | `app/notifications.tsx:56` |
| `notifications_push_toggled` ❌ | — | `app/notifications.tsx:104` |
| `notifications_cold_alerts_toggled` ❌ | — | `app/notifications.tsx:125` |
| `notifications_quiet_hours_toggled` ❌ | — | `app/notifications.tsx:167` |
| `notifications_sound_toggled` ❌ | — | `app/notifications.tsx:192` |
| `notifications_vibration_toggled` ❌ | — | `app/notifications.tsx:213` |

---

## 10. Personal Notes

| Internal Event | Meta Event | Fired From |
|---|---|---|
| `notes_searched` ❌ | — | `app/personal-notes.tsx:147` |
| `personal_note_deleted` ❌ | — | `app/personal-notes.tsx:193,227` |
| `voice_note_played` ❌ | — | `app/personal-notes.tsx:274` |

---

## 11. Subscription Events (lib/subscriptionEvents.ts)

These events go through `analytics.track()` → `autoTrackToMeta()`:

| Internal Event | Meta Event | Method |
|---|---|---|
| `purchase_started` ❌ | — | `trackPurchaseFlow('start')` |
| `purchase_completed` ✅ | **Purchase** | `trackPurchaseFlow('complete')` |
| `purchase_failed` ❌ | — | `trackPurchaseFlow('fail')` |
| `purchase_cancelled` ❌ | — | `trackPurchaseFlow('cancel')` |
| `paywall_viewed` ✅ | **ViewContent** | `trackPaywall('viewed')` |
| `paywall_plan_selected` ❌ | — | `trackPaywall('plan_selected')` |
| `paywall_dismissed` ❌ | — | `trackPaywall('dismissed')` |

---

## Pipeline Summary

```
User Action in App
    ↓
screenAnalytics.track('event_name', props)
    ↓
analytics.track()
    ├── Backend API (/api/v1/events/track)
    ├── PostHog
    └── autoTrackToMeta()
         ├── mapToMetaEvent() → null? → STOP
         └── trackMetaEvent()
              ├── Native SDK (if available)
              └── Queue → flushEventQueue() → Meta Conversions API

RevenueCat Webhook (server-side)
    ↓
processWebhookEvent()
    ├── Supabase DB update
    └── emitAll(normalizedEvent)
         └── metaCAPIEmitter.emit()
              └── fetch() → Meta Conversions API
```

---

## Events That Reach Meta (Complete List)

### Client-Side (via autoTrackToMeta)
1. `auth_sign_up` → CompleteRegistration
2. `trial_started` → StartTrial
3. `subscription_upgraded` → Subscribe
4. `purchase_completed` → Purchase
5. `paywall_viewed` → ViewContent (paywall)
6. `payment_info_added` → AddPaymentInfo
7. `screen_viewed` → ViewContent
8. `contact_viewed` → ViewContent (contact)
9. `contact_created` → AddToWishlist
10. `contact_searched` → Search
11. `message_sent` → Contact
12. `lead_captured` → Lead
13. `install_tracked` → AppInstall
14. `first_open_post_install` → AppInstall
15. `activation_event` → Activation
16. `qualified_signup` → Lead
17. `ai_message_generated` → CustomizeProduct

### Server-Side (via RevenueCat webhook → emitter)
18. INITIAL_PURCHASE → Purchase / StartTrial
19. RENEWAL → Purchase (renewal)
20. CANCELLATION → Cancel
21. EXPIRATION → Churn
22. BILLING_ISSUE → BillingIssue
23. PRODUCT_CHANGE → Subscribe
24. UNCANCELLATION → Reactivate
25. REFUND → Refund
