# Error Prevention: Immediate Action Plan

**Created**: Oct 17, 2025 9:30 PM  
**Priority**: 🔴 CRITICAL  
**Target Completion**: Oct 18, 2025

---

## 🎯 Quick Summary

**Found**: 50+ unsafe API calls that could cause `.map()` / `.filter()` errors  
**Strategy**: Replace all `response.json() as Promise<T[]>` with safe helpers  
**Estimated Time**: 2-3 hours  
**Risk if Not Fixed**: Dashboard crashes, data loss perception, user frustration

---

## 📋 Specific Files to Fix (Priority Order)

### 🔴 CRITICAL - Array-Returning Hooks (Must fix ASAP)

#### 1. `web/lib/hooks/useAlerts.ts`
**Lines**: Need to check  
**Issue**: Returns alerts array, likely uses unsafe `response.json()`  
**Fix**: Use `getJsonArray<Alert>()`  
**Impact**: Alerts page crashes on error response

#### 2. `web/lib/hooks/useTemplates.ts`
**Lines**: 51, 79, 105  
**Current**:
```typescript
return response.json() as Promise<MessageTemplate[]>
```
**Fix**: Replace with:
```typescript
return getJsonArray<MessageTemplate>('/api/v1/templates', { requireAuth: true })
```
**Impact**: Templates list crashes

#### 3. `web/lib/hooks/useGoals.ts`
**Lines**: 42, 95, 121  
**Current**: Uses unsafe casting  
**Fix**: Use `getJsonArray<Goal>()` for list endpoint  
**Impact**: Goals dashboard crashes

#### 4. `web/lib/hooks/usePipelines.ts`
**Lines**: 41, 89, 115, 141  
**Current**: Multiple unsafe casts  
**Fix**: Use `getJsonArray<Pipeline>()` for list endpoints  
**Impact**: Kanban board crashes

#### 5. `web/lib/hooks/useFiles.ts`
**Lines**: 65, 123  
**Current**: File list uses unsafe casting  
**Fix**: Use `getJsonArray<UploadedFile>()`  
**Impact**: File browser crashes

#### 6. `web/lib/hooks/useVoiceNotes.ts`
**Lines**: 55  
**Current**: Voice notes list unsafe  
**Fix**: Use `getJsonArray<VoiceNote>()`  
**Impact**: Voice notes page crashes

#### 7. `web/lib/hooks/useTeam.ts`
**Lines**: 68, 94  
**Current**: Team members/invites unsafe  
**Fix**: Use `getJsonArray<TeamMember>()` and `getJsonArray<TeamInvite>()`  
**Impact**: Team page crashes

#### 8. `web/lib/hooks/useAutomation.ts`
**Lines**: Need to check  
**Current**: Likely returns automation rules array  
**Fix**: Use `getJsonArray<AutomationRule>()`  
**Impact**: Automation page crashes

#### 9. `web/lib/hooks/useBulkOperations.ts`
**Lines**: Need to check  
**Current**: Bulk operation results might be arrays  
**Fix**: Check and use `getJsonArray()` where appropriate  
**Impact**: Bulk actions fail silently

#### 10. `web/lib/hooks/useGlobalSearch.ts`
**Lines**: 46  
**Current**: Search results use unsafe casting  
**Fix**: Use `getJsonArray()` for results arrays  
**Impact**: Search crashes

---

### 🟡 MEDIUM - Single-Object Hooks (Lower risk but should fix)

These return single objects, less likely to crash but should use `getJson<T>()`:

1. `useWarmthSummary.ts` (line 29) - Returns single object
2. `useContextBundle.ts` (line 100) - Returns single object
3. `useSettings.ts` (lines 40, 64, 87) - Returns profile/preferences
4. `useContactAnalysis.ts` - Need to check

---

## 🔧 Implementation Strategy

### Step 1: Batch Fix All Array-Returning Hooks (1.5 hours)

**Script to run**:
```bash
cd web/lib/hooks

# For each file, replace pattern:
# OLD: response.json() as Promise<T[]>
# NEW: getJsonArray<T>('/api/path', { requireAuth: true })
```

**Files to modify** (in order):
1. ✅ `useCustomFields.ts` - DONE
2. ✅ `useContacts.ts` - DONE
3. ✅ `useInteractions.ts` - DONE
4. `useAlerts.ts`
5. `useTemplates.ts`
6. `useGoals.ts`
7. `usePipelines.ts`
8. `useFiles.ts`
9. `useVoiceNotes.ts`
10. `useTeam.ts`
11. `useAutomation.ts`
12. `useBulkOperations.ts`
13. `useGlobalSearch.ts`
14. `useAgentChat.ts`
15. `useFilters.ts`

### Step 2: Add `retry: 1` to All Hooks (30 minutes)

**Pattern**:
```typescript
return useQuery({
  queryKey: ['items'],
  queryFn: () => getJsonArray<Item>('/api/v1/items', { requireAuth: true }),
  retry: 1, // ← Add this line
})
```

### Step 3: Test Each Widget (30 minutes)

**Manual smoke tests**:
1. Dashboard - All widgets load
2. Contacts page - List renders
3. Interactions timeline - Timeline renders
4. Custom fields - Fields list shows
5. Templates - Templates list shows
6. Goals - Goals list shows
7. Pipelines - Kanban renders
8. Voice notes - Notes list shows
9. Team - Members list shows
10. Alerts - Alerts list shows

### Step 4: Add Error Boundaries (30 minutes)

**Create**:
```typescript
// web/components/ErrorBoundary.tsx
export function WidgetErrorBoundary({ children, widgetName }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 rounded">
          <p className="text-sm text-red-600">
            Failed to load {widgetName}. <button>Retry</button>
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

**Wrap all dashboard widgets**:
```typescript
<WidgetErrorBoundary widgetName="Custom Fields">
  <CustomFieldsSummary />
</WidgetErrorBoundary>
```

---

## 📊 Backend Audit - Graceful Degradation

### Endpoints to Fix (Priority)

#### 🔴 HIGH PRIORITY (Likely to return 500 on missing data)

1. **`/api/v1/alerts/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no alerts table
   
2. **`/api/v1/goals/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no goals found

3. **`/api/v1/templates/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no templates

4. **`/api/v1/pipelines/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no pipelines

5. **`/api/v1/automation/rules/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if table missing

6. **`/api/v1/segments/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no segments

7. **`/api/v1/files/route.ts`**
   - [ ] Check contact_id validation
   - [ ] Return `[]` if no files

8. **`/api/v1/voice-notes/route.ts`**
   - [ ] Check contact_id validation
   - [ ] Return `[]` if no notes

9. **`/api/v1/team/members/route.ts`**
   - [ ] Check org_id handling
   - [ ] Return `[]` if no team

10. **`/api/v1/webhooks/route.ts`**
    - [ ] Check org_id handling
    - [ ] Return `[]` if no webhooks

---

## 🎯 Success Criteria

### Before (Current State)
```
❌ TypeError: e.map is not a function (10+ potential crash points)
❌ Backend 500 errors cascade to frontend crashes
❌ No retry logic for transient failures
❌ No error boundaries - crashes break entire page
```

### After (Target State)
```
✅ All hooks use safe getJsonArray() helper
✅ Backend returns [] instead of 500 for missing data
✅ All hooks retry once on failure
✅ Error boundaries prevent page-wide crashes
✅ Dashboard shows empty states instead of crashing
```

---

## 🚀 Execution Timeline

### Tonight (Oct 17, 9:30 PM - 11:30 PM)
- [x] Create tracking documents
- [ ] Fix 5 highest-priority hooks
- [ ] Deploy to web-scratch-2
- [ ] Smoke test dashboard

### Tomorrow Morning (Oct 18, 8:00 AM - 10:00 AM)
- [ ] Fix remaining 10 hooks
- [ ] Add retry logic to all
- [ ] Deploy to production
- [ ] Monitor for errors

### Tomorrow Afternoon (Oct 18, 2:00 PM - 4:00 PM)
- [ ] Audit 10 highest-priority backend endpoints
- [ ] Add graceful degradation
- [ ] Deploy backend fixes
- [ ] Full integration test

### Tomorrow Evening (Oct 18, 6:00 PM - 8:00 PM)
- [ ] Add error boundaries
- [ ] Add empty state fallbacks
- [ ] Final smoke test
- [ ] Mark initiative complete

---

## 📝 Code Snippets for Quick Copy-Paste

### Frontend Hook Fix Pattern
```typescript
// BEFORE (Unsafe):
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await apiFetch('/api/v1/items', { requireAuth: true });
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json() as Promise<Item[]>;
    },
  });
}

// AFTER (Safe):
import { getJsonArray } from '@/lib/api';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => getJsonArray<Item>('/api/v1/items', { requireAuth: true }),
    retry: 1,
  });
}
```

### Backend List Endpoint Fix Pattern
```typescript
// BEFORE (Returns 500):
const { data: userOrg } = await supabase
  .from('contacts')
  .select('org_id')
  .eq('created_by', user.id)
  .single();

if (!userOrg?.org_id) {
  return serverError('Organization not found', req);
}

// AFTER (Returns empty array):
const { data: userOrg } = await supabase
  .from('contacts')
  .select('org_id')
  .eq('created_by', user.id)
  .maybeSingle();

if (!userOrg?.org_id) {
  return ok({ success: true, data: [], count: 0 }, req);
}

// Also handle missing tables:
const { data, error } = await supabase
  .from('items')
  .select('*')
  .eq('org_id', orgId);

if (error) {
  // Table doesn't exist (code 42P01)
  if (error.code === '42P01' || error.message?.includes('does not exist')) {
    return ok({ success: true, data: [], count: 0 }, req);
  }
  return badRequest(error.message, req);
}
```

---

## 📞 Quick Reference

### Helper Functions Location
- `getJsonArray<T>()` - `web/lib/api.ts` line 79
- `getJson<T>()` - `web/lib/api.ts` line 70
- `parseJson<T>()` - `web/lib/api.ts` line 48

### CORS Helpers Location
- `ok()`, `created()`, `badRequest()`, etc. - `backend-vercel/lib/cors.ts`

### Documentation
- Main tracking: `docs/PROACTIVE_ERROR_PREVENTION.md`
- This action plan: `docs/ERROR_PREVENTION_ACTION_PLAN.md`

---

**EXECUTE THIS PLAN IMMEDIATELY TO PREVENT USER-FACING CRASHES! 🚨**
