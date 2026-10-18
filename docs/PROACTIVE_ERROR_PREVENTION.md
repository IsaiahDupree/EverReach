# Proactive Error Prevention & Resilience Strategy

**Created**: Oct 17, 2025  
**Owner**: Development Team  
**Status**: 🟡 In Progress  
**Goal**: Eliminate runtime TypeErrors and 500 cascades across frontend/backend

---

## 🎯 Mission

Systematically identify and fix all potential runtime errors before they impact users, with focus on:
1. **Array method errors** (`.map`, `.filter`, `.reduce` on non-arrays)
2. **Null/undefined access** (`Cannot read property 'x' of undefined`)
3. **Backend 500 cascades** (errors that propagate to frontend as crashes)
4. **Type mismatches** (expecting object but getting array, etc.)

---

## 📊 Current Error Analysis

### Recent Production Errors (Oct 17, 2025)

#### Error #1: Custom Fields 500 → Frontend Crash
```
GET https://ever-reach-be.vercel.app/api/v1/custom-fields?entity=contact 500
TypeError: e.map is not a function
```

**Root Cause Chain**:
1. Backend: Missing `org_id` → 500 Internal Server Error
2. Backend: Missing `custom_field_defs` table → 500 Internal Server Error  
3. Frontend: API returns error object instead of array → `.map()` crashes
4. Frontend: Component crashes → React Error Boundary → Dashboard broken

**Impact**: 🔴 Critical - Dashboard unusable, custom fields inaccessible

**Status**: ✅ **FIXED** (Oct 17, 2025)
- Backend: Graceful org_id fallback
- Backend: Empty array on missing table
- Frontend: `getJsonArray<T>()` helper ensures arrays
- Frontend: `retry: 1` for transient failures

---

## 🔬 Systematic Analysis Plan

### Phase 1: Frontend Array Safety ✅ COMPLETE
**Goal**: Ensure all array-expecting code handles non-array responses

#### Completed:
- ✅ Added `parseJson<T>()` helper to unwrap API responses
- ✅ Added `getJson<T>()` for typed single objects
- ✅ Added `getJsonArray<T>()` that **always returns an array**
- ✅ Updated `useCustomFieldDefs()` to use `getJsonArray`
- ✅ Updated `useContacts()` to use `getJsonArray`
- ✅ Updated `useInteractions()` to use `getJsonArray`
- ✅ Added `retry: 1` to all hooks for transient error resilience

**Files Modified** (4):
- `web/lib/api.ts` - New helpers
- `web/lib/hooks/useCustomFields.ts`
- `web/lib/hooks/useContacts.ts`
- `web/lib/hooks/useInteractions.ts`

#### Remaining Hooks to Audit (15):
- [ ] `useAlerts.ts` - Likely returns arrays
- [ ] `useGoals.ts` - Likely returns arrays
- [ ] `useTemplates.ts` - Likely returns arrays
- [ ] `usePipelines.ts` - Likely returns arrays
- [ ] `useAutomation.ts` - Likely returns arrays
- [ ] `useFiles.ts` - Likely returns arrays
- [ ] `useVoiceNotes.ts` - Likely returns arrays
- [ ] `useTeam.ts` - Likely returns arrays
- [ ] `useAdmin.ts` - Mixed
- [ ] `useBulkOperations.ts` - Mixed
- [ ] `useFilters.ts` - Mixed
- [ ] `useGlobalSearch.ts` - Returns arrays
- [ ] `useAgentChat.ts` - Returns arrays (conversations)
- [ ] `useContextBundle.ts` - Returns object (safe)
- [ ] `useWarmthSummary.ts` - Returns object (safe)

---

### Phase 2: Backend Graceful Degradation ⏳ IN PROGRESS
**Goal**: All list endpoints return empty arrays on missing data, not 500s

#### Endpoints to Audit (20):

##### ✅ Already Fixed:
1. ✅ `GET /v1/custom-fields` - Returns `[]` on missing org/table

##### 🔍 Need Review:
2. [ ] `GET /v1/contacts` - Check org_id handling
3. [ ] `GET /v1/interactions` - Check contact_id validation
4. [ ] `GET /v1/alerts` - Check user validation
5. [ ] `GET /v1/goals` - Check org validation
6. [ ] `GET /v1/templates` - Check org validation
7. [ ] `GET /v1/pipelines` - Check org validation
8. [ ] `GET /v1/automation/rules` - Check org validation
9. [ ] `GET /v1/segments` - Check org validation
10. [ ] `GET /v1/files` - Check contact_id validation
11. [ ] `GET /v1/voice-notes` - Check contact_id validation
12. [ ] `GET /v1/team/members` - Check org validation
13. [ ] `GET /v1/webhooks` - Check org validation
14. [ ] `GET /v1/api-keys` - Check org validation
15. [ ] `GET /v1/feature-requests` - Check org validation
16. [ ] `GET /v1/feature-buckets` - Public, should be safe
17. [ ] `GET /v1/changelog` - Public, should be safe
18. [ ] `GET /v1/agent/conversations` - Check user validation
19. [ ] `GET /v1/warmth/summary` - Check org validation
20. [ ] `GET /v1/push-tokens` - Check user validation

##### Pattern to Implement:
```typescript
// Before: Throws 500 on missing org
const { data: userOrg } = await supabase
  .from('contacts')
  .select('org_id')
  .eq('created_by', user.id)
  .single();
if (!userOrg?.org_id) {
  return serverError('Organization not found');
}

// After: Return empty array gracefully
const { data: userOrg } = await supabase
  .from('contacts')
  .select('org_id')
  .eq('created_by', user.id)
  .maybeSingle();

if (!userOrg?.org_id) {
  return ok({ success: true, data: [], count: 0 }, req);
}
```

---

### Phase 3: Null/Undefined Safety 📋 PLANNED
**Goal**: Prevent "Cannot read property" errors

#### Common Patterns to Fix:
1. **Optional chaining** everywhere: `contact?.emails?.length`
2. **Nullish coalescing**: `contact.tags ?? []`
3. **Array guards before map**: `(items || []).map(...)`
4. **Default parameters**: `function(data = [])`

#### Files to Audit:
- [ ] All `web/components/**/*.tsx` files
- [ ] All `web/app/**/*.tsx` page files
- [ ] Focus on data rendering sections

---

### Phase 4: Type Safety Hardening 📋 PLANNED
**Goal**: Catch type mismatches at compile time

#### Actions:
1. [ ] Enable `strict: true` in `tsconfig.json`
2. [ ] Enable `strictNullChecks: true`
3. [ ] Fix all resulting errors
4. [ ] Add Zod schemas for API responses
5. [ ] Runtime validation of API responses

---

### Phase 5: Error Boundaries & Fallbacks 📋 PLANNED
**Goal**: Graceful degradation when errors do occur

#### Components to Add:
1. [ ] `ErrorBoundary` wrapper for dashboard widgets
2. [ ] `ErrorBoundary` for each page route
3. [ ] Fallback UI components (empty states, retry buttons)
4. [ ] Global error toast/notification system
5. [ ] Error reporting to monitoring (Sentry/LogRocket)

---

## 🎯 Progress Tracking

### Sprint 1: Frontend Array Safety (Oct 17, 2025)
**Status**: ✅ **COMPLETE**  
**Duration**: 1 hour  
**Files Changed**: 4  
**Tests Passing**: Pending verification  
**Deployed**: Pending (web-scratch-2 branch)

### Sprint 2: Remaining Frontend Hooks (Planned)
**Target**: Oct 18, 2025  
**Estimated Duration**: 2-3 hours  
**Files to Change**: ~15 hooks  
**Priority**: High

### Sprint 3: Backend List Endpoints (Planned)
**Target**: Oct 18-19, 2025  
**Estimated Duration**: 3-4 hours  
**Files to Change**: ~20 route files  
**Priority**: High

### Sprint 4: Null Safety Sweep (Planned)
**Target**: Oct 19-20, 2025  
**Estimated Duration**: 4-5 hours  
**Files to Change**: ~100 component files  
**Priority**: Medium

### Sprint 5: Type Safety & Validation (Planned)
**Target**: Oct 20-21, 2025  
**Estimated Duration**: 6-8 hours  
**Files to Change**: All TypeScript files  
**Priority**: Medium

### Sprint 6: Error Boundaries (Planned)
**Target**: Oct 21-22, 2025  
**Estimated Duration**: 3-4 hours  
**New Components**: 5-10  
**Priority**: Medium

---

## 📈 Metrics & Success Criteria

### Current Baseline (Oct 17, 2025)
- 🔴 **Frontend Crashes**: 1 known (custom fields)
- 🔴 **Backend 500s**: 1 known (custom fields)
- 🟡 **Hooks with Array Safety**: 3 / 18 (17%)
- 🟡 **Endpoints with Graceful Degradation**: 1 / 20 (5%)
- ⚪ **TypeScript Strict Mode**: Disabled
- ⚪ **Error Boundaries**: 0 implemented

### Target State (Oct 22, 2025)
- 🟢 **Frontend Crashes**: 0
- 🟢 **Backend 500s**: 0 for missing data scenarios
- 🟢 **Hooks with Array Safety**: 18 / 18 (100%)
- 🟢 **Endpoints with Graceful Degradation**: 20 / 20 (100%)
- 🟢 **TypeScript Strict Mode**: Enabled
- 🟢 **Error Boundaries**: 10+ strategic locations

### Success Indicators:
- ✅ No console errors on dashboard load
- ✅ No crashes on missing backend data
- ✅ All widgets show graceful empty states
- ✅ Backend returns 200 with `data: []` instead of 500
- ✅ TypeScript compilation with 0 errors
- ✅ E2E tests pass with network failures simulated

---

## 🛠️ Implementation Checklist

### Immediate Actions (Today)
- [x] Create this tracking document
- [x] Document Phase 1 completion (array safety helpers)
- [ ] Deploy Phase 1 fixes to production
- [ ] Verify custom fields endpoint returns empty array
- [ ] Verify dashboard renders with no console errors

### Next Steps (This Week)
- [ ] Complete Phase 2: Audit & fix remaining 15 hooks
- [ ] Complete Phase 3: Audit & fix 20 backend endpoints
- [ ] Add Zod schemas for top 5 most-used API responses
- [ ] Implement ErrorBoundary on dashboard page

### Long-term (Next Sprint)
- [ ] Enable TypeScript strict mode
- [ ] Add runtime validation with Zod
- [ ] Implement comprehensive error boundaries
- [ ] Add error monitoring (Sentry)
- [ ] Create playbook for future error patterns

---

## 📚 Best Practices Established

### Frontend Data Fetching
```typescript
// ✅ DO: Use getJsonArray for list endpoints
import { getJsonArray } from '@/lib/api';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => getJsonArray<Item>('/api/v1/items', { requireAuth: true }),
    retry: 1, // Retry once for transient failures
  });
}

// ❌ DON'T: Assume API returns array
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/items');
      return res.json(); // Could be error object!
    },
  });
}
```

### Backend List Endpoints
```typescript
// ✅ DO: Return empty array on missing data
if (!orgId) {
  return ok({ success: true, data: [], count: 0 }, req);
}

if (error?.code === '42P01') {
  // Table doesn't exist yet
  return ok({ success: true, data: [], count: 0 }, req);
}

// ❌ DON'T: Throw 500 on expected missing data
if (!orgId) {
  return serverError('Organization not found', req);
}
```

### Component Data Rendering
```typescript
// ✅ DO: Guard all array operations
const items = data?.items ?? [];
items.map(item => <ItemCard key={item.id} {...item} />)

// ✅ DO: Show empty state
{items.length === 0 ? (
  <EmptyState message="No items yet" />
) : (
  items.map(...)
)}

// ❌ DON'T: Assume data exists
data.items.map(...) // Crashes if data is undefined
```

---

## 🔍 Debugging Tools

### Frontend Error Detection
```bash
# Check for unsafe array operations
cd web
grep -r "\.map(" --include="*.tsx" --include="*.ts" | grep -v "Array.isArray"

# Check for unsafe property access
grep -r "\.\w\+\." --include="*.tsx" | grep -v "?."
```

### Backend Error Detection
```bash
# Check for missing CORS
cd backend-vercel
grep -r "Response.json" --include="*.ts" | grep -v "ok("

# Check for unsafe Supabase queries
grep -r "\.single()" --include="*.ts"
```

---

## 📞 Escalation

### When to Escalate:
- 🔴 New production error pattern discovered
- 🔴 Error impacts > 10% of users
- 🔴 Data loss or corruption possible
- 🟡 Fix requires breaking API changes
- 🟡 Fix requires database migration

### Escalation Path:
1. Document error in this file
2. Create GitHub issue with `bug` + `critical` labels
3. Notify team in Slack #backend-alerts
4. If production: Deploy hotfix branch immediately
5. Add regression test to prevent recurrence

---

## 📝 Changelog

### Oct 17, 2025
- ✅ Created proactive error prevention tracking document
- ✅ Completed Phase 1: Frontend array safety (4 files)
- ✅ Fixed custom-fields 500 error (backend)
- ✅ Fixed custom-fields `.map()` crash (frontend)
- ✅ Deployed `feat/backend-vercel-only-clean` to production
- 📋 Documented 15 remaining hooks to audit
- 📋 Documented 20 backend endpoints to audit

### Next Update: Oct 18, 2025 (Planned)
- [ ] Deploy Phase 1 frontend fixes
- [ ] Audit 15 remaining hooks
- [ ] Begin backend endpoint audit

---

**Last Updated**: Oct 17, 2025 9:30 PM  
**Next Review**: Oct 18, 2025  
**Assignee**: Development Team
