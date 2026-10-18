# App Route Manifest (EverReach)

This is the definitive list of pages (expo-router routes) currently in the app. The `useScreenTracking` hook emits events using `usePathname()`, which includes group segments, e.g., `/(tabs)/home`. Use these exact paths to verify events in your backend/PostHog.

Expected events per route:
- screen_view
- screen_duration (on route change and when app backgrounds)

---

## Tabs (grouped)
- /(tabs)/home  — file: app/(tabs)/home.tsx
- /(tabs)/people  — file: app/(tabs)/people.tsx
- /(tabs)/chat  — file: app/(tabs)/chat.tsx
- /(tabs)/settings  — file: app/(tabs)/settings.tsx

## Primary routes
- /  — file: app/index.tsx
- /sign-in  — file: app/sign-in.tsx
- /onboarding  — file: app/onboarding.tsx
- /upgrade-onboarding  — file: app/upgrade-onboarding.tsx
- /subscription-plans  — file: app/subscription-plans.tsx
- /import-contacts  — file: app/import-contacts.tsx
- /import-third-party  — file: app/import-third-party.tsx
- /personal-notes  — file: app/personal-notes.tsx
- /personal-profile  — file: app/personal-profile.tsx
- /privacy-settings  — file: app/privacy-settings.tsx
- /mode-settings  — file: app/mode-settings.tsx
- /notifications  — file: app/notifications.tsx
- /privacy-policy  — file: app/privacy-policy.tsx
- /terms-of-service  — file: app/terms-of-service.tsx
- /health-status  — file: app/health-status.tsx
- /account-billing  — file: app/account-billing.tsx
- /reset-password  — file: app/reset-password.tsx
- /screenshot-analysis  — file: app/screenshot-analysis.tsx
- /message-templates  — file: app/message-templates.tsx

## Dynamic routes
- /contact/[id]  — file: app/contact/[id].tsx
- /contact_2/[id]  — file: app/contact_2/[id].tsx
- /contact-context/[id]  — file: app/contact-context/[id].tsx
- /contact-notes/[id]  — file: app/contact-notes/[id].tsx
- /contact-history/[id]  — file: app/contact-history/[id].tsx

## Modal-presented routes (flagged in app/_layout.tsx)
- /add-contact  — file: app/add-contact.tsx  (presentation: fullScreenModal)
- /voice-note  — file: app/voice-note.tsx  (presentation: fullScreenModal)
- /goal-picker  — file: app/goal-picker.tsx  (presentation: fullScreenModal)
- /message-results  — file: app/message-results.tsx  (presentation: fullScreenModal)
- /message-sent-success  — file: app/message-sent-success.tsx  (presentation: fade modal)

## Auth and error handling
- /auth/callback  — file: app/auth/callback.tsx
- /+not-found  — file: app/+not-found.tsx

## Dev/Test/Diagnostics
- /openai-test  — file: app/openai-test.tsx
- /supabase-test  — file: app/supabase-test.tsx
- /supabase-debug  — file: app/supabase-debug.tsx
- /api-test-suite  — file: app/api-test-suite.tsx
- /api-playground  — file: app/api-playground.tsx
- /api-debug-contacts  — file: app/api-debug-contacts.tsx
- /agent-chat-test  — file: app/agent-chat-test.tsx
- /audio-test  — file: app/audio-test.tsx
- /avatar-upload-test  — file: app/avatar-upload-test.tsx
- /chat-intro  — file: app/chat-intro.tsx
- /concierge-demo  — file: app/concierge-demo.tsx
- /contacts-load-test  — file: app/contacts-load-test.tsx
- /contact-import-test  — file: app/contact-import-test.tsx
- /contact-save-test  — file: app/contact-save-test.tsx
- /feature-request  — file: app/feature-request.tsx
- /notes-test  — file: app/notes-test.tsx
- /local-only  — file: app/local-only.tsx
- /payment-events-test  — file: app/payment-events-test.tsx
- /trpc-test  — file: app/trpc-test.tsx
- /warmth-alerts-test  — file: app/warmth-alerts-test.tsx
- /warmth-settings  — file: app/warmth-settings.tsx

---

## Backend verification checklist
For each route above, confirm you are seeing:
- An event named `screen_view` with `screen_name` equal to the route path (e.g., `/(tabs)/home`)
- Subsequent `screen_duration` events for the same `screen_name`

Optional element/tap coverage (if using TrackedPressable):
- Events like `ui_press` or custom names, with `element_id` and `route` in props

---

Last generated: 2025-11-02
