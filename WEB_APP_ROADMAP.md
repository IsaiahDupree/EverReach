# EverReach Web App - Development Roadmap

**Status**: In Progress  
**Last Updated**: 2025-10-07  
**Production URL**: https://everreach.app  
**Backend API**: https://ever-reach-be.vercel.app

---

## 🎯 Current Status

✅ **Completed**:
- Authentication (Google OAuth via Supabase)
- Basic Contacts list page
- Basic Contact detail page (read-only)
- Warmth Alerts page (list, dismiss, snooze, reached_out)
- Voice Notes page (upload, transcribe)
- Settings page (analytics opt-in, sign out)
- Auth guards (RequireAuth component)
- Production deployment to Vercel
- Domain setup (everreach.app)
- Backend CORS configured

---

## 📋 Feature Roadmap

### 🔴 Phase 1: Foundation & Core (HIGH Priority)

#### 1.1 Data Management Layer
**ID**: `web-data-1`  
**Dependencies**: None  
**Effort**: 4 hours

**Tasks**:
- [ ] Install React Query or SWR
- [ ] Create API hooks for contacts, interactions, alerts
- [ ] Configure caching strategies
- [ ] Add optimistic updates
- [ ] Error handling and retry logic

**Files to Create**:
- `web/lib/hooks/useContacts.ts`
- `web/lib/hooks/useInteractions.ts`
- `web/lib/hooks/useAlerts.ts`

---

#### 1.2 UI Component Library
**ID**: `web-ui-1`, `web-ui-2`, `web-ui-3`  
**Dependencies**: None  
**Effort**: 6 hours

**Tasks**:
- [ ] Install @headlessui/react
- [ ] Create Dialog component (modals)
- [ ] Create Dropdown/Menu component
- [ ] Create Combobox (autocomplete)
- [ ] Create Toast notification system
- [ ] Create Loading spinner & skeleton loaders
- [ ] Create Button variants (primary, secondary, danger)

**Files to Create**:
- `web/components/ui/Dialog.tsx`
- `web/components/ui/Dropdown.tsx`
- `web/components/ui/Combobox.tsx`
- `web/components/ui/Toast.tsx`
- `web/components/ui/Spinner.tsx`
- `web/components/ui/Skeleton.tsx`
- `web/components/ui/Button.tsx`

---

#### 1.3 Dashboard/Home Page
**ID**: `web-core-1`  
**Dependencies**: `web-data-1`, `web-ui-1`, `web-ui-3`  
**Effort**: 8 hours

**Features**:
- Warmth alerts summary (cold/cool contacts)
- Relationship health overview (hot/warm/cool/cold counts)
- Quick actions (Add Contact, Voice Note, AI Chat, Compose Message)
- Recent activity feed (last 10 interactions)
- Follow-ups due today

**Backend APIs**:
- `GET /api/v1/contacts?limit=100`
- `GET /api/v1/alerts`
- `GET /api/v1/interactions?limit=10&order=desc`

**Files**:
- `web/app/page.tsx` (already exists, enhance)
- `web/components/Dashboard/WarmthAlertsSummary.tsx`
- `web/components/Dashboard/RelationshipHealthGrid.tsx`
- `web/components/Dashboard/QuickActions.tsx`
- `web/components/Dashboard/RecentActivity.tsx`

---

#### 1.4 Enhanced Contacts List
**ID**: `web-core-2`  
**Dependencies**: `web-data-1`, `web-ui-1`, `web-ui-3`  
**Effort**: 8 hours

**Features**:
- Display: name, warmth score, warmth indicator (color dot), tags, last interaction
- Search by name, company, tags
- Filters: warmth level (hot/warm/cool/cold), tags, watch status
- Sort: last interaction, warmth, name
- Pagination (20-50 per page)
- Click row to open detail page

**Backend APIs**:
- `GET /api/v1/contacts?search=query&tags=tag1,tag2&warmth=cold&limit=50&offset=0`

**Files**:
- `web/app/contacts/page.tsx` (already exists, enhance)
- `web/components/Contacts/ContactsTable.tsx`
- `web/components/Contacts/ContactRow.tsx`
- `web/components/Contacts/SearchBar.tsx`
- `web/components/Contacts/FilterPanel.tsx`

---

#### 1.5 Enhanced Contact Detail
**ID**: `web-core-3`  
**Dependencies**: `web-data-1`, `web-ui-1`, `web-ui-2`  
**Effort**: 10 hours

**Features**:
- Header: display name (editable), warmth score + indicator, watch status toggle
- Contact info: emails, phones (arrays), company, title, location, timezone
- Tags: display as pills, add/remove, autocomplete
- Warmth section: current score, last interaction, "Recompute" button
- Interactions timeline preview (last 5)
- Voice notes mentioning contact
- AI features section: Context Summary, Compose Message, Analyze buttons
- Edit/Delete buttons

**Backend APIs**:
- `GET /api/v1/contacts/[id]`
- `PUT /api/v1/contacts/[id]` (update)
- `DELETE /api/v1/contacts/[id]`
- `GET /api/v1/contacts/[id]/tags`
- `PUT /api/v1/contacts/[id]/tags`
- `PUT /api/v1/contacts/[id]/watch` (set watch status)
- `POST /api/v1/contacts/[id]/warmth/recompute`

**Files**:
- `web/app/contacts/[id]/page.tsx` (already exists, enhance)
- `web/components/Contacts/ContactHeader.tsx`
- `web/components/Contacts/ContactInfo.tsx`
- `web/components/Contacts/TagsEditor.tsx`
- `web/components/Contacts/WarmthSection.tsx`
- `web/components/Contacts/WatchStatusToggle.tsx`

---

#### 1.6 Add/Edit Contact Form
**ID**: `web-core-4`  
**Dependencies**: `web-data-1`, `web-ui-1`  
**Effort**: 6 hours

**Features**:
- Form fields: display_name (required), company, title, emails (array), phones (array), tags (multi-select), notes, location, timezone
- Tags autocomplete (from existing tags)
- Validation: name required, email format
- Save button (create or update)
- Cancel button

**Backend APIs**:
- `POST /api/v1/contacts` (create)
- `PUT /api/v1/contacts/[id]` (update)

**Files**:
- `web/app/contacts/new/page.tsx`
- `web/app/contacts/[id]/edit/page.tsx`
- `web/components/Contacts/ContactForm.tsx`

---

#### 1.7 Interactions Timeline
**ID**: `web-interactions-1`  
**Dependencies**: `web-data-1`, `web-ui-3`  
**Effort**: 6 hours

**Features**:
- List all interactions: date/time, contact name (link), type icon, summary, direction
- Filters: contact, type (call/meeting/message/note), date range, direction
- Pagination
- "Add Interaction" button

**Backend APIs**:
- `GET /api/v1/interactions?limit=50&offset=0&order=desc`
- `GET /api/v1/interactions?contact_id=[id]`

**Files**:
- `web/app/interactions/page.tsx`
- `web/components/Interactions/InteractionsTimeline.tsx`
- `web/components/Interactions/InteractionRow.tsx`
- `web/components/Interactions/FilterPanel.tsx`

---

#### 1.8 Add/Edit Interaction Form
**ID**: `web-interactions-2`  
**Dependencies**: `web-data-1`, `web-ui-1`  
**Effort**: 6 hours

**Features**:
- Contact selector (autocomplete search)
- Type dropdown (call, meeting, message, note, webhook)
- Direction (inbound/outbound/internal)
- Occurred at (date/time picker, defaults to now)
- Summary (textarea)
- Sentiment (positive/neutral/negative, optional)
- Save button

**Backend APIs**:
- `POST /api/v1/interactions`
- `PUT /api/v1/interactions/[id]`

**Files**:
- `web/app/interactions/new/page.tsx`
- `web/app/interactions/[id]/edit/page.tsx`
- `web/components/Interactions/InteractionForm.tsx`

---

#### 1.9 Responsive Design
**ID**: `web-ui-5`  
**Dependencies**: All above  
**Effort**: 8 hours (ongoing)

**Tasks**:
- Mobile layout (< 768px): single column, hamburger nav
- Tablet layout (768-1024px): 2-column where appropriate
- Desktop layout (> 1024px): multi-column, sidebars
- Touch-friendly buttons and interactive elements
- Test on mobile devices

---

### 🟡 Phase 2: AI Features (HIGH Priority)

#### 2.1 AI Chat Interface
**ID**: `web-ai-1`  
**Dependencies**: `web-data-1`, `web-ui-1`, `web-ui-2`  
**Effort**: 12 hours

**Features**:
- Chat UI: message history (scrollable), user input field, send button
- Streaming responses via SSE (`/api/v1/agent/chat/stream`)
- Function call display (when agent searches contacts, etc.)
- Conversation persistence (conversation ID in URL)
- "New Conversation" button
- Example prompts for first-time users

**Backend APIs**:
- `POST /api/v1/agent/chat/stream` (SSE streaming)
- `GET /api/v1/agent/conversation` (list)
- `GET /api/v1/agent/conversation/[id]` (load)
- `DELETE /api/v1/agent/conversation/[id]`

**Files**:
- `web/app/chat/page.tsx`
- `web/components/Chat/ChatInterface.tsx`
- `web/components/Chat/MessageList.tsx`
- `web/components/Chat/MessageInput.tsx`
- `web/components/Chat/FunctionCallDisplay.tsx`

---

#### 2.2 Message Composer
**ID**: `web-ai-2`  
**Dependencies**: `web-data-1`, `web-ui-1`  
**Effort**: 10 hours

**Features**:
- Step 1: Select contact (if not from contact detail)
- Step 2: Set goal (predefined dropdown + custom text)
- Step 3: Choose channel (email, SMS, DM)
- Step 4: Set tone (concise, warm, professional, playful)
- Step 5: Context toggles (include voice notes, include interactions)
- Generate button
- Display: subject (email), body (editable), context sources
- Actions: Copy to clipboard, Edit & Regenerate

**Backend APIs**:
- `POST /api/v1/agent/compose/smart`

**Files**:
- `web/app/compose/page.tsx`
- `web/app/contacts/[id]/compose/page.tsx`
- `web/components/Compose/ComposerWizard.tsx`
- `web/components/Compose/GeneratedMessage.tsx`

---

### 🟢 Phase 3: Enhancements (MEDIUM Priority)

#### 3.1 Contact Context Summary
**ID**: `web-ai-3`  
**Dependencies**: `web-core-3`, `web-ai-1`  
**Effort**: 4 hours

**Features**:
- Button on contact detail page
- Dialog/modal with AI-generated context summary
- Display: relationship overview, key insights, recent topics

**Backend APIs**:
- `GET /api/v1/contacts/[id]/context-summary`

---

#### 3.2 Contact Relationship Analysis
**ID**: `web-ai-4`  
**Dependencies**: `web-core-3`, `web-ai-1`  
**Effort**: 6 hours

**Features**:
- Button on contact detail page
- Dialog with: health score (1-10), engagement suggestions, pattern recognition

**Backend APIs**:
- `POST /api/v1/agent/analyze/contact`

---

#### 3.3 Voice Notes List & Detail
**ID**: `web-voice-1`, `web-voice-2`  
**Dependencies**: `web-data-1`, `web-ui-1`  
**Effort**: 8 hours

**Features**:
- List page: date, duration, transcript preview, tags, play button
- Detail page: full transcript, linked contacts, metadata editor
- Already have upload/transcribe (enhance UI)

---

#### 3.4 Message Templates
**ID**: `web-templates-1`, `web-templates-2`  
**Dependencies**: `web-data-1`, `web-ui-1`  
**Effort**: 8 hours

**Features**:
- List page: template name, preview, channels, edit/delete
- Editor: name, template text (with {{placeholders}}), channels, style tags

**Backend APIs**:
- `GET /api/v1/message-goals`
- `POST /api/v1/message-goals`
- `PUT /api/v1/message-goals/[id]`
- `DELETE /api/v1/message-goals/[id]`

---

## 📐 Dependency Graph

```
Phase 1 (Foundation):
web-data-1 (React Query) ─┬─→ web-core-1 (Dashboard)
                          ├─→ web-core-2 (Contacts List)
                          ├─→ web-core-3 (Contact Detail)
                          ├─→ web-core-4 (Add/Edit Contact)
                          ├─→ web-interactions-1 (Timeline)
                          └─→ web-interactions-2 (Add Interaction)

web-ui-1 (Components) ────┬─→ web-core-1 (Dashboard)
                          ├─→ web-core-2 (Contacts List)
                          ├─→ web-core-3 (Contact Detail)
                          ├─→ web-core-4 (Add/Edit Contact)
                          └─→ web-ai-1 (Chat)

Phase 2 (AI Features):
web-ai-1 (Chat) ──────────┬─→ web-ai-3 (Context Summary)
                          └─→ web-ai-4 (Analysis)

web-core-3 (Detail) ──────┬─→ web-ai-3 (Context Summary)
                          └─→ web-ai-4 (Analysis)
```

---

## 🚀 Build Order (Recommended)

### Week 1: Foundation
1. ✅ **web-data-1**: React Query setup (4h)
2. ✅ **web-ui-1**: Headless UI components (6h)
3. ✅ **web-ui-2**: Toast system (2h)
4. ✅ **web-ui-3**: Loading states (2h)

### Week 2: Core Pages
5. ✅ **web-core-1**: Dashboard/Home (8h)
6. ✅ **web-core-2**: Enhanced Contacts List (8h)
7. ✅ **web-core-3**: Enhanced Contact Detail (10h)
8. ✅ **web-core-4**: Add/Edit Contact Form (6h)

### Week 3: Interactions & AI
9. ✅ **web-interactions-1**: Interactions Timeline (6h)
10. ✅ **web-interactions-2**: Add/Edit Interaction (6h)
11. ✅ **web-ai-1**: AI Chat Interface (12h)

### Week 4: AI Features
12. ✅ **web-ai-2**: Message Composer (10h)
13. ✅ **web-ai-3**: Context Summary (4h)
14. ✅ **web-ai-4**: Relationship Analysis (6h)

### Week 5+: Enhancements
15. Voice Notes enhancements
16. Message Templates
17. Analytics Dashboard
18. Pipeline Management
19. Real-time features

---

## 📊 Effort Summary

- **Phase 1 (Foundation & Core)**: ~62 hours
- **Phase 2 (AI Features)**: ~32 hours
- **Phase 3 (Enhancements)**: ~26 hours
- **Total Estimated**: ~120 hours

---

## 🎯 Next Action

**Start with**: `web-data-1` (React Query setup)  
**Why**: Foundation for all data fetching, enables everything else  
**Time**: 4 hours  
**Impact**: Unlocks all other features
