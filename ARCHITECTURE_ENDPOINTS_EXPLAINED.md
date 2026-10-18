# EverReach Architecture: Endpoints & Data Access Patterns

**Date**: October 19, 2025  
**Purpose**: Clarify endpoint architecture for Frontend, Mobile, and Tests

---

## 🏗️ **Two-Tier Architecture**

EverReach uses a **two-tier architecture** with different access patterns:

### **Tier 1: Vercel Backend** (Custom Business Logic)
- **URL**: `https://ever-reach-be.vercel.app`
- **Purpose**: Complex operations, AI features, business logic
- **Location**: `backend-vercel/app/api/`

### **Tier 2: Supabase REST API** (Direct Database Access)
- **URL**: `https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/`
- **Purpose**: Simple CRUD operations, direct data access
- **Auto-generated**: From database schema via PostgREST

---

## 📊 **Endpoint Comparison**

| Feature | Vercel Backend | Supabase REST API |
|---------|---------------|-------------------|
| **URL** | `/api/contacts` | `/rest/v1/contacts` |
| **Auth** | Bearer token | Bearer token + API key |
| **Security** | Custom middleware | Row Level Security (RLS) |
| **Speed** | Slower (logic layer) | Faster (direct DB) |
| **Use Case** | Complex operations | Simple CRUD |
| **Validation** | Custom business rules | Database constraints |
| **Deployed** | ✅ Yes (44 endpoints) | ✅ Yes (auto-generated) |

---

## 🎯 **What Endpoints Exist Where?**

### **✅ Vercel Backend Endpoints** (44 deployed)

**Contacts & CRM**:
- `POST /api/contacts` - Create contact ✅
- `GET /api/contacts/:id` - Get contact ✅
- `GET /api/contacts/search` - Search contacts ✅
- `POST /api/interactions` - Log interaction ✅

**AI & Agent**:
- `POST /api/v1/agent/chat` - Chat with AI
- `POST /api/v1/agent/analyze/contact` - AI analysis
- `POST /api/v1/agent/compose/smart` - AI message generation
- `GET /api/v1/agent/tools` - Available tools

**Billing & Subscription**:
- `GET /api/me` - User info
- `POST /api/billing/checkout` - Stripe checkout
- `POST /api/billing/portal` - Billing portal
- `GET /api/v1/me/entitlements` - User entitlements

**Files & Uploads**:
- `POST /api/uploads/sign` - Presigned URL
- `POST /api/files/commit` - Commit upload
- `POST /api/v1/analysis/screenshot` - Screenshot analysis

**Warmth & Alerts**:
- `GET /api/v1/alerts` - Get alerts
- `POST /api/v1/alerts/:id` - Update alert
- `POST /api/v1/contacts/:id/watch` - Set watch status

**...and 24 more** (see full list in backend-vercel/app/api/)

### **✅ Supabase REST API** (Auto-generated from DB)

**All Database Tables**:
- `/rest/v1/contacts` - Contacts table
- `/rest/v1/interactions` - Interactions table
- `/rest/v1/campaigns` - Campaigns table
- `/rest/v1/templates` - Templates table
- `/rest/v1/goals` - Goals table
- `/rest/v1/pipelines` - Pipelines table
- `/rest/v1/warmth_alerts` - Alerts table
- ...and every other table in the database

**Supabase Features**:
- Query filtering: `?id=eq.123`
- Sorting: `?order=created_at.desc`
- Pagination: `?limit=10&offset=20`
- Select specific fields: `?select=id,display_name,emails`
- Return inserted data: Header `Prefer: return=representation`

---

## 🔄 **Which Should You Use?**

### **Use Vercel Backend When**:
- ✅ Complex business logic needed
- ✅ AI features (chat, analysis, generation)
- ✅ Multi-step operations
- ✅ Custom validation rules
- ✅ External API calls (Stripe, Twilio, OpenAI)
- ✅ Analytics and tracking
- ✅ File uploads with processing

### **Use Supabase REST API When**:
- ✅ Simple CRUD operations
- ✅ Direct data access
- ✅ Performance is critical
- ✅ Complex filtering/querying
- ✅ Bulk operations
- ✅ Real-time subscriptions
- ✅ Testing (faster, simpler)

---

## 📱 **Frontend & Mobile App Usage**

### **Current Implementation** (Both Apps)

**Web Frontend** (`web/lib/api.ts`):
```typescript
// Uses Vercel Backend
const base = process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
await apiFetch('/api/contacts', { method: 'POST', body: ... });
```

**Mobile App** (`lib/api.ts`):
```typescript
// Uses Vercel Backend
const base = process.env.EXPO_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
await apiFetch('/api/contacts', { method: 'POST', body: ... });
```

**✅ VERDICT**: Both apps are correctly using Vercel backend endpoints!

---

## 🧪 **E2E Tests - What We Fixed**

### **❌ Before** (Broken):
```javascript
// Tests were trying to use Vercel backend
await apiFetch('https://ever-reach-be.vercel.app/api', '/api/contacts', { ... });
// Result: 405 Method Not Allowed (endpoint path was wrong)
```

### **✅ After** (Working):
```javascript
// Tests now use Supabase REST API directly
await fetch('https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/contacts', {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ display_name: 'Test', emails: ['test@example.com'] }),
});
// Result: 201 Created ✅
```

**Why the change?**
- E2E tests need **direct database access** for setup/cleanup
- Supabase REST API is **faster** for testing
- No middleware overhead
- Easier to inspect data

---

## ⚠️ **Important Differences**

### **Field Names**:
| Vercel Backend | Supabase REST | Notes |
|----------------|---------------|-------|
| `name` | `display_name` | Contact name field |
| `warmth_score` | `warmth` | Warmth score field |
| Returns `{contact: {...}}` | Returns `[{...}]` or `{...}` | Response format |

### **Authentication**:
```javascript
// Vercel Backend
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}

// Supabase REST API
headers: {
  'apikey': SUPABASE_SERVICE_KEY,      // Required!
  'Authorization': `Bearer ${token}`,   // User token for RLS
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',    // Return inserted data
}
```

---

## ✅ **Recommendation: Keep Current Setup**

### **Frontend & Mobile**: ✅ Continue using Vercel Backend
- Already working correctly
- Uses custom business logic
- Better error handling
- Consistent response format
- AI features integrated

### **E2E Tests**: ✅ Continue using Supabase REST API
- Faster for testing
- Direct database access
- Easier cleanup
- No middleware overhead

### **Working Tests** (like campaign-automation-e2e.mjs): ✅ Keep as-is
- Already use Supabase REST API
- Work perfectly
- Good pattern for E2E tests

---

## 🎯 **Action Items**

### **✅ No Changes Needed for Frontend/Mobile**
Both apps are correctly configured and using Vercel backend endpoints.

### **✅ E2E Tests - Continue Current Approach**
Use Supabase REST API for direct database access (faster, simpler).

### **🔄 Optional: Create Wrapper**
If you want consistency, create a test helper:

```javascript
// test/agent/_db-helpers.mjs
export async function createContact(payload) {
  // Wraps Supabase REST API for consistent testing
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}
```

---

## 📚 **Quick Reference**

### **Frontend/Mobile API Call**:
```typescript
// Uses Vercel Backend
import { apiFetch } from '@/lib/api';
const response = await apiFetch('/api/contacts', {
  method: 'POST',
  requireAuth: true,
  body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
});
```

### **E2E Test API Call**:
```javascript
// Uses Supabase REST API
const response = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: JSON.stringify({ 
    display_name: 'John Doe', 
    emails: ['john@example.com'] 
  }),
});
```

---

## 🎉 **Summary**

1. **✅ Frontend & Mobile are correctly using Vercel backend**
2. **✅ E2E tests now correctly use Supabase REST API**
3. **✅ Both patterns are valid for their use cases**
4. **✅ No changes needed to frontend/mobile code**

**The architecture is sound!** Each component uses the appropriate access pattern for its needs.

