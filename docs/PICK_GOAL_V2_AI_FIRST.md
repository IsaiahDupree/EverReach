# Pick Goal Page V2 - AI-First Design

## Core Philosophy
**Showcase our AI superpowers while giving users multiple input options**

## Key Principles
1. **AI features front and center** - Voice & Screenshot are our USPs
2. **Unified input experience** - One powerful chat box with multiple modalities
3. **Cross-functional component** - Reusable across app
4. **Smart auto-population** - Seamless flow from external sources
5. **Progressive disclosure** - Options reveal as user scrolls

---

## New Page Layout

```
┌─────────────────────────────────────┐
│  ×           Pick Goal              │
├─────────────────────────────────────┤
│                                     │
│  🎯 What would you like to          │
│     accomplish with Adam?           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  💬 AI-Powered Goal Input       │ │
│ │                                 │ │
│ │  ┌───────────────────────────┐ │ │
│ │  │ Type, speak, or snap...   │ │ │
│ │  │                           │ │ │
│ │  │ [Auto-populated from      │ │ │
│ │  │  voice/screenshot here]   │ │ │
│ │  └───────────────────────────┘ │ │
│ │                                 │ │
│ │  🎤 Voice    📸 Screenshot      │ │
│ │                                 │ │
│ │  Examples: "Follow up" • "Ask   │ │
│ │  about project" • "Schedule"    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ──────── OR ────────               │
│                                     │
│ 📋 Quick Goals                     │
│ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │ 💬  │ │ 🤝  │ │ 🎉  │           │
│ │Follow│ │Check│ │Congr│           │
│ │ up  │ │ In  │ │ ats │           │
│ └─────┘ └─────┘ └─────┘           │
│                                     │
│ [Show 3 more...]                   │
│                                     │
│ ──────── OR ────────               │
│                                     │
│ 🎯 AI Suggested (Based on History) │
│ ┌─────────────────────────────────┐│
│ │ Follow up on Q1 project         ││
│ │ Last contact: 2 days ago        ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │     Generate Message  →         ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## Component Architecture

### Reusable: AIInputBox Component

**Purpose:** Universal AI-powered input with voice, screenshot, and text

**Props:**
```typescript
interface AIInputBoxProps {
  placeholder?: string;
  value?: string;
  onValueChange: (text: string) => void;
  onVoiceRecord?: () => void;
  onScreenshotCapture?: () => void;
  showVoice?: boolean;
  showScreenshot?: boolean;
  showExamples?: boolean;
  examples?: string[];
  autoFocus?: boolean;
  prefilled?: {
    source: 'voice' | 'screenshot' | 'chat';
    content: string;
    highlight?: boolean; // Pulse/glow effect
  };
}
```

**Usage Locations:**
1. ✅ Pick Goal page (this page)
2. ✅ CRM Assistant chat
3. ✅ Custom Goal modal
4. ✅ Voice note → Goal flow
5. ✅ Screenshot → Goal flow

---

## User Flows

### Flow 1: Direct Text Input
```
1. User lands on Pick Goal page
2. Sees large AI Input Box at top
3. Taps input → Keyboard appears
4. Types: "Ask about their budget"
5. Taps Generate Message
```

### Flow 2: Voice → Goal (PRIMARY USP)
```
1. User on Contact page
2. Taps "Voice Note" quick action
3. Records: "I want to ask them about partnering on the new initiative"
4. After saving → Popup: "Use this as message goal?"
5. User taps "Yes"
6. → Navigates to Pick Goal page
7. ✨ AI Input Box auto-populated with transcription
8. ✨ Box pulses/glows to draw attention
9. ✨ Page auto-scrolls to the input
10. User can edit or proceed
11. Taps Generate Message
```

### Flow 3: Screenshot → Response (PRIMARY USP)
```
1. User on Contact page  
2. Taps "Screenshot" quick action
3. Selects screenshot of LinkedIn message
4. AI analyzes: "They're asking about availability for a call"
5. Shows "Draft Response" button
6. User taps it
7. → Navigates to Pick Goal page
8. ✨ AI Input Box auto-filled: "Respond to their meeting request"
9. ✨ Box highlighted
10. ✨ Auto-scroll to input
11. User reviews, maybe tweaks
12. Taps Generate Message
```

### Flow 4: Quick Goal Selection
```
1. User scrolls down past AI Input
2. Sees colorful Quick Goal cards
3. Taps "Follow up"
4. Immediately generates message
```

### Flow 5: AI Suggested Goal
```
1. User scrolls to bottom
2. Sees personalized suggestion based on history
3. Taps suggestion card
4. Proceeds to generation
```

---

## AIInputBox Visual Design

```
┌───────────────────────────────────────┐
│  💬 AI-Powered Goal Input             │
│  ─────────────────────────────────    │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │                                 │ │
│  │  What would you like to say?    │ │
│  │                                 │ │
│  │  [Multiline text input]         │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌──────────┐  ┌──────────┐         │
│  │  🎤 Voice│  │ 📸 Photo │         │
│  └──────────┘  └──────────┘         │
│                                       │
│  💡 Examples:                         │
│  • "Follow up on our call"            │
│  • "Ask about their project timeline" │
│  • "Schedule coffee next week"        │
└───────────────────────────────────────┘
```

### When Pre-filled from External Source:

```
┌───────────────────────────────────────┐
│  💬 AI-Powered Goal Input   ✨        │
│  ─────────────────────────────────    │
│  🎤 From Voice Note ↓                 │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  ✨ [GLOWING BORDER] ✨         │ │
│  │                                 │ │
│  │  Ask them if they're interested │ │
│  │  in partnering on the Q1        │ │
│  │  marketing initiative           │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌──────────┐  ┌──────────┐         │
│  │  🎤 Voice│  │ 📸 Photo │         │
│  └──────────┘  └──────────┘         │
│                                       │
│  ✏️ Edit or tap below to proceed     │
└───────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Reusable Component
**File:** `/components/AIInputBox.tsx`

Features:
- Multiline text input
- Voice button (opens voice recorder)
- Screenshot button (opens image picker)
- Example chips
- Pre-fill animation (glow, pulse)
- Auto-focus and scroll-to support

### Phase 2: Update Pick Goal Page
**File:** `/app/pick-goal.tsx`

Changes:
- AIInputBox at top (hero position)
- Quick Goals section (collapsible grid)
- AI Suggested section at bottom
- Remove old custom goal input

### Phase 3: Update External Entry Points

**Voice Note Flow:**
- Add "Use as message goal?" popup after saving
- Pass `prefilled` prop to Pick Goal page
- Auto-scroll to AIInputBox on arrival

**Screenshot Analysis Flow:**
- Add "Draft Response" button to results
- Extract goal from AI analysis
- Navigate to Pick Goal with pre-fill

**CRM Assistant:**
- Replace chat input with AIInputBox component
- Maintain existing functionality

### Phase 4: Add Navigation Helpers
**File:** `/lib/navigationHelpers.ts`

```typescript
export function navigateToPickGoalWithPrefill(
  contactId: string,
  source: 'voice' | 'screenshot' | 'chat',
  content: string
) {
  router.push({
    pathname: '/pick-goal',
    params: {
      personId: contactId,
      prefillSource: source,
      prefillContent: content,
      highlight: 'true',
    },
  });
}
```

---

## Benefits of This Approach

### 1. **Showcases AI Features**
- Voice and Screenshot buttons are prominent
- Users see them immediately
- Clear call-to-action

### 2. **Unified Experience**
- Same input component across app
- Consistent muscle memory
- Easier to maintain

### 3. **Flexible Input**
- Type, speak, or snap
- Not limited to predefined goals
- Users feel empowered

### 4. **Smart Auto-Population**
- External sources flow naturally
- Visual feedback (glow effect)
- Clear source attribution

### 5. **Progressive Options**
- Quick goals for speed users
- AI suggestions for guidance
- Full flexibility for custom needs

---

## Mobile-First Considerations

### Keyboard Management
- Auto-focus only when NOT pre-filled
- Dismiss keyboard when scrolling
- Smooth transitions

### Scroll Behavior
```typescript
// When pre-filled from external source
useEffect(() => {
  if (prefilled) {
    setTimeout(() => {
      inputBoxRef.current?.measureLayout(
        findNodeHandle(scrollViewRef.current),
        (x, y) => {
          scrollViewRef.current?.scrollTo({ 
            y: y - 100, // 100px padding from top
            animated: true 
          });
        }
      );
    }, 300); // Wait for render
  }
}, [prefilled]);
```

### Touch Targets
- Voice button: 56x56px minimum
- Screenshot button: 56x56px minimum
- Example chips: 44px height minimum
- Quick goal cards: 120x120px minimum

---

## Analytics Events

Track the following:
```typescript
// Input method used
analytics.track('goal_input_method', {
  method: 'text' | 'voice' | 'screenshot' | 'quick_goal' | 'ai_suggested',
  source: 'direct' | 'voice_note' | 'screenshot_analysis',
  prefilled: boolean,
});

// External source conversion
analytics.track('external_source_to_goal', {
  source: 'voice_note' | 'screenshot',
  edited: boolean, // Did user edit the pre-filled content
  time_to_proceed_seconds: number,
});

// Feature discovery
analytics.track('ai_input_feature_used', {
  feature: 'voice' | 'screenshot',
  from_page: 'pick_goal' | 'contact' | 'crm_assistant',
});
```

---

## A/B Test Ideas

### Test 1: Input Position
- **A:** AI Input Box at top (recommended)
- **B:** Quick Goals at top, AI Input below
- **Measure:** Conversion to message generation

### Test 2: Voice Button Prominence
- **A:** Voice + Screenshot buttons side-by-side
- **B:** Voice button larger/primary, Screenshot secondary
- **Measure:** Voice feature adoption

### Test 3: Pre-fill Animation
- **A:** Subtle glow
- **B:** Strong pulse + haptic feedback
- **Measure:** User engagement with pre-filled content

---

## Success Metrics

1. **Feature Adoption**
   - % of goals created via voice
   - % of goals created via screenshot
   - % of goals created via text

2. **Conversion Funnel**
   - Voice Note → Pick Goal → Message Generated
   - Screenshot → Pick Goal → Message Generated

3. **User Satisfaction**
   - Time to create goal (should decrease)
   - Edit rate for pre-filled content (should be low)
   - Feature NPS specifically for voice/screenshot

4. **Retention**
   - Users who use voice/screenshot return more often
   - Power users leverage all three modalities

---

## Next Steps

1. ✅ Review and approve this design
2. ✅ Create AIInputBox component
3. ✅ Update Pick Goal page layout
4. ✅ Add auto-population logic
5. ✅ Update Voice Note flow
6. ✅ Update Screenshot flow
7. ✅ Add analytics tracking
8. ⏳ User testing
9. ⏳ Iterate based on feedback
