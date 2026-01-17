# Complete Backend-Frontend API Mapping

**Based on Actual Backend Documentation**  
**Backend Docs**: `backend-vercel/docs/API_ENDPOINTS.md` (113 endpoints)  
**Date**: October 16, 2025

---

## 📚 Backend Documentation Sources

- **[API_ENDPOINTS.md](../../../backend-vercel/docs/API_ENDPOINTS.md)** - All 113 endpoints across 24 categories
- **[FEATURE_INDEX.md](../../../backend-vercel/docs/FEATURE_INDEX.md)** - Feature organization & documentation
- **[DASHBOARD_ENDPOINTS.md](../../../backend-vercel/docs/DASHBOARD_ENDPOINTS.md)** - Dashboard API specifications
- **[PUBLIC_API_GUIDE.md](../../../backend-vercel/docs/PUBLIC_API_GUIDE.md)** - Public API reference

**Backend Stats**: 113 endpoints | 24 categories | ~25,000+ LOC | 90%+ test coverage

---

## Summary by Category

| Category | Endpoints | Frontend Status | Priority |
|----------|-----------|----------------|----------|
| **Contacts** | 24 | ✅ 60% Complete | High |
| **Interactions** | 2 | ✅ 100% Complete | Done |
| **Agent/AI** | 10 | ⚠️ 10% (Simulated) | 🔴 Critical |
| **Warmth** | 2 | ⚠️ 50% (Missing summary) | 🔴 High |
| **Alerts** | 4 | ✅ 100% Complete | Done |
| **Custom Fields** | 2 | ❌ 0% | 🔴 High |
| **Templates** | 3 | ❌ 0% | 🟡 Medium |
| **Pipelines** | 4 | ❌ 0% | 🟡 Medium |
| **Goals** | 3 | ❌ 0% | 🟡 Medium |
| **Feature Requests** | 6 | ❌ 0% | 🟢 Low |
| **Search** | 1 | ❌ 0% | 🟡 Medium |
| **Me/User** | 5 | ⚠️ 20% | 🟡 Medium |
| **Billing** | 3 | ❌ 0% | 🟢 Low |
| **Files** | 2 | ❌ 0% | 🟡 Medium |
| **Others** | 42 | Various | Various |

**Overall**: ~40% integrated | ~35% high priority missing | ~25% future features

---

## 🔴 Critical Missing Integrations

### 1. Agent Chat (`/v1/agent/chat` + `/stream`)
**Status**: ❌ NOT BUILT  
**Priority**: 🔴 CRITICAL - Core AI feature

**Endpoints**:
```
POST /v1/agent/chat - Non-streaming chat
POST /v1/agent/chat/stream - Server-Sent Events streaming
GET /v1/agent/conversation - List conversations
GET /v1/agent/conversation/:id - Get conversation
DELETE /v1/agent/conversation/:id - Delete conversation
GET /v1/agent/tools - List available AI tools
```

**Need to Build**:
- `components/Agent/AgentChatInterface.tsx`
- `components/Agent/ChatMessage.tsx`
- `components/Agent/ConversationSidebar.tsx`
- `components/Agent/StreamingMessage.tsx`
- `lib/hooks/useAgentChat.ts`
- `lib/hooks/useConversations.ts`

### 2. Contact Analysis (`/v1/agent/analyze/contact`)
**Status**: ❌ NOT BUILT  
**Priority**: 🔴 HIGH - AI insights

**Endpoint**:
```
POST /v1/agent/analyze/contact
Body: {
  contactId: string,
  type: 'relationship_health' | 'engagement_suggestions' | 
        'context_summary' | 'full_analysis'
}
```

**Need to Build**:
- `components/Agent/ContactAnalysisPanel.tsx`
- Add to contact detail page
- `lib/hooks/useContactAnalysis.ts`

### 3. Smart Compose (`/v1/agent/compose/smart`)
**Status**: ⚠️ SIMULATED - UI exists with fake AI  
**Priority**: 🔴 HIGH - Replace simulation

**Current**: `app/compose/page.tsx` uses setTimeout simulation  
**Fix**: Connect to real endpoint (2 hour change)

### 4. Custom Fields (`/v1/custom-fields`, `/contacts/:id/custom`)
**Status**: ❌ NOT BUILT  
**Priority**: 🔴 HIGH - Flexible data model

**Endpoints**:
```
GET /v1/custom-fields?entity=contact - List field definitions
POST /v1/custom-fields - Create field definition
GET /v1/contacts/:id/custom - Get custom values
PATCH /v1/contacts/:id/custom - Update custom values
```

**Need to Build**:
- `app/custom-fields/page.tsx` - Admin UI for field defs
- `components/CustomFields/FieldDefinitionForm.tsx`
- `components/CustomFields/DynamicFieldsEditor.tsx`
- Integration in contact form/detail

### 5. Warmth Summary (`/v1/warmth/summary`)
**Status**: ❌ NOT BUILT  
**Priority**: 🔴 HIGH - Dashboard widget

**Endpoint**:
```
GET /v1/warmth/summary
Returns: {
  total_contacts: number,
  by_band: { hot, warm, cooling, cold },
  average_score: number,
  contacts_needing_attention: number
}
```

**Need to Build**:
- `components/Dashboard/WarmthSummaryWidget.tsx`
- Add to dashboard page
- `lib/hooks/useWarmthSummary.ts`

---

## ✅ Fully Integrated Features

### Contacts Core
- ✅ CRUD operations (`GET/POST/PUT/DELETE /v1/contacts`)
- ✅ Tags management
- ✅ Watch status
- ✅ Individual warmth recompute

### Interactions
- ✅ List/create interactions
- ✅ Timeline display
- ✅ Date grouping
- ✅ Filters (contact_id, type, date range)

### Alerts
- ✅ List alerts
- ✅ Dismiss/snooze/reached_out actions
- ✅ Dashboard widget

### Settings
- ✅ Profile settings
- ✅ Notification preferences
- ✅ Account management (Supabase)

---

## 🟡 Medium Priority Features

### Voice Notes
- ✅ Player component built
- ✅ Transcription display built
- ✅ Processing status built
- ❌ Upload interface missing
- ❌ List page missing
- **Endpoint**: `POST /v1/agent/voice-note/process`

### Templates
- ❌ Not built
- **Endpoints**: `GET/POST /v1/templates`, `GET/PATCH/DELETE /v1/templates/:id`

### Pipelines
- ❌ Not built
- **Endpoints**: `GET/POST /v1/pipelines`, Kanban board needed

### Goals
- ❌ Not built
- **Endpoints**: `GET/POST /v1/goals`

### Search
- ❌ Global search not built
- **Endpoint**: `POST /v1/search`

---

## Quick Wins (High Impact, Low Effort)

### 1. Fix Message Composer (2 hours)
**Current**: Simulated AI with setTimeout  
**Change**: Connect to `/v1/agent/compose/smart`

```typescript
// In app/compose/page.tsx - Replace simulation
const response = await apiFetch('/api/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contactId, goal, channel, tone, customPrompt
  })
});
```

### 2. Add Warmth Summary Widget (3 hours)
**Add to dashboard**: `GET /v1/warmth/summary`  
**Component**: `WarmthSummaryWidget.tsx`

### 3. Add Contact Analysis Panel (4 hours)
**Add to contact detail**: `POST /v1/agent/analyze/contact`  
**Component**: `ContactAnalysisPanel.tsx`

### 4. Add Action Suggestions (3 hours)
**Proactive nudges**: `POST /v1/agent/suggest/actions` (if endpoint exists)

---

## Integration Roadmap

### Week 1: AI Core (16 hours)
1. Agent Chat Interface (6h)
2. Fix Message Composer (2h)
3. Contact Analysis Panel (4h)
4. Warmth Summary Widget (3h)
5. Testing (1h)

### Week 2: Data & Customization (16 hours)
1. Custom Fields System (8h)
2. Voice Notes Upload/List (4h)
3. Context Bundle Integration (2h)
4. Testing (2h)

### Week 3: Workflows (16 hours)
1. Templates System (6h)
2. Pipelines/Kanban (6h)
3. Goals Tracking (2h)
4. Global Search (2h)

### Week 4: Polish (16 hours)
1. File Uploads (4h)
2. User Preferences (4h)
3. Additional Features (4h)
4. E2E Testing (4h)

**Total**: ~64 hours to reach 90% integration

---

## API Client Enhancements Needed

### 1. Streaming Support (SSE)
```typescript
// lib/api/streaming.ts
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
    onChunk(JSON.parse(decoder.decode(value)));
  }
}
```

### 2. File Upload
```typescript
// lib/api/upload.ts
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

---

## Environment Variables

Already configured in `.env`:
```bash
NEXT_PUBLIC_BACKEND_BASE=https://ever-reach-be.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

---

## Next Steps

1. **Review backend docs** in `backend-vercel/docs/`
2. **Start with Agent Chat** - highest value feature
3. **Fix Message Composer** - quick win (2 hours)
4. **Add Warmth Summary** - dashboard enhancement
5. **Build Custom Fields** - flexible data model

**Target**: 80% integration in 2-3 weeks 🚀
