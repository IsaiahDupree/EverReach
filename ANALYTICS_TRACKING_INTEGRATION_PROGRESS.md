# Analytics Tracking Integration Progress

**Date**: Current Session  
**Status**: Phase 2 - Screen Integration In Progress

---

## ✅ Completed (Infrastructure)

### 1. PostHog React Native Provider
**File**: `providers/PostHogProvider.tsx`

**Features**:
- ✅ Wraps app with `posthog-react-native`
- ✅ Reads API key from environment variables
- ✅ Enables app lifecycle event capture
- ✅ Enables screen tracking (auto-capture)
- ✅ Privacy-first (no touch autocapture)
- ✅ Graceful fallback if API key missing

### 2. App Layout Integration
**File**: `app/_layout.tsx`

**Changes**:
- ✅ Added PostHogProvider to provider tree
- ✅ Wraps entire app for global tracking
- ✅ Positioned correctly in provider hierarchy

### 3. Analytics Types
**File**: `types/analytics.ts`

**Features**:
- ✅ 95+ event type definitions
- ✅ Type-safe event properties
- ✅ Event context interface
- ✅ Synced with backend event definitions

### 4. Analytics Hook
**File**: `hooks/useAnalytics.ts` (existing)

**Features**:
- ✅ `track()` - Track events with type safety
- ✅ `trackScreen()` - Track screen views
- ✅ `identify()` - Identify users
- ✅ `reset()` - Reset on logout
- ✅ Auto user identification on auth change

---

## ✅ Screens with Tracking

### 1. Sign In Screen (`app/sign-in.tsx`)
**Events Tracked**:
- ✅ `screen_rendered` - When screen loads
- ✅ `user_signed_up` - After successful signup (email/google/apple)
- ✅ `user_logged_in` - After successful login (email/google/apple)

**Properties**:
```typescript
user_signed_up: { method: 'email' | 'google' | 'apple' }
user_logged_in: { method: 'email' | 'google' | 'apple' }
screen_rendered: { screen_name: 'sign_in', render_time_ms: 0 }
```

### 2. Add Contact Screen (`app/add-contact.tsx`)
**Events Tracked**:
- ✅ `screen_rendered` - When screen loads (add_contact / edit_contact)
- ✅ `contact_created` - When new contact saved
- ✅ `contact_updated` - When existing contact updated

**Properties**:
```typescript
contact_created: {
  source: 'manual',
  has_email: boolean,
  has_phone: boolean,
  has_tags: boolean
}
contact_updated: {}
screen_rendered: { 
  screen_name: 'add_contact' | 'edit_contact',
  render_time_ms: 0 
}
```

### 3. Message Results Screen (`app/message-results.tsx`)
**Events Tracked**:
- ✅ `screen_rendered` - When screen loads
- ✅ `ai_message_generated` - When AI creates message variants
- ✅ `ai_message_edited` - When user manually edits a message
- ✅ `ai_message_accepted` - When user copies message (implicit acceptance)
- ✅ `message_sent` - When user sends message via SMS/email/share

**Properties**:
```typescript
ai_message_generated: {
  channel: 'email' | 'sms' | 'dm',
  goal: string,
  tone: string,
  generation_time_ms: number
}
ai_message_edited: {}
ai_message_accepted: {}
message_sent: {
  channel: 'email' | 'sms' | 'dm',
  character_count: number,
  was_ai_generated: true,
  goal: string
}
screen_rendered: { 
  screen_name: 'message_results',
  render_time_ms: 0 
}
```

---

## 🔄 Next Screens to Integrate

### Priority 1: Contact Screens
- [ ] **Contact Detail** (`app/contact/[id].tsx`)
  - Track `contact_viewed` event
  - Track interaction logging
  - Track message sending from detail

- [ ] **Import Contacts** (`app/import-contacts.tsx`)
  - Track `contact_imported` event with count
  - Track import source (device/csv/etc)

### Priority 2: Messaging & AI
- [ ] **Message Results** (`app/message-results.tsx`)
  - Track `ai_message_generated` 
  - Track `ai_message_accepted`
  - Track `ai_message_rejected`
  - Track `message_sent`

- [ ] **Goal Picker** (`app/goal-picker.tsx`)
  - Track goal selection

### Priority 3: Onboarding
- [ ] **Onboarding Flow** (`app/onboarding.tsx`)
  - Track `onboarding_started`
  - Track `onboarding_step_completed` per step
  - Track `onboarding_completed`
  - Track `onboarding_skipped`

### Priority 4: Subscription & Monetization
- [ ] **Subscription Plans** (`app/subscription-plans.tsx`)
  - Track `plan_viewed`
  - Track `plan_selected`
  - Track `checkout_started`

- [ ] **Paywall** (`app/paywall.tsx`)
  - Track paywall impressions
  - Track conversion events

### Priority 5: Voice & Screenshots
- [ ] **Voice Note** (`app/voice-note.tsx`)
  - Track `voice_note_recorded`
  - Track `voice_note_transcribed`
  - Track `voice_note_processed`

- [ ] **Screenshot Upload**
  - Track `screenshot_uploaded`
  - Track `screenshot_ocr_completed`
  - Track `screenshot_analyzed`

### Priority 6: Settings & Preferences
- [ ] **Settings Screens**
  - Track preference changes
  - Track theme changes
  - Track notification opt in/out

---

## 📊 Event Categories Covered

### Currently Tracked (2 categories):
1. ✅ **Auth & Identity** (2/6 events)
   - user_signed_up ✅
   - user_logged_in ✅
   - user_logged_out ❌
   - password_reset_requested ❌
   - password_reset_succeeded ❌
   - email_verified ❌

2. ✅ **Contacts** (2/6 events)
   - contact_created ✅
   - contact_updated ✅
   - contact_deleted ❌
   - contact_imported ❌
   - contact_viewed ❌
   - contacts_searched ❌

3. ✅ **Messages** (1/4 events)
   - message_sent ✅
   - message_drafted ❌
   - message_scheduled ❌
   - message_template_used ❌

4. ✅ **AI Features** (4/7 events)
   - ai_message_generated ✅
   - ai_message_edited ✅
   - ai_message_accepted ✅
   - ai_message_rejected ❌
   - ai_contact_analyzed ❌
   - ai_suggestion_viewed ❌
   - ai_suggestion_accepted ❌

### Not Yet Tracked (11 categories):
5. ❌ **Onboarding** (0/4 events)
6. ❌ **Interactions** (0/3 events)
7. ❌ **Warmth** (0/3 events)
8. ❌ **Screenshots** (0/5 events)
9. ❌ **Voice Notes** (0/3 events)
10. ❌ **Engagement** (0/6 events)
11. ❌ **Monetization** (0/8 events)
12. ❌ **Lifecycle** (0/6 events)
13. ❌ **Performance** (0/6 events)
14. ❌ **Feature Discovery** (0/4 events)

---

## 🎯 Coverage Goals

### Current Status
- **Events Covered**: 9 / 95+ (9%)
- **Screens with Tracking**: 3 / 21 (14%)
- **Event Categories**: 4 / 15 (27%)

### Target After Phase 2 (Screen Integration)
- **Events Covered**: 30-40 / 95+ (30-40%)
- **Screens with Tracking**: 12-15 / 21 (60-70%)
- **Event Categories**: 8-10 / 15 (50-65%)

### Full Coverage Goal
- **Events Covered**: 80+ / 95+ (85%+)
- **Screens with Tracking**: 18-20 / 21 (85-95%)
- **Event Categories**: 13-14 / 15 (85-90%)

---

## 🛠 Implementation Guidelines

### Adding Tracking to a Screen

1. **Import the hook**:
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
```

2. **Get track function**:
```typescript
const { track } = useAnalytics();
```

3. **Track screen view**:
```typescript
useEffect(() => {
  track('screen_rendered', { 
    screen_name: 'your_screen_name', 
    render_time_ms: 0 
  });
}, [track]);
```

4. **Track user actions**:
```typescript
const handleAction = async () => {
  // ... perform action
  track('event_name', { 
    property1: value1,
    property2: value2 
  });
};
```

### Type Safety
- All events are type-checked
- Properties must match the event type definition
- TypeScript will catch invalid event names or properties

### Privacy
- Never track PII (names, emails, message content)
- Track derived metrics (counts, lengths, booleans)
- User IDs are automatically hashed by PostHog

---

## 📝 Environment Setup

### Required Environment Variables
```bash
# Mobile (.env)
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_project_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Testing
1. Set up PostHog project
2. Add API key to `.env`
3. Run app: `npm start`
4. Perform tracked actions
5. Check PostHog "Live Events" tab

---

## 🚀 Next Steps

### Immediate (This Session)
1. ✅ Create PostHogProvider
2. ✅ Integrate into app layout
3. ✅ Add tracking to sign-in
4. ✅ Add tracking to add-contact
5. 🔄 Add tracking to message-results
6. 🔄 Add tracking to contact detail
7. 🔄 Add tracking to onboarding

### Short Term (Next Session)
1. Add tracking to all priority 1-3 screens
2. Test event flow end-to-end
3. Verify data in PostHog dashboard
4. Document any edge cases

### Medium Term
1. Add tracking to remaining screens
2. Implement performance tracking (API calls, render times)
3. Set up conversion funnels in PostHog
4. Create analytics dashboard queries

---

## 📈 Success Metrics

### Phase 2 Complete When:
- [x] PostHogProvider integrated
- [x] Sign-in tracking working
- [x] Contact creation tracking working
- [ ] 10+ screens have tracking
- [ ] 25+ events being tracked
- [ ] Real data visible in PostHog

### Production Ready When:
- [ ] 80%+ events covered
- [ ] 85%+ screens covered
- [ ] No tracking errors in logs
- [ ] Privacy review complete
- [ ] Performance impact < 5ms avg

---

**Status**: 🟢 On Track  
**Next Focus**: Message screens and onboarding  
**Estimated Completion**: 2-3 hours for core screens
