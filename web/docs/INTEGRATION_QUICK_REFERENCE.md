# Backend-Frontend Integration Quick Reference

**Visual guide to what's connected and what needs work**

---

## 🟢 Fully Integrated (✅ 40%)

```
┌─────────────────┐         ┌─────────────────┐
│  CONTACTS API   │ ◄─────► │  Contact Pages  │ ✅ COMPLETE
│  /v1/contacts   │         │  + Components   │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ INTERACTIONS API│ ◄─────► │  Interaction    │ ✅ COMPLETE
│ /v1/interactions│         │  Timeline       │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│   ALERTS API    │ ◄─────► │  Alerts Page    │ ✅ COMPLETE
│   /v1/alerts    │         │  + Actions      │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  WARMTH (data)  │ ◄─────► │  Warmth UI      │ ✅ UI DONE
│  (in contacts)  │         │  4 Components   │ ⚠️ Need history
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  SETTINGS API   │ ◄─────► │  Settings Pages │ ✅ COMPLETE
│  (Supabase)     │         │  3 Sub-pages    │
└─────────────────┘         └─────────────────┘
```

---

## 🔴 High Priority - Need Integration (30%)

```
┌─────────────────┐         ┌─────────────────┐
│  AGENT CHAT API │   ❌    │  (Not Built)    │ 🔴 BUILD THIS
│  /agent/chat    │ ──────► │  Chat Interface │    FIRST!
│  + streaming    │         │                 │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ CONTACT ANALYSIS│   ❌    │  (Not Built)    │ 🔴 HIGH VALUE
│ /agent/analyze  │ ──────► │  Analysis Panel │    AI Insights
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ MESSAGE COMPOSE │   ⚠️    │  Composer UI    │ ⚠️ WIRE UP
│ /agent/compose  │ ──────► │  (simulated)    │    Real AI
└─────────────────┘         └─────────────────┘
```

---

## 🟡 Medium Priority - Future Features (30%)

```
┌─────────────────┐         ┌─────────────────┐
│ CUSTOM FIELDS   │   ❌    │  (Not Built)    │ 🟡 Flexible
│ /custom-fields  │ ──────► │  Field Manager  │    Data Model
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  VOICE NOTES    │   ⚠️    │  Player Ready   │ ⚠️ Need Upload
│ /voice-note/    │ ──────► │  (partial)      │    + List
│  process        │         │                 │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ ACTION SUGGEST  │   ❌    │  (Not Built)    │ 🟡 Proactive
│ /agent/suggest  │ ──────► │  Dashboard      │    Nudges
│                 │         │  Widget         │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ CONTEXT BUNDLE  │   ❌    │  (Not Used)     │ 🟡 LLM Context
│ /context-bundle │ ──────► │  Could Enhance  │    For Agents
│                 │         │  Composer       │
└─────────────────┘         └─────────────────┘
```

---

## Component Dependency Graph

```
                    ┌─────────────────┐
                    │   Backend API   │
                    │ (backend-scratch│
                    │     -clean)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ✅ Built            🔴 Need Build         🟡 Enhance
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐       ┌─────▼─────┐
   │Contacts │         │Agent Chat │       │Custom     │
   │Pages    │         │Interface  │       │Fields     │
   └─────────┘         └───────────┘       └───────────┘
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐       ┌─────▼─────┐
   │Interact.│         │Contact    │       │Voice      │
   │Timeline │         │Analysis   │       │Notes      │
   └─────────┘         └───────────┘       └───────────┘
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐       ┌─────▼─────┐
   │Warmth   │         │Real AI    │       │Action     │
   │UI       │         │Composer   │       │Suggest    │
   └─────────┘         └───────────┘       └───────────┘
        │                    
   ┌────▼────┐         
   │Alerts   │         
   │Page     │         
   └─────────┘         
        │                    
   ┌────▼────┐         
   │Settings │         
   │Pages    │         
   └─────────┘         
```

---

## Data Flow Examples

### ✅ Working: Contact Detail Page
```
User visits /contacts/123
    ↓
useContact(123) hook
    ↓
GET /api/v1/contacts/123
    ↓
Backend returns contact + warmth
    ↓
WarmthScore displays gauge
WarmthInsights shows recommendations
InteractionsList shows timeline
    ↓
User clicks "Log Interaction"
    ↓
CreateInteractionModal opens
    ↓
POST /api/v1/interactions
    ↓
React Query invalidates cache
    ↓
Timeline auto-updates
```

### 🔴 Missing: Agent Chat
```
User clicks "Ask AI" (not built)
    ↓
(Need to build) AgentChatModal
    ↓
POST /api/v1/agent/chat/stream (SSE)
    ↓
Backend streams response chunks
    ↓
(Need to build) Display streaming text
    ↓
Store in agent_conversations table
    ↓
(Need to build) Conversation history sidebar
```

### ⚠️ Partial: Message Composer
```
User visits /compose?contact=123
    ↓
✅ UI shows template selector
    ↓
User clicks "Generate"
    ↓
⚠️ Currently: Simulated AI (setTimeout)
❌ Should be: POST /agent/compose/smart
    ↓
⚠️ Shows template-based message
✅ Should show: AI-generated message
    ↓
✅ User can edit/copy/save
```

---

## Quick Win Opportunities

### 1. Message Composer (2 hours)
**Why**: UI already built, just swap endpoints
```typescript
// Change in app/compose/page.tsx
- setTimeout(() => { setGeneratedMessage(template[...]) }, 1500)
+ const response = await apiFetch('/api/v1/agent/compose/smart', {...})
+ setGeneratedMessage(response.message)
```

### 2. Contact Analysis Panel (4 hours)
**Why**: High value, add to existing page
```typescript
// Add to app/contacts/[id]/page.tsx
const { data: analysis } = useContactAnalysis(contactId)

<ContactAnalysisPanel 
  health={analysis.relationship_health}
  suggestions={analysis.engagement_suggestions}
/>
```

### 3. Action Suggestions Widget (3 hours)
**Why**: Dashboard enhancement
```typescript
// Add to app/page.tsx (dashboard)
const { data: suggestions } = useActionSuggestions('dashboard')

<ActionSuggestionsWidget suggestions={suggestions} />
```

---

## Hooks to Build

### Priority 1 (This Week)
```typescript
// lib/hooks/useAgentChat.ts
export function useAgentChat(conversationId?: string) {
  // Streaming SSE chat
}

// lib/hooks/useContactAnalysis.ts
export function useContactAnalysis(contactId: string, type: string) {
  // Fetch relationship analysis
}

// lib/hooks/useSmartCompose.ts
export function useSmartCompose() {
  // Real AI message generation
}
```

### Priority 2 (Next Week)
```typescript
// lib/hooks/useCustomFields.ts
export function useCustomFieldDefs()
export function useCustomFieldValues(contactId)
export function useUpdateCustomFieldValues()

// lib/hooks/useVoiceNotes.ts
export function useVoiceNotes()
export function useProcessVoiceNote()

// lib/hooks/useActionSuggestions.ts
export function useActionSuggestions(context: string)
```

---

## Testing Strategy

### Already Tested ✅
- Contacts CRUD (E2E)
- Interactions (E2E)
- Alerts (E2E)
- Settings (E2E)

### Need E2E Tests
- [ ] Agent chat flow
- [ ] Message composition with real AI
- [ ] Contact analysis display
- [ ] Voice note upload & processing
- [ ] Custom fields CRUD

### Need Component Tests
- [ ] AgentChatInterface
- [ ] ContactAnalysisPanel
- [ ] ActionSuggestionsWidget
- [ ] CustomFieldsManager
- [ ] VoiceNoteUploader

---

## Summary Stats

| Category | Endpoints | UI Status | Integration |
|----------|-----------|-----------|-------------|
| **Core CRM** | 15 | ✅ Built | ✅ 100% |
| **AI Agent** | 10 | ❌ Missing | ❌ 10% |
| **Custom Fields** | 4 | ❌ Missing | ❌ 0% |
| **Voice Notes** | 2 | ⚠️ Partial | ⚠️ 30% |
| **Public API** | 8 | ❌ Missing | ❌ 0% |
| **Ad Pixels** | 5 | ❌ Missing | ❌ 0% |

**Overall**: 
- ✅ **40% Complete** - Core CRM fully functional
- 🔴 **30% High Priority** - AI features need UI
- 🟡 **30% Medium Priority** - Advanced features

---

## Next Session Plan

### Session 1: Agent Chat (6 hours)
1. Build `AgentChatInterface.tsx` (2h)
2. Build `useAgentChat()` hook with SSE (2h)
3. Build conversation history sidebar (1h)
4. Test & polish (1h)

### Session 2: Smart Integrations (4 hours)
1. Wire real AI to message composer (1h)
2. Add contact analysis panel (2h)
3. Add action suggestions widget (1h)

### Session 3: Custom Fields (6 hours)
1. Build field definitions manager (2h)
2. Build dynamic form builder (2h)
3. Integrate into contact form (2h)

**Total**: ~16 hours to reach 80% integration! 🚀
