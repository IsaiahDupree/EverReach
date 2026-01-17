# Routing Map

Status legend
- prod: canonical, current
- legacy: archived, do not edit
- tabs: inside /(tabs)

## Canonical screens (prod)
- / (tabs) → app/(tabs)/home.tsx [tabs]
  - Feature location: features/dashboard/screens/Home.tsx (planned)
- /(tabs)/people → app/(tabs)/people.tsx [tabs]
  - Feature location: features/people/screens/People.tsx (moved ✅)
- /(tabs)/chat → app/(tabs)/chat.tsx [tabs]
  - Feature location: features/chat/screens/ChatTab.tsx (planned)
- /contact/[id] → app/contact/[id].tsx
  - Feature location: features/contacts/screens/ContactDetail.tsx (moved ✅)
- /contact-context/[id] → app/contact-context/[id].tsx
  - Feature location: features/contacts/screens/ContactContext.tsx (moved ✅)
- /contact-notes/[id] → app/contact-notes/[id].tsx
  - Feature location: features/contacts/screens/ContactNotes.tsx (moved ✅)
- /voice-note → app/voice-note.tsx
  - Feature location: features/notes/screens/VoiceNote.tsx (moved ✅)
- /screenshot-analysis → app/screenshot-analysis.tsx
  - Feature location: features/screenshots/screens/ScreenshotAnalysis.tsx (planned)
- /goal-picker → app/goal-picker.tsx
  - Feature location: features/messaging/screens/GoalPicker.tsx (planned)
- /message-results → app/message-results.tsx
  - Feature location: features/messaging/screens/MessageResults.tsx (planned)
- /message-sent-success → app/message-sent-success.tsx
  - Feature location: features/messaging/screens/MessageSentSuccess.tsx (planned)
- /personal-notes → app/personal-notes.tsx
  - Feature location: features/notes/screens/PersonalNotes.tsx (moved ✅)
- /personal-profile → app/personal-profile.tsx
  - Feature location: features/settings/screens/PersonalProfile.tsx (planned)
- /notifications → app/notifications.tsx
  - Feature location: features/settings/screens/Notifications.tsx (planned)
- /subscription-plans → app/subscription-plans.tsx
  - Feature location: features/settings/screens/SubscriptionPlans.tsx (planned)
- /feature-request → app/feature-request.tsx
  - Feature location: features/settings/screens/FeatureRequest.tsx (planned)

## Legacy/archived (legacy)
- /legacy/contact/[id]-old.tsx
- /legacy/contact/[id]-enhanced.tsx

## Test/Dev utilities
- /openai-test → app/openai-test.tsx
- /supabase-test → app/supabase-test.tsx
- /api-test-suite → app/api-test-suite.tsx
- /warmth-alerts-test → app/warmth-alerts-test.tsx
- /contact-import-test → app/contact-import-test.tsx

## Navigation helpers (lib/navigation.ts)
- go.home()
- go.people()
- go.contact(id)
- go.context(id, { tab })
- go.voiceNote(personId, personName?)
- go.screenshotAnalysis(personId?)
- go.goalPicker(personId, channel)
- go.chatWithPrompt(prompt)
- go.contactNotes(id)
- go.subscriptionPlans()

## Guidelines
- Add new screens under features/<domain>/{screens,components} when possible.
- Prefer go.* helpers over raw router.push strings.
- Use BottomNav for custom bottom bar, and hide native tab bar when both would show.
- Move experimental/duplicate screens to /legacy, do not delete without review.
