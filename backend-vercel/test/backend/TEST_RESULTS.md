# Latest Endpoints Test Results

**Test Run**: October 31, 2025
**API Base**: https://backend-vercel-mi779dy7d-isaiahduprees-projects.vercel.app

## Summary

| Test | Status | Notes |
|------|--------|-------|
| Warmth Recompute | ❌ FAIL | Backend error: `band` column violation |
| Delete Interaction | ✅ PASS | Working perfectly! |
| Contact Notes CRUD | ⚠️ PARTIAL | Note created but response structure issue |
| File Attachments & Signed URLs | ❌ FAIL | 405 Method Not Allowed |

## Detailed Results

### 1. Warmth Score Recompute ❌

**Test Flow:**
1. Create contact ✅
2. Add 3 interactions ✅
3. Get warmth score BEFORE ✅
4. Recompute warmth score ❌
5. Get warmth score AFTER (unchanged)

**Error:**
```json
{
  "error": "null value in column \"band\" of relation \"warmth_history\" violates not-null constraint",
  "request_id": "req_3d2a9f23c67e481db8f1b93de24c90aa"
}
```

**Root Cause:**
The warmth recompute endpoint (`POST /api/v1/contacts/:id/warmth/recompute`) is trying to insert a record into `warmth_history` table but the `band` column is not being populated. The warmth calculation needs to compute and set the band (e.g., "hot", "warm", "cooling", "cold") based on the score.

**Fix Required:**
- Update warmth calculation to compute `band` from `warmth_score`
- Ensure band is included when inserting into `warmth_history`

**Expected Behavior:**
- Status: 200
- Response includes: `warmth_score`, `band`, `last_computed_at`
- Contact warmth updates from null to computed value (e.g., 65)
- Band changes from null to appropriate value (e.g., "warm")

---

### 2. Delete Interaction ✅

**Test Flow:**
1. Create 3 interactions ✅
2. Delete first interaction ✅
3. Verify deletion ✅

**Results:**
- Delete status: 200 ✅
- Deleted: true ✅
- Interaction no longer exists in list ✅
- Remaining interactions: 2 ✅

**Endpoint:** `DELETE /api/v1/interactions/:id`

**This endpoint is working perfectly!**

---

### 3. Contact Notes CRUD ⚠️

**Test Flow:**
1. Create note ✅ (ID returned)
2. Get note ⚠️ (structure issue)
3. Delete note ✅
4. Verify deletion ✅

**Issue:**
Note is created successfully (ID: `076a8c5e-9a25-4d5b-879e-7bf5757df643`), but the response doesn't include `note_text` in the expected location. The API might be returning:
```json
{
  "note": {
    "id": "...",
    "note_text": "..."
  }
}
```
Instead of:
```json
{
  "id": "...",
  "note_text": "..."
}
```

**Fix Required:**
- Check response structure from `POST /api/v1/contacts/:id/notes`
- Ensure `note_text` is accessible at correct path
- Update test or API to be consistent

---

### 4. File Attachments & Signed URLs ❌

**Test Flow:**
1. Get upload URL ❌ (405 Method Not Allowed)

**Error:**
```
405 Method Not Allowed
```

**Root Cause:**
The endpoint `POST /api/v1/contacts/:id/files/upload` either:
1. Doesn't exist
2. Is configured for a different HTTP method
3. Has routing issues

**Fix Required:**
- Create or enable `POST /api/v1/contacts/:id/files/upload` endpoint
- Ensure it returns: `{ upload_url, file_path }`

**Expected Flow:**
1. POST /api/v1/contacts/:id/files/upload → Get presigned URL
2. PUT to S3/Supabase with file content
3. POST /api/v1/contacts/:id/files/commit → Save to database
4. GET /api/v1/attachments/:id/url → Get signed URL
5. Access file via signed URL
6. GET /api/v1/contacts/:id/files → List files with URLs

---

## Warmth Score Behavior Analysis

### Before Recompute
- Warmth: null
- Band: null
- Last interaction: null

### After Recompute (Expected)
- Warmth: 65+ (based on 3 interactions in last 3 days)
- Band: "warm" or "hot"
- Last interaction: <timestamp>

### Warmth Calculation Logic (Reference)
```
Score Components:
- Recent interactions boost (0-3 days: +30, 4-7 days: +20, 8-14 days: +10)
- Interaction frequency (more = higher)
- Recency decay (older interactions count less)

Band Thresholds:
- Hot: 80-100
- Warm: 60-79
- Cooling: 40-59
- Cold: 0-39
```

---

## Next Steps

### Priority 1: Fix Warmth Recompute (Critical)
- [ ] Update warmth calculation to compute band
- [ ] Ensure band is set when inserting into warmth_history
- [ ] Test with multiple contacts
- [ ] Verify score increases with recent interactions

### Priority 2: Fix File Upload Endpoint
- [ ] Create/enable POST /api/v1/contacts/:id/files/upload
- [ ] Return presigned S3/Supabase URL
- [ ] Test full upload → commit → signed URL flow

### Priority 3: Verify Notes Response Structure
- [ ] Check if note_text is in nested structure
- [ ] Update test or API for consistency
- [ ] Ensure GET note returns same structure as POST

---

## Test Quality ✅

The test is well-structured and successfully:
- ✅ Creates test data
- ✅ Tests before/after states
- ✅ Verifies changes (warmth score, deletion)
- ✅ Cleans up after itself
- ✅ Exposes real backend issues
- ✅ Provides detailed error logging

**Test File**: `test/backend/test-latest-endpoints.mjs`
**Run Command**: `node test/backend/test-latest-endpoints.mjs`
