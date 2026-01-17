# Import Flow - Consolidated to One Page

Complete documentation for the consolidated import flow that keeps everything on `/import-third-party`.

---

## ✅ What Changed

### Before (Multiple Pages):
```
1. User at: /import-third-party
2. Click "Import from Google"
3. Go through Google OAuth
4. Redirect to: /settings/imports/e1e587ca...
5. Shows progress on different page
6. Click "Go to Import Contacts" to return
```

###  After (Single Page):
```
1. User at: /import-third-party
2. Click "Import from Google"
3. Go through Google OAuth
4. Redirect back to: /import-third-party?job_id=e1e587ca...
5. Shows progress on SAME page
6. Stays on /import-third-party ✅
```

---

## 🎯 Complete Flow

### Step 1: Start Import
**Page:** `/import-third-party`

```
User clicks "Import from Google"
  ↓
Frontend calls: POST /api/v1/contacts/import/google/start
  ↓
Backend returns: { job_id, authorization_url }
  ↓
Frontend opens: authorization_url (Google OAuth)
  ↓
Page shows: "Importing google contacts... Waiting for authorization..."
```

### Step 2: OAuth
**Page:** Google OAuth (external)

```
User logs in to Google
  ↓
User grants permissions
  ↓
Google redirects to backend: /api/v1/contacts/import/google/callback?code=...
```

### Step 3: Backend Processing
**Backend:** Handles OAuth callback

```
Backend exchanges code for access token
  ↓
Backend starts fetching contacts from Google
  ↓
Backend updates job status: authenticating → fetching → processing
  ↓
Backend redirects browser to: http://localhost:8081/import-third-party?job_id={job_id}
```

### Step 4: Return to App
**Page:** `/import-third-party?job_id=...`

```
Page detects job_id parameter
  ↓
Starts polling: GET /api/v1/contacts/import/status/{job_id} (every 2 seconds)
  ↓
Shows progress: "Processing 45/120 contacts..."
  ↓
Job completes
  ↓
Shows alert: "Import Complete! Successfully imported 105 contacts (15 skipped)"
  ↓
Stays on same page ✅
```

---

## 📁 Files Changed

### 1. `/app/import-third-party.tsx` ✅
**Changes:**
- Added `useLocalSearchParams` to detect `job_id` in URL
- Added `useEffect` to check for `job_id` on mount
- Automatically starts polling when `job_id` is present
- Shows progress UI while importing

**Key Code:**
```typescript
const params = useLocalSearchParams<{ job_id?: string }>();

useEffect(() => {
  if (params.job_id) {
    console.log('[ImportThirdParty] OAuth redirect detected, job_id:', params.job_id);
    setImporting(true);
    checkImportStatus(params.job_id);
  }
}, []);
```

### 2. `/app/settings/imports/[id].tsx` ✅
**Changes:**
- Now just redirects to `/import-third-party?job_id={id}`
- Shows loading spinner while redirecting
- Keeps old implementation commented out for reference

**Key Code:**
```typescript
useEffect(() => {
  if (id) {
    router.replace(`/import-third-party?job_id=${id}` as any);
  }
}, [id]);
```

---

## 🔄 Polling Logic

### When Polling Starts:
1. ✅ User clicks "Import from Google/Microsoft"
2. ✅ OAuth redirect returns with `job_id` parameter
3. ✅ Deep link callback (mobile)

### Polling Behavior:
```typescript
// Polls every 2 seconds while job is active
useEffect(() => {
  if (currentJob && ['fetching', 'processing'].includes(currentJob.status)) {
    const interval = setInterval(() => {
      checkImportStatus(currentJob.id);
    }, 2000);
    
    return () => clearInterval(interval);
  }
}, [currentJob]);
```

### Status Updates:
- **authenticating** - Waiting for OAuth
- **fetching** - Getting contacts from provider
- **processing** - Importing into EverReach (shows progress %)
- **completed** - Done! Shows success alert
- **failed** - Error occurred, shows error alert

---

## 🎨 UI States

### 1. Initial State
```
Import from Third Parties
─────────────────────────

Connect Your Accounts
Import contacts from your favorite services

[📧 Google Contacts]
[📧 Microsoft Contacts]
[☁️ iCloud Contacts] (coming soon)
[📄 CSV Upload] (coming soon)

Recent Imports
- No imports yet
```

### 2. After Clicking Import
```
Import from Third Parties
─────────────────────────

┌─────────────────────────┐
│ Importing google contacts...  │
│ ⏰ Waiting for authorization... │
└─────────────────────────┘

(User completes OAuth in browser)
```

### 3. Processing State
```
Import from Third Parties
─────────────────────────

┌─────────────────────────┐
│ Importing google contacts...  │
│ 🔄 Processing 45/120 contacts... │
└─────────────────────────┘

(Polls every 2 seconds, updates progress)
```

### 4. Completion State
```
Alert popup:
─────────────────────────
Import Complete!

Successfully imported 105 contacts
(15 skipped).

            [OK]
─────────────────────────

Page shows:
Recent Imports
- 105 contacts • Just now • Google ✓
```

---

## 🌐 Backend Configuration

The backend needs to redirect to `/import-third-party?job_id={job_id}` after OAuth.

### Development:
```
Redirect URL: http://localhost:8081/import-third-party?job_id={job_id}
```

### Production:
```
Redirect URL: https://www.everreach.app/import-third-party?job_id={job_id}
```

### Backend Code (example):
```typescript
// In /api/v1/contacts/import/{provider}/callback
async function handleOAuthCallback(req, res) {
  const { code, state } = req.query;
  const { jobId, userId } = decodeState(state);
  
  // Exchange code for token
  const tokens = await exchangeCodeForToken(code);
  
  // Update job status
  await updateJobStatus(jobId, { status: 'fetching', tokens });
  
  // Start background job to fetch contacts
  await startFetchingContacts(jobId, tokens);
  
  // Redirect back to app
  const redirectUrl = `${process.env.FRONTEND_URL}/import-third-party?job_id=${jobId}`;
  res.redirect(redirectUrl);
}
```

---

## 🧪 Testing

### Test Flow (Web):
```
1. Go to: http://localhost:8081/import-third-party
2. Click "Import from Google"
3. ✅ Shows "Waiting for authorization..."
4. Complete Google OAuth in browser
5. ✅ Redirects back to /import-third-party?job_id=...
6. ✅ Shows "Processing X/Y contacts..."
7. ✅ Alert shows "Import Complete!"
8. ✅ Stays on /import-third-party page
```

### Test Flow (Mobile):
```
1. Go to: /import-third-party
2. Click "Import from Google"
3. ✅ Opens browser for OAuth
4. Complete Google OAuth
5. ✅ Deep link returns to app
6. ✅ Shows progress
7. ✅ Alert shows completion
8. ✅ Stays on same page
```

### Test Redirect (Old URL):
```
1. Navigate to: /settings/imports/abc-123-def
2. ✅ Shows "Redirecting..."
3. ✅ Redirects to: /import-third-party?job_id=abc-123-def
4. ✅ Starts polling automatically
```

---

## 🐛 Troubleshooting

### Issue: Redirect goes to /settings/imports/[id]

**Cause:** Backend is using old redirect URL

**Fix:** Update backend OAuth callback to redirect to `/import-third-party?job_id={job_id}`

**Where:** Backend `/api/v1/contacts/import/{provider}/callback` endpoint

---

### Issue: Page doesn't show progress after OAuth

**Check:**
1. ✅ URL has `job_id` parameter?
2. ✅ Console logs show "OAuth redirect detected"?
3. ✅ Polling is active? (check network tab)
4. ✅ Backend job status endpoint working?

**Debug:**
```
Open DevTools → Console
Look for: [ImportThirdParty] OAuth redirect detected, job_id: ...
Look for: Network requests to /api/v1/contacts/import/status/...
```

---

### Issue: Polling never stops

**Check:**
1. ✅ Job status eventually becomes 'completed' or 'failed'?
2. ✅ Alert shows up?
3. ✅ `setImporting(false)` is called?

**Fix:** Make sure backend sets status to 'completed' or 'failed' when done

---

## 📊 Status Codes

| Status | Description | Polling? | UI |
|--------|-------------|----------|-----|
| `pending` | Job created, not started | No | "Starting..." |
| `authenticating` | Waiting for OAuth | No | "Waiting for authorization..." |
| `fetching` | Getting contacts from provider | Yes | "Fetching contacts..." |
| `processing` | Importing into database | Yes | "Processing X/Y contacts..." |
| `completed` | Done successfully | No | Alert + success message |
| `failed` | Error occurred | No | Alert + error message |

---

## 🎉 Benefits of Consolidation

### Before (Split Flow):
- ❌ Confusing UX (multiple pages)
- ❌ User loses context
- ❌ Need to click "Go to Import" to return
- ❌ Duplicate polling logic
- ❌ Two pages to maintain

### After (Unified Flow):
- ✅ Simple UX (one page)
- ✅ User stays in context
- ✅ Automatic return after OAuth
- ✅ Single source of truth
- ✅ One page to maintain
- ✅ Better mobile experience
- ✅ Cleaner URLs

---

## 🚀 Next Steps

### Optional Improvements:
1. **Progress Bar** - Show visual progress bar for import
2. **Live Updates** - Show which contacts are being processed
3. **Pause/Resume** - Allow pausing long imports
4. **Retry Failed** - Retry individual failed contacts
5. **Duplicate Detection** - Better UI for showing duplicates
6. **Batch Import** - Import from multiple providers simultaneously

---

**Last Updated:** November 2, 2025  
**Status:** ✅ Fully Consolidated  
**Pages:** `/import-third-party` (unified), `/settings/imports/[id]` (redirects)
