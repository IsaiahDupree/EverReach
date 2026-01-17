# Feature-based Structure Plan (Phase 2)

Goal: simplify discovery and ownership by grouping code by domain.

No moves yet (plan-only). This document proposes the structure, owners, and move checklist.

## Proposed folders

features/
- contacts/
  - screens/
    - ContactDetail (maps to app/contact/[id].tsx)
    - ContactContext (maps to app/contact-context/[id].tsx)
    - ContactNotes (maps to app/contact-notes/[id].tsx)
  - components/
    - InteractionsTimeline, GoalSuggestionsCard, AIInsightsCard, ChannelsCard
  - hooks/
    - useContactDetail, useContactFiles
  - README.md
- messaging/
  - screens/
    - GoalPicker (app/goal-picker.tsx)
    - MessageResults (app/message-results.tsx)
    - MessageSentSuccess (app/message-sent-success.tsx)
  - components/
    - CraftMessageModal, CustomMessageGoalModal, GoalPicker/ui
  - hooks/
    - useMessages
  - README.md
- notes/
  - screens/
    - PersonalNotes (app/personal-notes.tsx)
    - VoiceNote (app/voice-note.tsx)
  - components/
    - AIInputBox, VoiceMicButton
  - hooks/
    - useVoiceNotes
  - README.md
- screenshots/
  - screens/
    - ScreenshotAnalysis (app/screenshot-analysis.tsx)
  - hooks/
    - useScreenshotAnalysis
  - README.md
- settings/
  - screens/
    - Settings (app/(tabs)/settings.tsx)
    - PrivacySettings (app/privacy-settings.tsx)
  - components/
    - (settings-only UI)
  - README.md
- dashboard/
  - screens/
    - Home (app/(tabs)/home.tsx)
  - README.md
- people/
  - screens/
    - People (app/(tabs)/people.tsx)
  - README.md
- chat/
  - screens/
    - ChatTab (app/(tabs)/chat.tsx)
  - components/
    - ChatInterface
  - README.md

## Ownership and rules
- Canonical pages live under features/<domain>/screens with 1:1 mapping back to app routes.
- Shared components that are cross-domain live under components/ at repo root or a new features/shared/.
- Use lib/navigation.go helpers exclusively for navigation from features code.
- Move legacy or experimental pages to app/legacy/ and annotate with @deprecated.

## Migration checklist (per screen)
1) Create destination folder under features/<domain>/screens.
2) Move file and update imports (paths & absolute aliases).
3) Update route imports (ROUTING_MAP.md and pages/index.ts if needed).
4) Run quick compile and smoke test.
5) Delete stale imports from old location.

## Phase 2.1 (no-code move pilots)
- Identify 2-3 low-risk screens to move first (e.g., People, PersonalNotes, VoiceNote).
- Prove out import path updates and ensure no circular deps.

## Path mapping (initial)
- app/contact/[id].tsx → features/contacts/screens/ContactDetail.tsx
- app/contact-context/[id].tsx → features/contacts/screens/ContactContext.tsx
- components/contact/* → features/contacts/components/*
- app/(tabs)/people.tsx → features/people/screens/People.tsx
- app/(tabs)/home.tsx → features/dashboard/screens/Home.tsx
- app/(tabs)/chat.tsx → features/chat/screens/ChatTab.tsx
- components/CraftMessageModal.tsx → features/messaging/components/CraftMessageModal.tsx
- app/goal-picker.tsx → features/messaging/screens/GoalPicker.tsx
- app/message-results.tsx → features/messaging/screens/MessageResults.tsx
- app/message-sent-success.tsx → features/messaging/screens/MessageSentSuccess.tsx
- app/personal-notes.tsx → features/notes/screens/PersonalNotes.tsx
- app/voice-note.tsx → features/notes/screens/VoiceNote.tsx
- app/screenshot-analysis.tsx → features/screenshots/screens/ScreenshotAnalysis.tsx
- app/(tabs)/settings.tsx → features/settings/screens/Settings.tsx
- app/privacy-settings.tsx → features/settings/screens/PrivacySettings.tsx

## Risks & mitigations
- Import path churn → use absolute aliases (@/features/*) and run a codemod.
- Circular dependencies → keep feature boundaries clean; extract shared to features/shared/.
- Large diff risk → move in small batches (2-3 files), verify each.

## Tooling
- Add a codemod script to rewrite imports during moves.
- ESLint rule: forbid importing from app/legacy/* inside features.
- Optional generators (plop/hygen) for new screens/components/hooks.
