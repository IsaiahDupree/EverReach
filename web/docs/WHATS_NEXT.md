# What to Build Next 🚀

**Updated**: October 16, 2025  
**Status**: Quick Wins Complete ✅

---

## ✅ Completed This Session

1. **Message Composer** - Connected to real AI endpoint
2. **Warmth Summary Widget** - Dashboard overview
3. **Contact Analysis Panel** - AI relationship insights

**Progress**: From 21% to ~30% endpoint integration

---

## 🔴 High Priority Next Steps

### 1. Agent Chat Interface (6-8 hours) ⭐ HIGHEST VALUE

**Why Build This**:
- Core AI feature for the entire app
- Enables natural conversation with AI assistant
- Can perform actions via function calling
- Highest user value among remaining features

**What to Build**:
- `components/Agent/AgentChatInterface.tsx` - Main chat UI
- `components/Agent/ChatMessage.tsx` - Message bubble
- `components/Agent/ConversationSidebar.tsx` - History sidebar
- `components/Agent/StreamingMessage.tsx` - SSE streaming display
- `components/Agent/ThinkingIndicator.tsx` - Loading animation
- `lib/hooks/useAgentChat.ts` - Chat hook with streaming
- `lib/hooks/useConversations.ts` - Conversation management
- `lib/api/streaming.ts` - SSE streaming utility

**Endpoints**:
- `POST /v1/agent/chat` - Non-streaming chat
- `POST /v1/agent/chat/stream` - Streaming chat (SSE)
- `GET /v1/agent/conversation` - List conversations
- `GET /v1/agent/conversation/:id` - Get conversation
- `DELETE /v1/agent/conversation/:id` - Delete conversation
- `GET /v1/agent/tools` - List available tools

**Features**:
- Real-time streaming responses
- Conversation history
- Function calling display (show when AI uses tools)
- Multi-turn conversations
- Context preservation
- Copy message text
- Regenerate responses

**Integration Points**:
- Add floating chat button to all pages
- Or create dedicated `/chat` page
- Add to mobile nav

**Estimated Time**: 6-8 hours

---

### 2. Custom Fields System (6-8 hours) ⭐ HIGH VALUE

**Why Build This**:
- Extreme flexibility for users
- AI-native (automatic OpenAI function generation)
- Zero-downtime schema changes
- 14 field types supported

**What to Build**:
- `app/custom-fields/page.tsx` - Admin UI for field definitions
- `components/CustomFields/FieldDefinitionForm.tsx` - Create field definition
- `components/CustomFields/FieldDefinitionsList.tsx` - List field defs
- `components/CustomFields/DynamicFieldsEditor.tsx` - Edit values (in contact form)
- `components/CustomFields/DynamicFieldDisplay.tsx` - Display values (in contact detail)
- `lib/hooks/useCustomFields.ts` - All custom field hooks

**Endpoints**:
- `GET /v1/custom-fields?entity=contact` - List field definitions
- `POST /v1/custom-fields` - Create field definition
- `GET /v1/contacts/:id/custom` - Get custom values
- `PATCH /v1/contacts/:id/custom` - Update custom values

**Features**:
- Admin UI to create/edit field definitions
- 14 field types (text, number, select, date, etc.)
- Dynamic form generation
- Validation rules
- AI permissions (ai_can_read, ai_can_write)
- PII level tracking
- Audit trail

**Integration Points**:
- Add to contact create/edit forms
- Display in contact detail page
- Add to contact list filters

**Estimated Time**: 6-8 hours

---

## 🟡 Medium Priority Features

### 3. Context Bundle Integration (2 hours)

**Endpoint**: `GET /v1/contacts/:id/context-bundle`

**What It Does**:
- Returns LLM-ready context in single call
- Includes contact, interactions, pipeline, context, metadata
- Token-efficient prompt skeleton
- Brand rules embedded

**Use Cases**:
- Enhance message composer with full context
- Pre-populate chat with contact context
- Show quick summary in contact detail

**Implementation**:
- Create `useContextBundle(contactId)` hook
- Add "Show Context" button in contact detail
- Use in message composer for better generation

### 4. Voice Notes Upload & List (4 hours)

**Status**: Player components already built ✅

**What's Missing**:
- Upload interface
- List page
- Integration with contacts

**Endpoints**:
- `POST /v1/agent/voice-note/process`

**Files to Build**:
- `components/VoiceNotes/VoiceNoteUploader.tsx`
- `components/VoiceNotes/VoiceNotesList.tsx`
- `app/voice-notes/page.tsx`

### 5. Templates System (6 hours)

**Endpoints**:
- `GET /v1/templates`
- `POST /v1/templates`
- `GET/PATCH/DELETE /v1/templates/:id`

**What to Build**:
- Templates CRUD UI
- Template selector in message composer
- Variable placeholders ({{name}}, {{company}})

### 6. Pipelines / Kanban (6 hours)

**Endpoints**:
- `GET /v1/pipelines`
- `POST /v1/pipelines`
- `GET /v1/pipelines/:id/stages`

**What to Build**:
- Kanban board component
- Drag & drop contacts between stages
- Stage management
- Pipeline analytics

### 7. Goals Tracking (3 hours)

**Endpoints**:
- `GET /v1/goals`
- `POST /v1/goals`
- `GET/PATCH/DELETE /v1/goals/:id`

**What to Build**:
- Goals CRUD UI
- Progress tracking
- Link goals to contacts

### 8. Global Search (2 hours)

**Endpoint**:
- `POST /v1/search`

**What to Build**:
- Global search bar in header
- Search results page
- Type filters (contacts, interactions, notes)

---

## 🟢 Lower Priority Features

### 9. Files & Uploads (4 hours)

**Endpoints**:
- `GET /v1/files`
- `POST /v1/files`
- `POST /uploads/sign`

### 10. User Preferences (4 hours)

**Endpoints**:
- `GET /v1/me`
- `GET/PATCH /v1/me/compose-settings`
- `GET/POST /v1/me/persona-notes`

### 11. Audit Logs (3 hours)

**Endpoint**:
- `GET /v1/audit-logs`

### 12. Feature Requests System (4 hours)

**Endpoints**:
- `GET/POST /v1/feature-requests`
- `GET/POST /v1/feature-buckets`

---

## 📅 Recommended Build Order

### Week 1 (16 hours)
**Day 1-2**: Agent Chat Interface (6-8h)
**Day 3**: Test & polish agent chat (2h)
**Day 4-5**: Custom Fields System (6-8h)

### Week 2 (16 hours)
**Day 1**: Context Bundle Integration (2h)
**Day 1-2**: Voice Notes Upload/List (4h)
**Day 3**: Templates System (6h)
**Day 4-5**: Pipelines/Kanban (6h)

### Week 3 (16 hours)
**Day 1**: Goals Tracking (3h)
**Day 2**: Global Search (2h)
**Day 2-3**: Files & Uploads (4h)
**Day 4-5**: User Preferences (4h)
**Day 5**: Testing & polish (3h)

### Week 4 (16 hours)
**Day 1-2**: Remaining features
**Day 3-4**: E2E testing
**Day 5**: Performance optimization, accessibility, mobile responsive

---

## 🎯 Target Milestones

**End of Week 1**: Agent Chat + Custom Fields = 50% integration  
**End of Week 2**: Templates + Pipelines = 65% integration  
**End of Week 3**: Most features complete = 80% integration  
**End of Week 4**: Production-ready = 90%+ integration  

---

## 💡 Quick Reference

### Completed Endpoints (✅ ~30%)
- Contacts CRUD
- Interactions CRUD
- Alerts
- Settings
- Tags & Watch
- Warmth (individual recompute)
- **NEW**: Message Composer (AI)
- **NEW**: Warmth Summary
- **NEW**: Contact Analysis

### High Priority Missing (🔴 ~12 endpoints)
- Agent Chat (6 endpoints)
- Custom Fields (2 endpoints)
- Context Bundle (1 endpoint)
- Warmth Summary dashboard (already done ✅)

### Medium Priority (🟡 ~52 endpoints)
- Templates (3)
- Pipelines (4)
- Goals (3)
- Voice Notes (1)
- Search (1)
- Files (3)
- User Prefs (5)
- And more...

### Total Remaining
- **High Priority**: ~9 endpoints (Agent + Custom Fields + Context)
- **Medium Priority**: ~52 endpoints
- **Low Priority**: ~20 endpoints

---

## 🚀 Next Session

**Recommendation**: Start with **Agent Chat Interface**

**Why**:
1. Highest user value
2. Core AI feature
3. Enables many other features
4. Great demo/showcase feature
5. Ties everything together

**Preparation**:
1. Review Agent Chat backend endpoints
2. Design chat UI mockup
3. Plan conversation flow
4. Understand SSE streaming

**Alternative**: If Agent Chat feels too big, start with **Context Bundle Integration** (2 hours) as a warm-up!

---

**Status**: Ready to build! 🎉  
**Next Up**: Agent Chat Interface ⭐

Let's ship it! 🚀
