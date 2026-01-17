# Backend CORS Errors - Multiple Endpoints Blocked

## 🐛 The Errors

### Error 1: `/api/v1/compose` - Missing Header Permission
```
POST https://ever-reach-be.vercel.app/api/v1/compose net::ERR_FAILED

Access to fetch at 'https://ever-reach-be.vercel.app/api/v1/compose' 
from origin 'http://localhost:8081' has been blocked by CORS policy: 
Request header field idempotency-key is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

### Error 2: `/api/telemetry/performance` - Missing CORS Entirely
```
POST https://ever-reach-be.vercel.app/api/telemetry/performance net::ERR_FAILED

Access to fetch at 'https://ever-reach-be.vercel.app/api/telemetry/performance' 
from origin 'http://localhost:8081' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🚨 SYSTEMIC ISSUE

Your backend has **inconsistent CORS configuration** across endpoints:
- Some endpoints have partial CORS (but missing headers)
- Some endpoints have NO CORS at all
- This affects: compose, telemetry, and potentially others

### Affected Endpoints (Known):
```
❌ /api/v1/compose             - Missing idempotency-key header
❌ /api/telemetry/performance  - Missing CORS entirely
⚠️  Other endpoints?           - Likely more affected
```

### Impact:
- ❌ Cannot send messages (compose blocked)
- ❌ Cannot report analytics (telemetry blocked)
- ❌ User experience degraded
- ⚠️  More features likely broken

---

## 📋 What's Happening

### The Flow:
1. Frontend sends POST to `/api/v1/compose` ✅
2. Frontend includes `idempotency-key` header ✅
3. Browser sends CORS preflight (OPTIONS request) ✅
4. Backend CORS config REJECTS `idempotency-key` ❌
5. Browser blocks the actual POST request ❌

### Why This Happens:
CORS is a security feature. When making cross-origin requests with custom headers, the browser:
1. First sends an OPTIONS request (preflight)
2. Asks: "Is `idempotency-key` allowed?"
3. Backend says: "No, only these headers are allowed: [...]"
4. Browser blocks the request

---

## 🔧 THE FIX - GLOBAL MIDDLEWARE REQUIRED

Since **multiple endpoints** are affected, you MUST use **global middleware** to fix CORS for all routes at once.

**DO NOT** fix routes individually - that's why you have inconsistent config!

### Backend: Create/Update Global CORS Middleware

Find or create: `/backend-vercel/middleware.ts`

**❌ Current (Missing/Incomplete):**
```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization'  // ❌ Missing idempotency-key!
  );
  
  return response;
}
```

**✅ Fixed (With idempotency-key):**
```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, idempotency-key'  // ✅ Added!
  );
  
  return response;
}
```

---

## 📍 Where to Apply the Fix

### Option 1: Global Middleware (Recommended)

**File:** `/backend-vercel/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, idempotency-key',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      },
    });
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, idempotency-key');
  
  return response;
}

// Apply to API routes
export const config = {
  matcher: '/api/:path*',
};
```

---

### Option 2: Per-Route Handler

**File:** `/backend-vercel/app/api/v1/compose/route.ts`

```typescript
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, idempotency-key',
    },
  });
}

export async function POST(req: Request) {
  // Your existing code...
  
  return Response.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, idempotency-key',
    },
  });
}
```

---

## 🧪 Testing the Fix

### Step 1: Deploy Backend
```bash
cd backend-vercel
vercel --prod
```

### Step 2: Test with cURL
```bash
# Test OPTIONS preflight
curl -X OPTIONS \
  https://ever-reach-be.vercel.app/api/v1/compose \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: idempotency-key" \
  -v

# Look for this in response:
# Access-Control-Allow-Headers: Content-Type, Authorization, idempotency-key ✅
```

### Step 3: Test in Frontend
1. Refresh your app
2. Try to send a message
3. Should now work! ✅

---

## 📊 What Each CORS Header Does

### `Access-Control-Allow-Origin`
```
* = Allow requests from any origin
http://localhost:8081 = Only allow from this origin
```

### `Access-Control-Allow-Methods`
```
GET, POST, PUT, DELETE, OPTIONS = Allowed HTTP methods
```

### `Access-Control-Allow-Headers`
```
Content-Type = For JSON payloads
Authorization = For auth tokens
idempotency-key = For duplicate request prevention ← YOU NEED THIS!
```

### `Access-Control-Max-Age`
```
86400 = Cache preflight for 24 hours (reduces OPTIONS requests)
```

---

## 🔍 Why Idempotency Key?

The `idempotency-key` header prevents duplicate message sends:

```typescript
// Frontend sends:
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer xxx',
  'idempotency-key': 'req_abc123',  // Unique per request
}

// Backend checks:
if (alreadyProcessed(idempotencyKey)) {
  return cachedResponse;  // Don't send duplicate message
}
```

**Use case:** User clicks "Send" twice → Only one message sent ✅

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Case Sensitivity
```typescript
// Wrong
'Access-Control-Allow-Headers': 'Idempotency-Key'  // ❌ Capital K

// Right
'Access-Control-Allow-Headers': 'idempotency-key'  // ✅ Lowercase
```

### ❌ Mistake 2: Missing OPTIONS Handler
```typescript
// Backend needs to handle OPTIONS!
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: {...} });
}
```

### ❌ Mistake 3: Forgetting to Redeploy
```bash
# After fixing CORS, you MUST redeploy!
vercel --prod
```

---

## 📋 Complete CORS Headers Checklist

For your backend, allow these headers:

- [ ] ✅ `Content-Type` (for JSON)
- [ ] ✅ `Authorization` (for auth tokens)
- [ ] ✅ `idempotency-key` (for duplicate prevention)
- [ ] ✅ `X-Request-ID` (optional, for tracing)

**Full list:**
```typescript
'Access-Control-Allow-Headers': 
  'Content-Type, Authorization, idempotency-key, X-Request-ID'
```

---

## 🔧 Quick Fix Summary

### 1. Find Your CORS Config
```bash
# Check these files:
backend-vercel/middleware.ts
backend-vercel/app/api/v1/compose/route.ts
backend-vercel/lib/cors.ts
```

### 2. Add `idempotency-key` to Allowed Headers
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization, idempotency-key'
```

### 3. Handle OPTIONS Preflight
```typescript
if (request.method === 'OPTIONS') {
  return new NextResponse(null, { status: 200, headers: {...} });
}
```

### 4. Redeploy
```bash
vercel --prod
```

### 5. Test
```bash
curl -X OPTIONS https://ever-reach-be.vercel.app/api/v1/compose \
  -H "Access-Control-Request-Headers: idempotency-key" -v
```

---

## 📖 Related Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Next.js: API Routes CORS](https://nextjs.org/docs/api-routes/api-middlewares)
- [Vercel: CORS Configuration](https://vercel.com/guides/how-to-enable-cors)

---

## 🐛 Other Errors in Your Logs

### React Native: "Unexpected text node"
```
Unexpected text node: . A text node cannot be a child of a <View>.
```

**Cause:** You have text directly inside a `<View>` without wrapping it in `<Text>`.

**Fix:** Find and wrap loose text:
```tsx
// ❌ Wrong
<View>
  Some text here
</View>

// ✅ Right
<View>
  <Text>Some text here</Text>
</View>
```

---

**Last Updated:** November 2, 2025  
**Status:** ❌ Backend CORS needs update  
**Priority:** High - Blocks message composition  
**Next Step:** Update backend CORS to allow `idempotency-key` header
