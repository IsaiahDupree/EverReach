# Developer Quick Reference Guide

**Quick access to common patterns and API responses**  
**Based on:** [Comprehensive Test Report](./COMPREHENSIVE_TEST_REPORT.md)

---

## 🚀 Quick Start

### Running Tests
```bash
# Run all tests (local and deployed)
cd backend/test
node run-comprehensive-comparison.mjs

# Run single test
NEXT_PUBLIC_API_URL=http://localhost:3000/api node agent/e2e-contacts-crud.mjs

# Run with specific environment
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass node agent/test-name.mjs
```

### Test Credentials
```
Email: isaiahdupree33@gmail.com
Password: Frogger12
```

---

## 📋 API Response Cheat Sheet

### Pagination (List Endpoints)
```json
{
  "items": [],
  "limit": 10,
  "nextCursor": null
}
```
**Endpoints:** `/v1/interactions`, `/v1/me/persona-notes`, `/v1/contacts`

### Single Resource
```json
{
  "resource_name": {
    "id": "uuid",
    "created_at": "timestamp"
  }
}
```
**Endpoints:** `/v1/contacts/:id`, `/v1/interactions/:id`

### Create Response (Direct)
```json
{
  "id": "uuid",
  "created_at": "timestamp"
}
```
**Endpoints:** `POST /v1/me/persona-notes`

### Event Tracking
```json
{
  "tracked": true,
  "event_type": "string"
}
```
**Endpoint:** `POST /v1/events/track`

---

## ✅ Common Patterns

### Making API Calls
```javascript
const { res, json, ms } = await apiFetch(BASE, '/v1/endpoint', {
  method: 'POST',
  token,
  origin: 'https://everreach.app',
  body: JSON.stringify(payload),
});
```

### Checking List Responses
```javascript
// ✅ Correct
const pass = res.status === 200 && Array.isArray(json?.items);

// ❌ Wrong
const pass = res.status === 200 && Array.isArray(json?.interactions);
```

### Getting Resource ID
```javascript
// ✅ Handles both formats
const id = json?.id || json?.resource?.id;
```

---

## ❌ Common Mistakes

### 1. Missing /api in URL
```javascript
// ❌ Wrong
const BASE = 'http://localhost:3000';

// ✅ Correct
const BASE = 'http://localhost:3000/api';
```

### 2. Wrong Field Names
```javascript
// Interactions
❌ { summary: '...' }
✅ { content: '...' }

// Persona Notes
❌ { content: '...' }
✅ { body_text: '...' }

// Events
❌ { event: '...' }
✅ { event_type: '...' }
```

### 3. Wrong Response Keys
```javascript
// List endpoints
❌ json.interactions
✅ json.items

// Persona notes
❌ json.notes
✅ json.items
```

---

## 🔑 Required Fields

### Create Contact
```javascript
{
  display_name: "string",  // Required
  emails: ["string"],      // Optional
  phones: ["string"],      // Optional
  tags: ["string"]         // Optional
}
```

### Create Interaction
```javascript
{
  contact_id: "uuid",      // Required
  kind: "email|note|call", // Required
  content: "string",       // Required
  occurred_at: "ISO8601"   // Optional
}
```

### Create Persona Note
```javascript
{
  type: "text|voice|screenshot",  // Required
  title: "string",                // Required
  body_text: "string",            // Required
  tags: ["string"]                // Optional
}
```

### Track Event
```javascript
{
  event_type: "string",  // Required
  metadata: {}           // Optional
}
```

---

## 🔍 Debugging Tips

### Check Response Format
```javascript
console.log('Response keys:', Object.keys(json));
console.log('Full response:', JSON.stringify(json, null, 2));
```

### Verify URL
```javascript
console.log('Calling:', `${BASE}${path}`);
```

### Check Auth Token
```javascript
const token = await getAccessToken();
console.log('Token:', token.substring(0, 20) + '...');
```

---

## 📊 Test Status Reference

| Test | Status | Performance (Local/Deployed) |
|------|--------|------------------------------|
| e2e-contacts-crud | ✅ | 2.7s / 1.9s |
| e2e-interactions | ✅ | 2.9s / 1.6s |
| e2e-warmth-tracking | ✅ | 2.9s / 1.6s |
| e2e-billing | ✅ | 1.5s / 1.1s |
| e2e-user-system | ✅ | 2.6s / 2.1s |
| e2e-templates-warmth-pipelines | ✅ | 5.4s / 3.5s |
| e2e-advanced-features | ✅ | 2.9s / 1.8s |
| agent-compose-prepare-send | ✅ | 7.7s / 4.3s |
| agent-analyze-contact | ✅ | 10.2s / 9.5s |
| agent-contact-details | ✅ | 5.9s / 4.7s |
| agent-interactions-summary | ✅ | 5.9s / 4.6s |
| agent-message-goals | ✅ | 3.6s / 3.0s |
| cors-validation | ✅ | 0.0s / 0.0s |
| frontend_api_smoke | ✅ | 0.0s / 0.0s |
| backend-tracking-events | ✅ | 1.5s / 1.1s |

**Overall:** 15/15 passing (100%)

---

## 🔗 Quick Links

- [Full Test Report](./COMPREHENSIVE_TEST_REPORT.md)
- [Test Diagnosis](./test/TEST_FAILURES_DIAGNOSIS.md)
- [Investigation Complete](./test/INVESTIGATION_COMPLETE.md)
- [Test Runner](./test/run-comprehensive-comparison.mjs)

---

**Last Updated:** November 21, 2025  
**Status:** ✅ All systems operational
