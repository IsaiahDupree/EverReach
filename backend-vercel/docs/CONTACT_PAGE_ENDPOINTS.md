# Contact Page - Endpoint Mapping

**Status**: ✅ All endpoints exist in backend branch!  
**Branch**: feat/backend-vercel-only-clean

---

## 📋 UI Component → Endpoint Mapping

Based on the contact page screenshot, here's what each section needs:

### ✅ **1. Contact Header** (Avatar, Name, Warmth Badge)
```
GET /api/v1/contacts/:id
```
**Returns**: 
- `display_name`, `avatar_url`
- `warmth` (score), `warmth_band` (hot/warm/cooling/cold)
- `created_at`, `updated_at`, etc.

---

### ✅ **2. Pipeline Theme & Status** (Tabs & Chips)
```
GET /api/v1/contacts/:id
```
**Returns**: 
- `pipeline_id`, `stage_id`, `tags[]`

```
GET /api/v1/contacts/:id/pipeline
```
**Returns**: Current pipeline and stage details

```
GET /api/v1/pipelines
```
**Returns**: All available pipelines with stages

```
POST /api/v1/contacts/:id/pipeline/move
```
**Body**: `{ stage_id }`  
**Purpose**: Move contact to different stage

---

### ✅ **3. 💡 AI Goal Suggestions (NEW)**
```
GET /api/v1/contacts/:id/goal-suggestions
```
**Returns**: 
```json
{
  "suggestions": [
    {
      "type": "follow_up",
      "text": "Follow up on project X...",
      "priority": "high",
      "goal": "business"
    }
  ]
}
```

---

### ✅ **4. ⚡ Craft Message (existing)**
```
POST /api/v1/compose
```
**Body**: 
```json
{
  "contact_id": "uuid",
  "channel": "email",
  "goal": "business",
  "context": "optional context"
}
```
**Returns**: 
```json
{
  "draft": {
    "email": { "subject": "...", "body": "..." }
  }
}
```

---

### ✅ **5. 📱 Context Summary (existing)**
```
GET /api/v1/contacts/:id/context-summary
```
**Returns**: Quick summary of contact context

```
GET /api/v1/contacts/:id/context-bundle
```
**Returns**: Complete LLM-ready context bundle (more detailed)

---

### ✅ **6. 📞 Contact Channels (NEW)**
```
GET /api/v1/contacts/:id/channels
```
**Returns**: 
```json
[
  {
    "id": "uuid",
    "type": "email",
    "value": "john@example.com",
    "is_primary": true,
    "verified": true
  },
  {
    "id": "uuid",
    "type": "phone",
    "value": "+1234567890",
    "is_primary": false,
    "verified": false
  }
]
```

```
POST /api/v1/contacts/:id/channels
```
**Body**: `{ type: 'email', value: 'new@email.com', is_primary: false }`

```
PATCH /api/v1/contacts/:id/channels/:channelId
```
**Body**: `{ is_primary: true }` or `{ verified: true }`

```
DELETE /api/v1/contacts/:id/channels/:channelId
```

---

### ✅ **7. 💬 Recent Interactions (NEW)**
```
GET /api/v1/contacts/:id/interactions?limit=10
```
**Returns**: 
```json
[
  {
    "id": "uuid",
    "kind": "email",
    "channel": "email",
    "direction": "outbound",
    "summary": "Email - 2 days ago",
    "content": "...",
    "occurred_at": "2025-10-11T...",
    "created_at": "2025-10-11T..."
  }
]
```

**Alternative**: Use existing `/api/interactions?contact_id=:id`

---

### ✅ **8. 📝 Notes (NEW)**
```
GET /api/v1/contacts/:id/notes
```
**Returns**: 
```json
[
  {
    "id": "uuid",
    "body": "Note text here",
    "created_at": "2025-10-13T...",
    "created_by": "user_id"
  }
]
```

```
POST /api/v1/contacts/:id/notes
```
**Body**: `{ body: 'New note text' }`

```
PATCH /api/v1/contacts/:id/notes/:noteId
```
**Body**: `{ body: 'Updated text' }`

```
DELETE /api/v1/contacts/:id/notes/:noteId
```

---

### ✅ **9. 📊 Pipeline History (NEW)**
```
GET /api/v1/contacts/:id/pipeline/history
```
**Returns**: 
```json
[
  {
    "id": "uuid",
    "from_stage_id": "uuid",
    "from_stage_name": "Lead",
    "to_stage_id": "uuid",
    "to_stage_name": "Qualified",
    "changed_at": "2025-10-10T...",
    "changed_by": "user_id",
    "reason": "Met qualification criteria"
  }
]
```

---

### ✅ **10. 📎 Files (NEW)**
```
GET /api/v1/contacts/:id/files
```
**Returns**: 
```json
[
  {
    "id": "uuid",
    "file_path": "contacts/uuid/document.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 102400,
    "filename": "document.pdf",
    "created_at": "2025-10-12T..."
  }
]
```

```
POST /api/uploads/sign
```
**Body**: `{ path: 'contacts/:id/file.pdf', contentType: 'application/pdf' }`  
**Returns**: `{ url: 'signed-upload-url', path: '...' }`

```
POST /api/files/commit
```
**Body**: `{ path: '...', mime_type: '...', size_bytes: 123, contact_id: 'uuid' }`

```
DELETE /api/v1/contacts/:id/files/:fileId
```

---

## 📊 **Endpoint Summary**

### ✅ Already Implemented (All from backend branch!)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/contacts/:id` | GET, PATCH, DELETE | Main contact CRUD |
| `/api/v1/contacts/:id/channels` | GET, POST | List/add channels |
| `/api/v1/contacts/:id/channels/:channelId` | PATCH, DELETE | Update/delete channel |
| `/api/v1/contacts/:id/notes` | GET, POST | List/add notes |
| `/api/v1/contacts/:id/notes/:noteId` | PATCH, DELETE | Update/delete note |
| `/api/v1/contacts/:id/files` | GET | List files |
| `/api/v1/contacts/:id/pipeline` | GET | Current pipeline |
| `/api/v1/contacts/:id/pipeline/history` | GET | Stage history |
| `/api/v1/contacts/:id/pipeline/move` | POST | Move stage |
| `/api/v1/contacts/:id/goal-suggestions` | GET | AI suggestions ✨ |
| `/api/v1/contacts/:id/context-summary` | GET | Quick context |
| `/api/v1/contacts/:id/context-bundle` | GET | Full context |
| `/api/v1/contacts/:id/messages` | GET | Messages history |
| `/api/v1/contacts/:id/tags` | GET, POST, DELETE | Tag management |
| `/api/v1/contacts/:id/watch` | POST | Watch status |
| `/api/v1/contacts/:id/warmth/recompute` | POST | Recalculate warmth |
| `/api/v1/contacts/:id/preferences` | GET, PATCH | Contact preferences |
| `/api/v1/contacts/:id/effective-channel` | GET | Best channel to use |
| `/api/v1/contacts/:id/custom` | GET, PATCH | Custom fields |
| `/api/v1/compose` | POST | Craft AI message |
| `/api/uploads/sign` | POST | Get upload URL |
| `/api/files/commit` | POST | Finalize upload |

---

## 🎯 **What You Need to Do**

### **Nothing!** 🎉

All endpoints already exist in the backend branch! You just need to:

1. ✅ **Use existing endpoints** - They're all ready
2. ✅ **Frontend integration** - Connect React components to these endpoints
3. ✅ **Test the flow** - Verify each section works

---

## 📱 **Frontend Component Mapping**

Here's how to wire up your UI:

```typescript
// Contact Header
const { data: contact } = useQuery(['contact', id], 
  () => fetch(`/api/v1/contacts/${id}`).then(r => r.json())
);

// AI Goal Suggestions
const { data: suggestions } = useQuery(['goal-suggestions', id],
  () => fetch(`/api/v1/contacts/${id}/goal-suggestions`).then(r => r.json())
);

// Contact Channels
const { data: channels } = useQuery(['channels', id],
  () => fetch(`/api/v1/contacts/${id}/channels`).then(r => r.json())
);

// Recent Interactions
const { data: interactions } = useQuery(['interactions', id],
  () => fetch(`/api/v1/contacts/${id}/interactions?limit=10`).then(r => r.json())
);

// Notes
const { data: notes } = useQuery(['notes', id],
  () => fetch(`/api/v1/contacts/${id}/notes`).then(r => r.json())
);

// Pipeline History
const { data: history } = useQuery(['pipeline-history', id],
  () => fetch(`/api/v1/contacts/${id}/pipeline/history`).then(r => r.json())
);

// Files
const { data: files } = useQuery(['files', id],
  () => fetch(`/api/v1/contacts/${id}/files`).then(r => r.json())
);

// Context Summary
const { data: summary } = useQuery(['context-summary', id],
  () => fetch(`/api/v1/contacts/${id}/context-summary`).then(r => r.json())
);
```

---

## 🚀 **Bonus Features Available**

The backend also has these extra features ready:

- **Custom Fields**: `/api/v1/contacts/:id/custom`
- **Watch Status**: `/api/v1/contacts/:id/watch` (for warmth alerts)
- **Warmth Recompute**: `/api/v1/contacts/:id/warmth/recompute`
- **Preferences**: `/api/v1/contacts/:id/preferences`
- **Effective Channel**: `/api/v1/contacts/:id/effective-channel` (AI picks best channel)
- **Messages History**: `/api/v1/contacts/:id/messages`

---

## ✅ **Next Steps**

1. **Frontend Development**: Connect UI components to existing endpoints
2. **Testing**: Verify each section works with real data
3. **Polish**: Add loading states, error handling, optimistic updates
4. **Deploy**: Both frontend and backend are ready!

---

**Status**: 🎉 **ALL ENDPOINTS READY!**  
**Backend Branch**: feat/backend-vercel-only-clean  
**Last Updated**: October 13, 2025
