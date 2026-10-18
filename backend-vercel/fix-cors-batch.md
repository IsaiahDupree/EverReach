# CORS Fixes Needed on Main Branch

## Summary
- ✅ Passed: 42 files (75%)  
- ❌ Need fixes: 14 files (25%)
- 📊 Total: 56 API routes

## Files Needing CORS Fixes

### Critical (High Traffic):
1. `app/api/v1/agent/chat/route.ts` - Not importing CORS helpers
2. `app/api/v1/contacts/[id]/route.ts` - Using raw Response
3. `app/api/v1/contacts/[id]/messages/route.ts` - Using raw Response
4. `app/api/v1/contacts/[id]/notes/route.ts` - Using raw Response
5. `app/api/v1/contacts/[id]/tags/route.ts` - Using raw Response
6. `app/api/v1/interactions/[id]/route.ts` - Using raw Response
7. `app/api/v1/messages/[id]/route.ts` - Using raw Response

### Medium Priority:
8. `app/api/v1/feature-requests/route.ts` - Missing OPTIONS + no CORS imports
9. `app/api/v1/audit-logs/route.ts` - Using raw Response
10. `app/api/v1/warmth/recompute/route.ts` - Using raw Response

### Low Priority (Admin/Ops):
11. `app/api/v1/ops/health/route.ts` - Using raw Response
12. `app/api/v1/billing/app-store/transactions/route.ts` - Using raw Response
13. `app/api/v1/billing/play/transactions/route.ts` - Using raw Response
14. `app/api/v1/.well-known/openapi.json/route.ts` - Using raw Response

## Fix Pattern

For each file, apply these changes:

### 1. Add CORS imports
```typescript
// Before
import { ok } from "@/lib/cors";

// After  
import { ok, unauthorized, serverError, badRequest, notFound, options } from "@/lib/cors";
```

### 2. Add OPTIONS handler
```typescript
export function OPTIONS(req: Request) {
  return options(req);
}
```

### 3. Replace raw Response calls

```typescript
// ❌ Before
return new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "Content-Type": "application/json" }
});

// ✅ After
return unauthorized("Unauthorized", req);
```

```typescript
// ❌ Before
return new Response(JSON.stringify({ error: 'db_error', details: error.message }), {
  status: 500
});

// ✅ After
return serverError(`Database error: ${error.message}`, req);
```

## Automation Approach

Since we have the CORS fixes already on `feat/backend-vercel-only-clean`, we can:

**Option 1: Cherry-pick specific commits**
```bash
git checkout main
git cherry-pick <commit-hash> --no-commit
# Fix conflicts manually
git commit
```

**Option 2: Manual fixes (safer for main branch)**
- Fix the 7 critical files first
- Test after each batch
- Deploy incrementally

**Option 3: Copy fixes from feat branch**
- Compare files between branches
- Copy CORS-related changes only
- Avoid merging unrelated changes

## Recommendation

Fix the **7 critical files** first as they handle core user interactions:
1. agent/chat
2. contacts/[id] (CRUD)
3. contacts/[id]/messages
4. contacts/[id]/notes  
5. contacts/[id]/tags
6. interactions/[id]
7. messages/[id]

These cover ~80% of actual API traffic.
