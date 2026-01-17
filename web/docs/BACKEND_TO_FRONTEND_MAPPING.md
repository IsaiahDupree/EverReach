# Backend API to Frontend UI Mapping

**Date**: October 16, 2025  
**Backend Branch**: `backend-scratch-clean`  
**Frontend Branch**: Current  
**Status**: Comprehensive Mapping

---

## Overview

This document maps all backend API endpoints to their corresponding frontend UI components, identifying what's built, what needs to be built, and integration priorities.

---

## 1. Core Contacts API

### Endpoints
- `GET /api/v1/contacts` - List contacts with filters
- `GET /api/v1/contacts/:id` - Get single contact
- `POST /api/v1/contacts` - Create contact
- `PUT /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact
- `POST /api/v1/contacts/:id/recompute-warmth` - Recompute warmth score

### UI Components (✅ BUILT)
- **`app/contacts/page.tsx`** - List view with search/filters
- **`app/contacts/[id]/page.tsx`** - Detail view (enhanced)
- **`app/contacts/new/page.tsx`** - Create form
- **`app/contacts/[id]/edit/page.tsx`** - Edit form
- **`components/Contacts/ContactRow.tsx`** - List item
- **`components/Contacts/ContactForm.tsx`** - Create/edit form
- **`components/Contacts/SearchBar.tsx`** - Search input
- **`components/Contacts/FilterPanel.tsx`** - Filters
- **`components/Contacts/WatchStatusToggle.tsx`** - Watch status

### Data Hooks (✅ BUILT)
- `useContacts()` - List with filters
- `useContact(id)` - Single contact
- `useCreateContact()` - Create
- `useUpdateContact()` - Update
- `useDeleteContact()` - Delete
- `useRecomputeWarmth()` - Recompute warmth

### Integration Status
✅ **COMPLETE** - All CRUD operations wired up

---

## 2. Interactions API

### Endpoints
- `GET /api/v1/interactions` - List interactions (filterable by contact_id)
- `GET /api/v1/interactions/:id` - Get single interaction
- `POST /api/v1/interactions` - Create interaction
- `PUT /api/v1/interactions/:id` - Update interaction
- `DELETE /api/v1/interactions/:id` - Delete interaction

### UI Components (✅ BUILT)
- **`components/Interactions/InteractionsList.tsx`** - List container
- **`components/Interactions/InteractionTimeline.tsx`** - Timeline view
- **`components/Interactions/InteractionCard.tsx`** - Individual display
- **`components/Interactions/CreateInteractionModal.tsx`** - Create form

### Data Hooks (✅ BUILT)
- `useInteractions(filters)` - List with filters
- `useInteraction(id)` - Single interaction
- `useCreateInteraction()` - Create
- `useUpdateInteraction()` - Update
- `useDeleteInteraction()` - Delete

### Integration Status
✅ **COMPLETE** - Integrated in contact detail page

---

## 3. Warmth System API

### Endpoints
- Warmth scores are embedded in contact responses
- `POST /api/v1/contacts/:id/recompute-warmth` - Manual recompute
- Historical warmth data (if exists): `GET /api/v1/contacts/:id/warmth-history`

### UI Components (✅ BUILT)
- **`components/Warmth/WarmthScore.tsx`** - Circular gauge
- **`components/Warmth/WarmthBadge.tsx`** - Compact badge
- **`components/Warmth/WarmthChart.tsx`** - Historical chart
- **`components/Warmth/WarmthInsights.tsx`** - AI recommendations

### Integration Status
✅ **UI COMPLETE** - Components built and integrated
⚠️ **PARTIAL BACKEND** - Need warmth history endpoint for chart

---

## 4. Alerts API

### Endpoints
- `GET /api/v1/alerts` - List warmth alerts
- `POST /api/v1/alerts/:id/dismiss` - Dismiss alert
- `POST /api/v1/alerts/:id/snooze` - Snooze alert
- `POST /api/v1/alerts/:id/reached-out` - Mark as reached out

### UI Components (✅ BUILT)
- **`app/alerts/page.tsx`** - Alerts list page
- **`components/Dashboard/WarmthAlertsSummary.tsx`** - Dashboard widget

### Data Hooks (✅ BUILT)
- `useAlerts()` - List alerts
- `useAlertAction()` - Dismiss/snooze/reached-out

### Integration Status
✅ **COMPLETE** - All alert actions wired up

---

## 5. Public API (v1) - Context Bundle

### Endpoints
- `GET /api/v1/contacts/:id/context-bundle` - LLM-ready context
  - Query params: `?interactions=20`
  - Returns: contact, interactions, pipeline, tasks, context, meta

### UI Components (❌ NOT BUILT)
- **Agent Chat Interface** - Uses context bundle internally
- **Message Composer** - Could enhance with context bundle

### Data Hooks (❌ NOT BUILT)
- `useContextBundle(contactId)` - Fetch LLM context

### Integration Status
⚠️ **BACKEND READY** - No frontend integration yet
💡 **OPPORTUNITY** - Enhance message composer with full context

---

## 6. Custom Fields API

### Endpoints
- `GET /api/v1/custom-fields?entity=contact` - List field definitions
- `POST /api/v1/custom-fields` - Create field definition
- `GET /api/v1/contacts/:id/custom` - Get custom values
- `PATCH /api/v1/contacts/:id/custom` - Update custom values

### UI Components (❌ NOT BUILT)
- **Custom Fields Manager** (admin UI for field definitions)
- **Custom Fields Editor** (in contact form)
- **Custom Fields Display** (in contact detail)

### Data Hooks (❌ NOT BUILT)
- `useCustomFieldDefs()` - List definitions
- `useCreateCustomFieldDef()` - Create definition
- `useCustomFieldValues(contactId)` - Get values
- `useUpdateCustomFieldValues()` - Update values

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: Medium - Flexible data storage

---

## 7. Agent Chat API

### Endpoints
- `POST /api/v1/agent/chat` - Send message to agent
- `POST /api/v1/agent/chat/stream` - Streaming SSE chat
- `GET /api/v1/agent/conversation` - List conversations
- `GET /api/v1/agent/conversation/:id` - Get conversation
- `DELETE /api/v1/agent/conversation/:id` - Delete conversation

### UI Components (❌ NOT BUILT)
- **Agent Chat Interface** - Full chat UI with streaming
- **Conversation History** - Sidebar with past conversations
- **Message Bubbles** - User/assistant messages
- **Thinking Indicator** - Loading state

### Data Hooks (❌ NOT BUILT)
- `useAgentChat()` - Send message with streaming
- `useConversations()` - List conversations
- `useConversation(id)` - Get single conversation
- `useDeleteConversation()` - Delete conversation

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: High - Core AI feature

---

## 8. Message Composition API

### Endpoints
- `POST /api/v1/agent/compose/smart` - AI message generation
  - Body: `{ contactId, goal, channel, tone, context }`
  - Returns: `{ message, alternatives, metadata }`

### UI Components (✅ PARTIALLY BUILT)
- **`app/compose/page.tsx`** - Message composer UI (simulated AI)

### Integration Status
⚠️ **PARTIAL** - UI built with simulated generation
💡 **TODO** - Connect to real AI endpoint

**Changes Needed**:
```typescript
// Replace simulated generation in app/compose/page.tsx
const handleGenerate = async () => {
  const response = await fetch('/api/v1/agent/compose/smart', {
    method: 'POST',
    body: JSON.stringify({
      contactId: formData.contactId,
      goal: formData.template,
      channel: formData.channel,
      tone: formData.tone,
      customPrompt: formData.customPrompt,
    }),
  });
  const { message } = await response.json();
  setGeneratedMessage(message);
};
```

---

## 9. Contact Analysis API

### Endpoints
- `POST /api/v1/agent/analyze/contact/:id` - Analyze relationship
  - Query: `?type=relationship_health|engagement_suggestions|context_summary|full_analysis`
  - Returns: Analysis with recommendations

### UI Components (❌ NOT BUILT)
- **Contact Analysis Panel** - Display AI insights
- **Relationship Health Score** - Visual indicator
- **Engagement Suggestions** - Action items
- **Analysis History** - Past analyses

### Data Hooks (❌ NOT BUILT)
- `useContactAnalysis(contactId, type)` - Fetch analysis

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: High - Valuable AI insights
💡 **INTEGRATION**: Add to contact detail page as expansion panel

---

## 10. Voice Notes API

### Endpoints
- `POST /api/v1/agent/voice-note/process` - Process voice note
  - Body: `{ audioUrl, duration, format }`
  - Returns: `{ transcription, extractedContacts, actions, sentiment, tags }`

### UI Components (✅ PARTIALLY BUILT)
- **`components/VoiceNotes/AudioPlayer.tsx`** - Playback controls
- **`components/VoiceNotes/TranscriptionDisplay.tsx`** - Show transcription
- **`components/VoiceNotes/ProcessingStatus.tsx`** - Status indicator
- **Voice Note Upload UI** (❌ NOT BUILT)
- **Voice Note List Page** (❌ NOT BUILT)

### Data Hooks (❌ NOT BUILT)
- `useVoiceNotes()` - List voice notes
- `useProcessVoiceNote()` - Process audio
- `useVoiceNoteTranscription(id)` - Get transcription

### Integration Status
⚠️ **PARTIAL** - Display components built, upload/list missing
📋 **PRIORITY**: Medium

---

## 11. Action Suggestions API

### Endpoints
- `POST /api/v1/agent/suggest/actions` - Get proactive suggestions
  - Query: `?context=dashboard|contact_detail|alerts`
  - Returns: `{ suggestions: [{ type, priority, contact, action }] }`

### UI Components (❌ NOT BUILT)
- **Action Suggestions Widget** - Dashboard widget
- **Smart Nudges** - Contextual suggestions
- **Suggestion Card** - Individual suggestion display

### Data Hooks (❌ NOT BUILT)
- `useActionSuggestions(context)` - Fetch suggestions

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: Medium - Proactive relationship management
💡 **INTEGRATION**: Add to dashboard

---

## 12. Public API Authentication

### Endpoints
- API key-based authentication
- Rate limiting (600/min per key, 10k/hr per org)
- Webhooks with HMAC-SHA256 signatures

### UI Components (❌ NOT BUILT)
- **API Keys Manager** - Create/revoke keys
- **Rate Limit Display** - Show current usage
- **Webhook Configuration** - Set up webhooks

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: Low - Developer/admin feature

---

## 13. Settings API

### Endpoints
- User profile settings (via Supabase Auth)
- Notification preferences (user metadata)
- Account management (Supabase)

### UI Components (✅ BUILT)
- **`app/settings/profile/page.tsx`** - Profile settings
- **`app/settings/notifications/page.tsx`** - Notification preferences
- **`app/settings/account/page.tsx`** - Account management
- **`components/Settings/SettingsLayout.tsx`** - Navigation

### Integration Status
✅ **COMPLETE** - All settings wired to Supabase

---

## 14. Ad Pixel Tracking API

### Endpoints
- `GET /api/v1/pixels` - List pixel configs
- `POST /api/v1/pixels` - Create pixel config
- `POST /api/v1/pixels/track` - Track event
- `GET /api/v1/pixels/analytics` - Get analytics

### UI Components (❌ NOT BUILT)
- **Pixel Configuration Manager**
- **Event Tracking Dashboard**
- **Conversion Funnel Visualization**
- **Attribution Reports**

### Integration Status
❌ **NOT STARTED**
📋 **PRIORITY**: Low - Marketing feature

---

## Priority Matrix

### 🔴 HIGH PRIORITY (Build Next)

1. **Agent Chat Interface** ⭐⭐⭐
   - Core AI feature
   - High user value
   - Backend complete
   - **Endpoints**: `/agent/chat`, `/agent/chat/stream`, `/agent/conversation`

2. **Contact Analysis Integration** ⭐⭐⭐
   - Enhance contact detail page
   - AI-powered insights
   - Backend complete
   - **Endpoint**: `/agent/analyze/contact/:id`

3. **Real AI Message Composer** ⭐⭐
   - Replace simulated generation
   - Backend complete
   - UI already built
   - **Endpoint**: `/agent/compose/smart`

### 🟡 MEDIUM PRIORITY

4. **Custom Fields System** ⭐⭐
   - Flexible data model
   - Backend complete with AI tools
   - **Endpoints**: `/custom-fields`, `/contacts/:id/custom`

5. **Voice Notes Upload & List** ⭐⭐
   - Complete voice notes feature
   - Display components ready
   - **Endpoint**: `/agent/voice-note/process`

6. **Action Suggestions Widget** ⭐
   - Dashboard enhancement
   - Proactive relationship management
   - **Endpoint**: `/agent/suggest/actions`

7. **Warmth History Chart** ⭐
   - Component ready (WarmthChart.tsx)
   - Need backend endpoint for historical data

### 🟢 LOW PRIORITY

8. **API Keys Manager**
   - Developer/admin feature
   - **Endpoints**: Public API auth endpoints

9. **Webhook Configuration**
   - Advanced integration feature
   - **Endpoints**: Webhook management

10. **Ad Pixel Dashboard**
    - Marketing analytics
    - **Endpoints**: Pixel tracking & analytics

---

## Component to Endpoint Quick Reference

### Already Integrated ✅

| Component | Backend Endpoint | Status |
|-----------|-----------------|--------|
| ContactsList | `GET /api/v1/contacts` | ✅ Complete |
| ContactDetail | `GET /api/v1/contacts/:id` | ✅ Complete |
| ContactForm | `POST/PUT /api/v1/contacts` | ✅ Complete |
| InteractionsList | `GET /api/v1/interactions` | ✅ Complete |
| CreateInteractionModal | `POST /api/v1/interactions` | ✅ Complete |
| WarmthScore | Contact data (embedded) | ✅ Complete |
| WarmthInsights | Contact data (computed) | ✅ Complete |
| AlertsList | `GET /api/v1/alerts` | ✅ Complete |
| SettingsPages | Supabase Auth API | ✅ Complete |

### Needs Integration ⚠️

| Component | Backend Endpoint | Priority |
|-----------|-----------------|----------|
| MessageComposer | `POST /agent/compose/smart` | 🔴 High |
| (New) AgentChat | `POST /agent/chat/stream` | 🔴 High |
| (New) ContactAnalysis | `POST /agent/analyze/contact/:id` | 🔴 High |
| WarmthChart | (Need history endpoint) | 🟡 Medium |
| (New) CustomFieldsManager | `GET/POST /custom-fields` | 🟡 Medium |
| (New) VoiceNoteUpload | `POST /agent/voice-note/process` | 🟡 Medium |
| (New) ActionSuggestions | `POST /agent/suggest/actions` | 🟡 Medium |

---

## Integration Checklist

### Phase 1: Enhance Existing (Week 1)

- [ ] **Message Composer**: Connect to real AI endpoint
  - Replace simulated generation
  - Add loading states
  - Handle API errors
  - Show alternatives

- [ ] **Contact Detail**: Add analysis panel
  - Fetch relationship analysis
  - Display health score
  - Show engagement suggestions
  - Add context summary

- [ ] **Dashboard**: Add action suggestions
  - Fetch proactive suggestions
  - Display as widget
  - Allow dismiss/action

### Phase 2: Build Missing (Weeks 2-3)

- [ ] **Agent Chat Interface**
  - Full chat UI with streaming
  - Conversation history sidebar
  - Message bubbles
  - Thinking indicator
  - Function call display

- [ ] **Custom Fields System**
  - Field definition manager (admin)
  - Dynamic form builder
  - Custom fields editor (contact form)
  - Custom fields display (contact detail)

- [ ] **Voice Notes Complete**
  - Upload interface with drag & drop
  - List page with filters
  - Processing queue
  - Integration with contacts

### Phase 3: Polish (Week 4)

- [ ] **Warmth History**
  - Backend endpoint for historical data
  - Integrate WarmthChart component
  - Show trend analysis

- [ ] **Error Handling**
  - Global error boundary
  - API error states
  - Retry mechanisms
  - Offline detection

- [ ] **Testing**
  - E2E tests for new integrations
  - Component tests
  - Integration tests

---

## API Client Enhancements Needed

### Current (`lib/api.ts`)
```typescript
export async function apiFetch(url: string, options: RequestInit) {
  // Basic fetch with auth headers
}
```

### Needed Additions

#### 1. Streaming Support
```typescript
export async function apiStream(
  url: string, 
  onChunk: (data: any) => void,
  onError: (error: Error) => void
) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    onChunk(JSON.parse(chunk));
  }
}
```

#### 2. Upload Support
```typescript
export async function apiUpload(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiFetch(url, {
    method: 'POST',
    body: formData,
    onUploadProgress: onProgress,
  });
}
```

#### 3. Batch Requests
```typescript
export async function apiBatch(requests: Array<{url: string, options?: RequestInit}>) {
  return Promise.all(requests.map(r => apiFetch(r.url, r.options)));
}
```

---

## Environment Variables Needed

```bash
# Backend API
NEXT_PUBLIC_BACKEND_BASE=https://ever-reach-be.vercel.app

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# OpenAI (if client-side generation needed)
OPENAI_API_KEY=... # Server-side only

# PostHog (already configured)
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## Summary

### Built & Integrated ✅
- **Contacts CRUD** - Complete
- **Interactions System** - Complete  
- **Warmth Visualization** - UI complete
- **Alerts** - Complete
- **Settings** - Complete
- **Form Components** - Complete

### High Priority Integration ⚠️
1. **Agent Chat** - Build from scratch
2. **Contact Analysis** - Add to detail page
3. **Real AI Composer** - Connect existing UI

### Medium Priority New Features 🔨
4. **Custom Fields** - Full system
5. **Voice Notes** - Upload & list
6. **Action Suggestions** - Dashboard widget

### Total Backend Endpoints
- **~30 API endpoints** documented in memories
- **14 categories** of functionality
- **~40% already integrated** in frontend
- **~60% needs UI** or integration work

**Next Steps**: Start with Agent Chat interface as it's the highest value AI feature with complete backend support! 🚀
