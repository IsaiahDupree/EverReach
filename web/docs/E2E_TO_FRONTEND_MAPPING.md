# E2E Tests → Frontend Component Mapping

This document maps every E2E test to the required frontend components to make them pass.

---

## ✅ e2e/home.spec.ts (3 tests) - COMPLETE

### Test: "loads successfully"
**Expected**: 
- Page title contains "EverReach"
- Navigation visible
- Links to Contacts and Alerts

**Current Status**: ✅ Complete
- `app/layout.tsx` has navigation
- Links exist

### Test: "has working navigation links"
**Expected**:
- Click "Contacts" → Navigate to /contacts
- Click "Alerts" → Navigate to /alerts

**Current Status**: ✅ Complete
- Navigation links working

### Test: "PostHog tracking initializes"
**Expected**:
- PostHog object exists on window
- Pageview tracked

**Current Status**: ✅ Complete
- PostHog provider initialized

---

## ⚠️ e2e/auth.spec.ts (6 tests) - 50% COMPLETE

### Test: "login page loads"
**Expected**:
- Heading with "login" or "sign in"
- Email input (`input[name="email"]` or `input[type="email"]`)
- Password input (`input[name="password"]` or `input[type="password"]`)

**Current Status**: ⚠️ Needs work
**Required Components**:
- [ ] `app/login/page.tsx` - Complete login form
- [ ] Email input field
- [ ] Password input field
- [ ] Submit button

### Test: "protected routes redirect to login"
**Expected**:
- Accessing /contacts without auth → Redirect to /login

**Current Status**: ✅ Has `RequireAuth` wrapper
**May Need**: Better redirect handling

### Test: "login form validation works"
**Expected**:
- Empty form submission shows validation
- Stays on /login page

**Current Status**: ❌ Missing
**Required Components**:
- [ ] Client-side validation
- [ ] Error message display

### Test: "Google OAuth login button exists"
**Expected**:
- Button with text "Google" or "Sign in with Google"

**Current Status**: ❌ Missing
**Required Components**:
- [ ] Google OAuth button
- [ ] Supabase OAuth integration

### Test (SKIPPED): "successful login redirects to home"
**Required for future**:
- Working login flow
- Session management
- Redirect after auth

### Test (SKIPPED): "logout works correctly"
**Required for future**:
- Logout button
- Session cleanup

---

## ✅ e2e/contacts.spec.ts (10 tests) - 95% COMPLETE

### Test: "contacts list page loads"
**Expected**: Heading with "contacts"
**Status**: ✅ Complete

### Test: "contacts list fetches from real API"
**Expected**: 
- API call to `/v1/contacts`
- Contact cards or empty state

**Status**: ✅ Complete
**Components**: `ContactRow`, `useContacts` hook

### Test: "create contact button exists"
**Expected**: Button with "Add", "New", or "Create"
**Status**: ✅ Complete

### Test: "search/filter functionality exists"
**Expected**: Search input
**Status**: ✅ Complete (`SearchBar` component)

### Tests (SKIPPED): Detail pages, CRUD operations
**Required**:
- [ ] Contact detail page enhancements
- [ ] Edit/delete confirmation modals

---

## ⚠️ e2e/alerts.spec.ts (9 tests) - 50% COMPLETE

### Test: "alerts page loads"
**Expected**: Heading with "alerts" or "warmth alerts"
**Current Status**: ⚠️ Basic page exists
**Required**:
- [ ] `app/alerts/page.tsx` - Complete implementation

### Test: "alerts list fetches from real API"
**Expected**:
- API call to `/v1/alerts`
- Alert items (`[data-testid="alert-item"]` or `.alert-card`)
- Empty state with "no alerts"

**Current Status**: ⚠️ Partial
**Required Components**:
- [ ] Alert list container
- [ ] Alert card with `data-testid="alert-item"`
- [ ] Empty state component

### Test: "alert cards show contact information"
**Expected**:
- Alert card visible
- Contact name/info displayed

**Current Status**: ⚠️ Partial
**Required Components**:
- [ ] Enhanced `AlertCard` with contact data

### Tests (SKIPPED): Alert actions
**Expected**:
- Dismiss button (`button:has-text("Dismiss")` or `button[data-action="dismiss"]`)
- Snooze button (`button:has-text("Snooze")` or `button[data-action="snooze"]`)
- Reached out button (`button:has-text("Reached Out")` or `button[data-action="reached_out"]`)

**Required Components**:
- [ ] `AlertActions` component
- [ ] Action button handlers
- [ ] API mutations for each action

### Tests (SKIPPED): Filters and sorting
**Required**:
- [ ] Filter dropdown/buttons
- [ ] Sort controls

---

## ❌ e2e/settings.spec.ts (13 tests) - 10% COMPLETE

### Test: "settings page loads"
**Expected**: Heading with "settings" or "preferences"
**Current Status**: ❌ Placeholder only
**Required**:
- [ ] `app/settings/page.tsx` - Complete implementation

### Test: "settings form exists"
**Expected**: Form element
**Required Components**:
- [ ] Settings form container

### Test: "user profile section exists"
**Expected**:
- Name input (`input[name="name"]` or `input[name="displayName"]`)
- Email display

**Required Components**:
- [ ] `app/settings/profile/page.tsx`
- [ ] Profile form fields

### Tests (SKIPPED): Settings updates
**Expected**:
- Theme selector (`select[name="theme"]`)
- Notification checkboxes
- Warmth threshold input
- Save button

**Required Components**:
- [ ] `app/settings/notifications/page.tsx`
- [ ] `app/settings/alerts/page.tsx`
- [ ] Theme toggle
- [ ] Notification preferences

### Tests (SKIPPED): Account management
**Expected**:
- Account info display
- Change password section
- Delete account button

**Required Components**:
- [ ] `app/settings/account/page.tsx`
- [ ] Password change form
- [ ] Account deletion modal

### Tests (SKIPPED): Connected services
**Expected**:
- OAuth connections display
- Disconnect buttons

**Required Components**:
- [ ] `app/settings/connections/page.tsx`
- [ ] OAuth provider cards

### Tests (SKIPPED): Data & privacy
**Expected**:
- Export data button
- Privacy settings section

**Required Components**:
- [ ] `app/settings/privacy/page.tsx`
- [ ] Data export functionality

---

## ❌ e2e/voice-notes.spec.ts (14 tests) - 5% COMPLETE

### Test: "voice notes page loads"
**Expected**: Heading with "voice notes"
**Current Status**: ❌ Placeholder only
**Required**:
- [ ] `app/voice-notes/page.tsx` - Complete implementation

### Test: "upload interface exists"
**Expected**:
- File input (`input[type="file"]`)
- Upload/Record button

**Required Components**:
- [ ] File upload component
- [ ] Record button

### Test: "shows voice notes list or empty state"
**Expected**:
- Voice note items (`[data-testid="voice-note"]` or `.voice-note-card`)
- Empty state with "no voice notes"

**Required Components**:
- [ ] Voice notes list container
- [ ] Voice note card component
- [ ] Empty state

### Tests (SKIPPED): Upload functionality
**Expected**:
- File input accepts audio files
- Upload button triggers upload
- Progress indicator
- Success message

**Required Components**:
- [ ] `components/VoiceNotes/Uploader.tsx`
- [ ] Upload progress component
- [ ] File type validation

### Tests (SKIPPED): Playback
**Expected**:
- Play button
- Audio element
- Transcription display

**Required Components**:
- [ ] `components/VoiceNotes/Player.tsx`
- [ ] Audio controls
- [ ] Transcription viewer

### Tests (SKIPPED): AI processing
**Expected**:
- Processing status indicator
- Extracted contacts display
- Action items display

**Required Components**:
- [ ] `components/VoiceNotes/ProcessingStatus.tsx`
- [ ] Extracted data display
- [ ] Contact mentions tags

### Tests (SKIPPED): Management
**Expected**:
- Delete button
- Date filter
- Search input

**Required Components**:
- [ ] Delete confirmation
- [ ] Filter controls
- [ ] Search bar

---

## 📊 Summary by Priority

### Priority 1: Make Active Tests Pass (19 tests)
These tests are NOT skipped and should pass immediately:

1. ✅ **Home** (3/3 tests) - COMPLETE
2. ⚠️ **Auth** (4/6 tests active) - Need login form
3. ✅ **Contacts** (4/10 tests active) - COMPLETE
4. ⚠️ **Alerts** (3/9 tests active) - Need alert list/cards
5. ⚠️ **Settings** (4/13 tests active) - Need basic structure
6. ⚠️ **Voice Notes** (1/14 tests active) - Need basic structure

### Priority 2: Enable Skipped Tests (36 tests)
These require auth/test data but components should exist:

- Auth flows (2 tests)
- Contact CRUD (6 tests)
- Alert actions (6 tests)
- Settings forms (9 tests)
- Voice note features (13 tests)

---

## 🎯 Build Order Recommendation

### Phase 1: Make Active Tests Pass (Week 1)

#### Day 1: Auth System
- [ ] Complete `app/login/page.tsx`
- [ ] Email/password inputs
- [ ] Google OAuth button
- [ ] Form validation
- [ ] Error states

#### Day 2: Alerts System
- [ ] Complete `app/alerts/page.tsx`
- [ ] Alert list with API integration
- [ ] Alert cards with `data-testid="alert-item"`
- [ ] Empty state
- [ ] Loading states

#### Day 3: Settings Foundation
- [ ] Complete `app/settings/page.tsx`
- [ ] Basic form structure
- [ ] Profile section with name input
- [ ] Email display

#### Day 4: Voice Notes Foundation
- [ ] Complete `app/voice-notes/page.tsx`
- [ ] File input for upload
- [ ] Upload/Record button
- [ ] Voice notes list container
- [ ] Empty state

#### Day 5: Polish & Test
- [ ] Run all E2E tests
- [ ] Fix failing tests
- [ ] Add loading/error states
- [ ] Responsive design check

### Phase 2: Enable Skipped Tests (Week 2)

#### Day 6-7: Full Auth Flow
- [ ] Login flow with session
- [ ] Logout functionality
- [ ] Protected route redirects
- [ ] Session management

#### Day 8: Alert Actions
- [ ] Dismiss action button
- [ ] Snooze action button
- [ ] Reached out action button
- [ ] API mutations
- [ ] Optimistic updates

#### Day 9-10: Settings Pages
- [ ] Profile edit form
- [ ] Notification preferences
- [ ] Alert thresholds
- [ ] Account management
- [ ] Data export

#### Day 11-12: Voice Notes Features
- [ ] File upload with progress
- [ ] Audio playback controls
- [ ] Transcription display
- [ ] AI processing status
- [ ] Delete/filter/search

### Phase 3: Polish & Complete (Week 3)
- [ ] Remove all `.skip` from tests
- [ ] Run full E2E suite
- [ ] Fix any remaining issues
- [ ] Add missing data-testid attributes
- [ ] Improve accessibility
- [ ] Mobile responsiveness

---

## 🏁 Success Criteria

**Phase 1 Complete**: 19/19 active tests passing  
**Phase 2 Complete**: 55/55 total tests passing  
**Phase 3 Complete**: All E2E tests green in CI/CD

---

## 📝 Component Checklist

### Must Build (Priority 1)
- [ ] `app/login/page.tsx` - Complete login form
- [ ] `app/alerts/page.tsx` - Complete alerts list
- [ ] `components/Alerts/AlertCard.tsx` - Enhanced with data
- [ ] `app/settings/page.tsx` - Basic settings structure
- [ ] `app/voice-notes/page.tsx` - Basic voice notes structure

### Should Build (Priority 2)
- [ ] `components/Alerts/AlertActions.tsx` - Action buttons
- [ ] `components/Settings/ProfileForm.tsx` - Profile editing
- [ ] `components/Settings/NotificationToggles.tsx` - Notification prefs
- [ ] `components/VoiceNotes/Uploader.tsx` - File upload
- [ ] `components/VoiceNotes/Player.tsx` - Audio playback

### Nice to Have (Priority 3)
- [ ] `components/VoiceNotes/ProcessingStatus.tsx` - AI status
- [ ] `components/Settings/ThemeToggle.tsx` - Theme switcher
- [ ] `components/Auth/PasswordChange.tsx` - Password form
- [ ] Improved error boundaries
- [ ] Better loading skeletons

---

**Status**: Ready to start building 🚀  
**Next**: Choose Phase 1 Day 1 (Auth) or Day 2 (Alerts) to begin
