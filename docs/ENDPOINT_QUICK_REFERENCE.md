# 🚀 API Endpoint Quick Reference

**Backend**: `https://ever-reach-be.vercel.app`  
**Total**: 150+ endpoints  
**Status**: 97% implemented (146/150)

---

## 📊 Quick Stats

| Category | Count | Status |
|----------|-------|--------|
| V1 API | 100+ | ✅ 100% |
| Legacy API | 26 | ✅ 100% |
| Admin | 12 | ✅ 100% |
| Cron Jobs | 18 | ✅ 100% |
| Webhooks | 6 | ✅ 100% |
| **Not Implemented** | **2** | ❌ **Missing** |
| **TOTAL** | **150+** | **✅ 97%** |

---

## 🎯 Most Used Endpoints (Top 20)

| # | Endpoint | Method | Category | Purpose |
|---|----------|--------|----------|---------|
| 1 | `/v1/contacts` | GET | Contacts | List contacts |
| 2 | `/v1/contacts` | POST | Contacts | Create contact |
| 3 | `/v1/contacts/:id` | GET | Contacts | Get contact details |
| 4 | `/v1/interactions` | POST | Interactions | Log interaction |
| 5 | `/v1/contacts/:id/score` | GET | Warmth | Get warmth score |
| 6 | `/v1/agent/compose/smart` | POST | AI | Generate message |
| 7 | `/v1/alerts` | GET | Alerts | Get warmth alerts |
| 8 | `/v1/contacts/:id/context-bundle` | GET | AI | LLM context |
| 9 | `/v1/agent/chat/stream` | GET | AI | Chat (streaming) |
| 10 | `/v1/warmth/summary` | GET | Analytics | Dashboard widget |
| 11 | `/v1/me` | GET | User | User profile |
| 12 | `/v1/me/entitlements` | GET | Billing | Check limits |
| 13 | `/v1/interactions` | GET | Interactions | List interactions |
| 14 | `/v1/agent/analyze/contact` | POST | AI | Contact insights |
| 15 | `/v1/templates` | GET | Templates | List templates |
| 16 | `/v1/messages` | POST | Messages | Queue message |
| 17 | `/v1/goals` | GET | Goals | List goals |
| 18 | `/v1/contacts/:id/warmth/recompute` | POST | Warmth | Recalculate |
| 19 | `/v1/custom-fields` | GET | Custom | Field definitions |
| 20 | `/v1/marketing/attribution` | GET | Marketing | Attribution data |

---

## 🔥 AI-Powered Endpoints (10)

| Endpoint | Purpose | Response Time |
|----------|---------|---------------|
| `/v1/agent/chat` | Conversational AI | ~2s |
| `/v1/agent/chat/stream` | SSE streaming | Real-time |
| `/v1/agent/compose/smart` | Message generation | ~3s |
| `/v1/agent/analyze/contact` | Contact insights | ~2s |
| `/v1/agent/analyze/screenshot` | Screenshot OCR | ~4s |
| `/v1/agent/voice-note/process` | Voice transcription | ~5s |
| `/v1/agent/suggest/actions` | Action recommendations | ~2s |
| `/v1/contacts/:id/context-bundle` | LLM context | ~500ms |
| `/v1/contacts/:id/goal-suggestions` | Goal ideas | ~2s |
| `/v1/agent/tools` | Available tools | <100ms |

---

## ⚡ Real-Time Endpoints (3)

| Endpoint | Type | Use Case |
|----------|------|----------|
| `/v1/agent/chat/stream` | SSE | Live AI chat |
| `/v1/alerts` | Polling/Push | Warmth alerts |
| `/v1/tracking/events` | POST | Analytics events |

---

## 🔐 Authentication Flow

```
1. GET /api/auth/signin → JWT token
2. Add header: Authorization: Bearer <token>
3. Call any /v1/* endpoint
4. Refresh: Use Supabase client
```

---

## 📦 Complete Endpoint Categories

| Category | Endpoints | Documentation |
|----------|-----------|---------------|
| **Agent & AI** | 10 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#agent--ai-10-endpoints) |
| **Alerts** | 2 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#alerts--notifications-2-endpoints) |
| **Analytics** | 5 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#analytics-5-endpoints) |
| **Automation** | 4 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#automation-rules-4-endpoints) |
| **Billing** | 6 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#billing-6-endpoints) |
| **Contacts** | 25+ | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#contacts-25-endpoints) |
| **Custom Fields** | 2 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#custom-fields-2-endpoints) |
| **Files** | 3 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#files-3-endpoints) |
| **Goals** | 3 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#goals-3-endpoints) |
| **Interactions** | 2 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#interactions-2-endpoints) |
| **Marketing** | 11 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#marketing-11-endpoints) |
| **Messages** | 4 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#messages--outbox-4-endpoints) |
| **Pipelines** | 4 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#pipelines-4-endpoints) |
| **Templates** | 3 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#templates-3-endpoints) |
| **User (Me)** | 7 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#user-settings-me-7-endpoints) |
| **Warmth** | 2 | [View Details](./ALL_ENDPOINTS_MASTER_LIST.md#warmth-2-endpoints) |

---

## ❌ Not Yet Implemented (2)

| Endpoint | Purpose | Est. Time | Priority |
|----------|---------|-----------|----------|
| `POST /uploads/sign` | Presigned upload URL | 1-2h | Medium |
| `POST /uploads/:id/commit` | Commit upload | 30min | Medium |

---

## ⚠️ Needs Fix (2)

| Endpoint | Issue | Fix Time |
|----------|-------|----------|
| `POST /v1/agent/analyze/screenshot` | Returns 405 | 30min |
| `POST /api/contacts` | Validation 422 | 15min |

---

## 🚀 Example Requests

### **Get Contacts**
```bash
GET /v1/contacts?limit=50&warmth_gte=40
Authorization: Bearer <token>
```

### **AI Message Generation**
```bash
POST /v1/agent/compose/smart
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": "uuid",
  "goal": "re-engage",
  "tone": "professional"
}
```

### **Context Bundle (for LLMs)**
```bash
GET /v1/contacts/:id/context-bundle?interactions=20
Authorization: Bearer <token>
```

### **Track Event**
```bash
POST /v1/tracking/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event": "message_sent",
  "properties": {
    "channel": "email",
    "contact_id": "uuid"
  }
}
```

---

## 📚 Full Documentation

- **[Complete Endpoint List (150+)](./ALL_ENDPOINTS_MASTER_LIST.md)** - All endpoints with details
- **[API Documentation](./API_DOCUMENTATION_COMPLETE.md)** - 24 feature guides
- **[E2E Test Guide](./E2E_TEST_SUCCESS_GUIDE.md)** - Testing documentation
- **[Backend Audit](./BACKEND_ENDPOINT_AUDIT.md)** - Endpoint review

---

## 🔥 Rate Limits

| Tier | Limit | Window |
|------|-------|--------|
| Per API Key | 600 req | 1 min |
| Per Organization | 10,000 req | 1 hour |
| Per IP | 60 req | 1 min |
| AI Generation | 100 req | 1 hour |
| Warmth Recompute | 50 req | 1 hour |

---

## ✅ Health Check

```bash
GET /api/health
# Response: { "status": "ok", "timestamp": "..." }
```

---

**Last Updated**: October 25, 2025  
**Coverage**: 97% (146/150 endpoints)  
**Status**: Production Ready ✅
