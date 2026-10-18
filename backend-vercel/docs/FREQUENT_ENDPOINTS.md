# Most Frequently Used Endpoints

Quick reference for the endpoints you'll use 90% of the time.

---

## 📱 Core Features (80% Usage)

### Contacts Management
```
GET    /api/v1/contacts              List/search contacts
GET    /api/v1/contacts/:id          Get contact details
POST   /api/v1/contacts              Create contact
PATCH  /api/v1/contacts/:id          Update contact
POST   /api/v1/contacts/:id/tags     Add/remove tags
```

**Most Common:**
- List hot contacts: `GET /contacts?warmth_band=hot&limit=50`
- Search: `GET /contacts?q=john&limit=20`
- Update company: `PATCH /contacts/:id` with `{ company: "Acme" }`

---

### Warmth Tracking
```
GET    /api/v1/contacts/:id/warmth/current            Current score + days since contact
GET    /api/v1/contacts/:id/warmth/history            Daily history (charts)
GET    /api/v1/contacts/:id/warmth/windowed-history   Weekly/monthly aggregates
POST   /api/v1/contacts/:id/warmth/recompute          Force recalculation
```

**Most Common:**
- Get current warmth: `GET /contacts/:id/warmth/current`
- 30-day chart data: `GET /contacts/:id/warmth/history?limit=30`
- After adding interaction: `POST /contacts/:id/warmth/recompute`

**Important:** Warmth auto-decays daily at 1 AM UTC (-0.5 points/day after 7 days).

---

### Interactions
```
GET    /api/v1/interactions           List all interactions
GET    /api/v1/interactions?contact_id=X   Get contact's interactions
POST   /api/v1/interactions           Log new interaction
```

**Most Common:**
- Log email: `POST /interactions` with `{ contact_id, kind: "email", content: "..." }`
- Get recent: `GET /interactions?contact_id=X&limit=10`
- After logging: Always call `POST /contacts/:id/warmth/recompute`

---

### AI Message Composition
```
POST   /api/v1/agent/compose/smart    Generate AI message
```

**Request:**
```json
{
  "contact_id": "uuid",
  "goal": "networking",
  "channel": "email",
  "tone": "warm"
}
```

**Response:**
```json
{
  "draft": {
    "email": {
      "subject": "Great Catching Up!",
      "body": "Hi John,\n\n..."
    }
  }
}
```

**Most Common:**
- Email to reconnect: `goal: "networking", tone: "warm"`
- Business follow-up: `goal: "business", tone: "professional"`
- SMS check-in: `channel: "sms", tone: "concise"`

---

## 🎯 Power Features (15% Usage)

### File Uploads (3-step flow)
```
1. POST   /api/v1/files              Get presigned URL
2. PUT    <presigned_url>            Upload file to storage
3. POST   /api/files/commit          Create attachment record
```

**Example:**
```javascript
// 1. Get URL
POST /api/v1/files
{ "path": "uploads/audio.wav", "contentType": "audio/wav" }

// 2. Upload
PUT <presigned_url>
Body: file blob

// 3. Commit
POST /api/files/commit
{ "path": "uploads/audio.wav", "mime_type": "audio/wav", "size_bytes": 12345 }
```

---

### Voice Notes
```
POST   /api/v1/files/:id/transcribe        Transcribe audio (auto-chunks > 20MB)
POST   /api/v1/agent/voice-note/process    AI analysis (contacts, actions, sentiment)
```

**Workflow:**
1. Upload file (3-step flow above)
2. Transcribe: `POST /files/:id/transcribe` → Get transcript
3. Process: `POST /agent/voice-note/process` → Get AI insights

---

### Persona Notes
```
GET    /api/v1/me/persona-notes       List your notes
POST   /api/v1/me/persona-notes       Create note (text or voice)
```

---

### Billing
```
POST   /api/billing/checkout          Create Stripe checkout session
POST   /api/billing/portal            Open customer portal
```

**Usage:**
```javascript
const { url } = await fetch('/api/billing/checkout', { method: 'POST' });
window.location.href = url; // Redirect to Stripe
```

---

## 🔧 Utility Endpoints (5% Usage)

### Authentication
```
GET    /api/v1/me                     Current user info
```

### Health Check
```
GET    /api/health                    API status
```

---

## 📊 Usage Patterns

### Pattern 1: Create Contact → Log Interaction
```javascript
// 1. Create contact
POST /api/v1/contacts
{ display_name: "Jane", emails: ["jane@example.com"] }

// 2. Log first interaction
POST /api/v1/interactions
{ contact_id: "new-id", kind: "email", content: "Met at conference" }

// 3. Recompute warmth
POST /api/v1/contacts/:id/warmth/recompute
```

---

### Pattern 2: Get Contact + Warmth + Interactions
```javascript
// Parallel requests for performance
const [contact, warmth, interactions] = await Promise.all([
  fetch('/api/v1/contacts/:id'),
  fetch('/api/v1/contacts/:id/warmth/current'),
  fetch('/api/v1/interactions?contact_id=:id&limit=10')
]);
```

---

### Pattern 3: Compose + Log + Update Warmth
```javascript
// 1. Generate AI message
const { draft } = await fetch('/api/v1/agent/compose/smart', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: 'uuid',
    goal: 'networking',
    channel: 'email'
  })
});

// 2. Log outgoing interaction
await fetch('/api/v1/interactions', {
  method: 'POST',
  body: JSON.stringify({
    contact_id: 'uuid',
    kind: 'email',
    content: draft.email.body,
    metadata: { direction: 'outgoing' }
  })
});

// 3. Refresh warmth
await fetch('/api/v1/contacts/:id/warmth/recompute', { method: 'POST' });
```

---

### Pattern 4: Upload Voice Note → Transcribe → Process
```javascript
// 1. Upload (3 steps)
const attachment = await uploadFile(audioFile);

// 2. Transcribe
const { transcript } = await fetch(`/api/v1/files/${attachment.id}/transcribe`, {
  method: 'POST'
});

// 3. Create note
const { note } = await fetch('/api/v1/me/persona-notes', {
  method: 'POST',
  body: JSON.stringify({
    type: 'voice',
    file_url: attachment.file_path,
    transcript
  })
});

// 4. AI analysis
const analysis = await fetch('/api/v1/agent/voice-note/process', {
  method: 'POST',
  body: JSON.stringify({ note_id: note.id })
});
```

---

## 🚨 Common Gotchas

### 1. Warmth Not Updated After Interaction
**Problem:** Warmth score doesn't change after logging interaction  
**Solution:** Always call `POST /contacts/:id/warmth/recompute` after adding interactions  
**Why:** Warmth is only auto-updated daily at 1 AM UTC by cron job

### 2. File Upload 413 Error
**Problem:** Large file upload fails with "Payload Too Large"  
**Solution:** Use 3-step upload flow (sign → upload to storage → commit)  
**Why:** Direct uploads hit Vercel's 4.5MB body limit

### 3. Transcription Takes Too Long
**Problem:** Audio transcription times out for large files  
**Solution:** Already handled! Files > 20MB are auto-chunked at 10MB  
**Note:** Chunking is transparent - you just get the full transcript

### 4. Compose Smart Returns Wrong Format
**Problem:** Expected email draft but got different structure  
**Solution:** Check `draft.email`, `draft.sms`, or `draft.dm` based on channel  
**Note:** Only the requested channel will be populated

### 5. 401 Unauthorized Errors
**Problem:** Requests fail with 401 after some time  
**Solution:** Implement token refresh - JWT expires after 1 hour  
**Fix:** Catch 401, refresh token with Supabase, retry request

---

## 📚 Full Documentation

- **Quick Reference:** [`FRONTEND_API_GUIDE.md`](./FRONTEND_API_GUIDE.md)
- **Code Examples:** [`API_EXAMPLES.md`](./API_EXAMPLES.md) - React hooks, TypeScript, workflows
- **Complete Spec:** [`openapi/openapi.json`](../openapi/openapi.json) - All 113 endpoints
- **Warmth System:** [Warmth decay explanation](./WARMTH_DECAY_GUIDE.md)
- **E2E Tests:** [`E2E_TESTS_COMPLETION_SUMMARY.md`](./E2E_TESTS_COMPLETION_SUMMARY.md)

---

## 🎯 Quick Start Checklist

### For New Frontend Developers

**Authentication:**
- [ ] Get JWT token from Supabase Auth
- [ ] Pass in `Authorization: Bearer <token>` header
- [ ] Implement token refresh on 401

**Contacts:**
- [ ] Fetch contacts list with `GET /contacts?limit=50`
- [ ] Create contact with `POST /contacts`
- [ ] Get single contact with `GET /contacts/:id`

**Warmth:**
- [ ] Display current warmth with `GET /contacts/:id/warmth/current`
- [ ] Show 30-day chart with `GET /contacts/:id/warmth/history?limit=30`
- [ ] Recompute after interactions with `POST /contacts/:id/warmth/recompute`

**Interactions:**
- [ ] Log interactions with `POST /interactions`
- [ ] Always recompute warmth after logging

**AI Features:**
- [ ] Compose messages with `POST /agent/compose/smart`
- [ ] Show draft in UI for editing before sending

**Error Handling:**
- [ ] Retry on 5xx errors (exponential backoff)
- [ ] Refresh token on 401
- [ ] Respect rate limits (429)
- [ ] Show user-friendly error messages

---

**Base URL:** `https://ever-reach-be.vercel.app`  
**Auth:** All endpoints require JWT Bearer token
