# EverReach Onboarding Flow

## Overview
A 9-step onboarding experience that introduces users to EverReach's core value proposition: keeping relationships warm through AI-powered outreach suggestions, warmth tracking, and voice notes.

---

## Flow Summary

| Step | Screen | Purpose |
|------|--------|---------|
| 0 | Welcome | Brand introduction |
| 1 | Focus Selection | Personalization |
| 2 | Contact Selection | First contact import |
| 3 | Message Generation | Show AI outreach |
| 4 | Warmth Score | Introduce warmth concept |
| 5 | Voice Note | Capture context |
| 6 | Reminders | Set notification preferences |
| 7 | Video Showcase | Product demo |
| 8 | Complete | Success & redirect to home |

**Skip available**: Steps 0-7 (user can skip to home anytime)

---

## Step Details

### Step 0: Welcome Screen
**Title**: "Never drop the ball with people again with EverReach."

**Subtitle**: "EverReach is your memory for relationships, powered by warmth."

**UI Elements**:
- EverReach logo (dark/light mode variants)
- "Let's Get Started" button → advances to Step 1

**Analytics**: `onboarding_viewed`

---

### Step 1: Focus Selection
**Title**: "What's most important to you right now in EverReach?"

**Subtitle**: "We'll personalize your experience."

**Options**:
| Focus | Icon | Description |
|-------|------|-------------|
| `networking` | Briefcase | Build professional connections |
| `personal` | Heart | Stay close with friends & family |
| `business` | Handshake | Maintain client relationships |

**Behavior**: Selecting an option auto-advances to Step 2

**Analytics**: `onboarding_focus_selected` with `{ focus }`

---

### Step 2: Contact Selection
**Title**: "Pick one person you've been meaning to reconnect with."

**Subtitle**: "No need to add everyone yet. Just one matters."

**UI Elements**:
- Contact card with Users icon
- "Choose Contact" button → opens native contact picker

**Behavior**:
- Uses `pickOneNativeContact()` helper
- Imports contact to EverReach database
- Generates initial message for selected contact
- Auto-advances to Step 3

**Analytics**: `onboarding_contact_selected`, `onboarding_contact_chosen`

---

### Step 3: Message Generation
**Title**: "Here's a thought you could send."

**Features**:
- AI-generated reconnection message using contact's first name
- **Edit** button → inline text editing
- **Regenerate** button → new message variation
- **Copy** button → copies to clipboard

**Sample Messages**:
```
"Hey {firstName}, congrats again on the new role! How's it going so far?"
"Hi {firstName}, hope you're doing well! Would love to catch up soon."
"Hey {firstName}, thinking of you! How have things been?"
"{firstName}, been meaning to reach out! How's everything going?"
"Hi {firstName}, hope your week is going well! Wanted to check in."
```

**Gate**: Must copy message before "Mark as Sent & Continue"

**Analytics**: `onboarding_message_regenerated`, `onboarding_message_copied`, `onboarding_mark_sent`

---

### Step 4: Warmth Score Display
**Title**: "You just warmed up your connection with {firstName}."

**Subtitle**: "Keep your important people glowing by checking in over time."

**UI Elements**:
- Warmth dial with Sparkles icon
- Warmth score display (uses `defaultWarmthForNewLeads` from settings)
- Color-coded by score:
  - 80+ = Teal (#4ECDC4)
  - 60-79 = Yellow (#FFD93D)
  - 40-59 = Orange (#FFA726)
  - <40 = Red (#FF6B6B)

**CTA**: "See My Warmth Map" → advances to Step 5

---

### Step 5: Voice Note Recording
**Title**: "Add a voice note about {firstName}"

**Subtitle**: "Record something you want to remember - their interests, recent updates, or context for future conversations."

**Features**:
- VoiceRecorder component with transcription
- Max duration: 2 minutes
- Auto-transcription enabled
- Saves to contact record

**Gate**: Must record a voice note before continuing

**Analytics**: `onboarding_voice_recorded`, `onboarding_voice_transcribed`

---

### Step 6: Reminder Setup
**Title**: "When do you want reminders?"

**Subtitle**: "Keep a 2-person streak weekly to stay green. 5-person streak unlocks gold."

**Options**:
| Frequency | Icon |
|-----------|------|
| `daily` | Calendar |
| `weekly` | Clock |
| `custom` | Settings |

**Behavior**: Selecting an option auto-advances to Step 7

**Analytics**: `onboarding_reminder_selected` with `{ frequency }`

---

### Step 7: Video Showcase
**Title**: "See EverReach in action"

**Subtitle**: "A quick look at how EverReach helps you connect faster."

**Features**:
- Embedded video player (16:9 aspect ratio)
- Native controls
- Looping enabled
- Feature bullets:
  - Context-aware message generation
  - Warmth tracking & reminders
  - Unified history across channels

**CTA**: "Finish" → advances to Step 8

**Analytics**: `onboarding_video_started`, `onboarding_video_completed`, `onboarding_video_next_click`

---

### Step 8: Complete Screen
**Title**: "You're all set!"

**Subtitle**: "This week we'll help you keep your relationships warm. Next week, we'll show you who's cooling down."

**UI Elements**:
- CheckCircle icon with celebration emoji 🎉

**CTA**: "Go to Dashboard" → redirects to `/home`

**Analytics**: `onboarding_completed`

---

## Skip Functionality

- Available on Steps 0-7
- Skip button in top-right corner
- Calls `completeOnboarding()` and redirects to `/home`
- Analytics: `onboarding_skipped`

---

## State Management

**Provider**: `OnboardingProvider`

**State Variables**:
```typescript
currentStep: number           // 0-8
userFocus: 'networking' | 'personal' | 'business'
reminderFrequency: 'daily' | 'weekly' | 'custom'
firstContact: string | null   // Contact ID
```

**Methods**:
- `setUserFocus(focus)` - Save focus preference
- `setReminderFrequency(frequency)` - Save reminder preference
- `setFirstContact(id)` - Save first imported contact
- `nextStep()` - Advance to next step
- `completeOnboarding()` - Mark onboarding as complete

---

## Analytics Events

| Event | Step | Data |
|-------|------|------|
| `onboarding_viewed` | 0 | - |
| `onboarding_step_viewed` | All | `{ step }` |
| `onboarding_focus_selected` | 1 | `{ focus }` |
| `onboarding_contact_chosen` | 2 | - |
| `onboarding_contact_selected` | 2 | `{ contact }` |
| `onboarding_contact_already_exists` | 2 | - |
| `onboarding_contact_selection_error` | 2 | `{ error }` |
| `onboarding_message_regenerated` | 3 | - |
| `onboarding_message_copied` | 3 | - |
| `onboarding_mark_sent` | 3 | - |
| `onboarding_voice_recorded` | 5 | `{ duration }` |
| `onboarding_voice_transcribed` | 5 | `{ length }` |
| `onboarding_reminder_selected` | 6 | `{ frequency }` |
| `onboarding_video_started` | 7 | - |
| `onboarding_video_completed` | 7 | - |
| `onboarding_video_next_click` | 7 | - |
| `onboarding_completed` | 8 | - |
| `onboarding_skipped` | Any | - |

---

## File Location
`app/onboarding.tsx`

## Dependencies
- `@/providers/OnboardingProvider`
- `@/providers/PeopleProvider`
- `@/providers/WarmthSettingsProvider`
- `@/providers/VoiceNotesProvider`
- `@/helpers/nativePicker`
- `@/components/VoiceRecorder`
- `@/hooks/useAnalytics`
