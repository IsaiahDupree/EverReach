# Backend API Specification - Contact Import System

**For Backend Team Implementation**

This document specifies all backend endpoints needed for the contact import feature to work with the already-built frontend.

---

## 📋 Overview

The contact import system allows users to import contacts from third-party providers (Google, Microsoft) using OAuth 2.0. The backend must:

1. ✅ **Initiate OAuth flow** - Generate authorization URLs
2. ✅ **Handle OAuth callbacks** - Exchange codes for tokens and start imports
3. ✅ **Track import progress** - Store and report status
4. ✅ **Return import history** - List past imports
5. ✅ **Health check** - Verify OAuth configuration

---

## 🔐 Authentication

All endpoints except `/health` and `/callback` require:
- **Header:** `Authorization: Bearer {JWT_TOKEN}`
- User must be authenticated via Supabase Auth

---

## 📡 Required Endpoints

### **1. Health Check** ✅ (Already Implemented)

Check if OAuth providers are configured.

```http
GET /api/v1/contacts/import/health
```

**Authentication:** None required

**Response:**
```json
{
  "status": "healthy" | "partial" | "unhealthy",
  "providers": {
    "google": {
      "configured": true,
      "client_id_set": true,
      "client_secret_set": true,
      "redirect_uri": "https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback",
      "setup_url": "https://console.cloud.google.com/"
    },
    "microsoft": {
      "configured": true,
      "client_id_set": true,
      "client_secret_set": true,
      "redirect_uri": "https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/callback",
      "setup_url": "https://portal.azure.com/"
    }
  },
  "message": "All OAuth providers configured"
}
```

**Business Logic:**
- Check if `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars exist
- Check if `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` env vars exist
- Return configuration status for each provider

---

### **2. Start Import** ⚠️ (NEEDS IMPLEMENTATION)

Initiate OAuth flow for a provider.

```http
POST /api/v1/contacts/import/{provider}/start
```

**Path Parameters:**
- `provider`: `google` | `microsoft`

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (required)

**Response:**
```json
{
  "job_id": "uuid-v4-string",
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&state=...",
  "provider": "google"
}
```

**Business Logic:**

1. **Validate provider** - Must be 'google' or 'microsoft'
2. **Check OAuth config** - Verify CLIENT_ID and CLIENT_SECRET are set
3. **Create import job** in database:
   ```sql
   INSERT INTO contact_import_jobs (
     id,              -- Generate UUID
     user_id,         -- From JWT token
     provider,        -- 'google' or 'microsoft'
     status,          -- 'authenticating'
     created_at       -- NOW()
   )
   ```
4. **Generate state parameter** (for CSRF protection):
   ```json
   {
     "job_id": "job-uuid",
     "user_id": "user-uuid",
     "random": "random-string-for-security"
   }
   ```
   - Base64 encode this JSON
5. **Build authorization URL**:
   
   **For Google:**
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id={GOOGLE_CLIENT_ID}
     &redirect_uri={BASE_URL}/api/v1/contacts/import/google/callback
     &response_type=code
     &scope=https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email
     &access_type=offline
     &state={base64_state}
   ```
   
   **For Microsoft:**
   ```
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize
     ?client_id={MICROSOFT_CLIENT_ID}
     &redirect_uri={BASE_URL}/api/v1/contacts/import/microsoft/callback
     &response_type=code
     &scope=https://graph.microsoft.com/Contacts.Read https://graph.microsoft.com/User.Read
     &state={base64_state}
   ```

6. **Return** `job_id` and `authorization_url`

**Error Responses:**
```json
{
  "error": "Configuration Required",
  "message": "Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  "setup_url": "https://console.cloud.google.com/"
}
```

---

### **3. OAuth Callback** ⚠️ (NEEDS IMPLEMENTATION - CRITICAL)

Handle OAuth provider callback and redirect to app.

```http
GET /api/v1/contacts/import/{provider}/callback
  ?code={authorization_code}
  &state={base64_state}
```

**Path Parameters:**
- `provider`: `google` | `microsoft`

**Query Parameters:**
- `code`: Authorization code from OAuth provider
- `state`: Base64-encoded state from start endpoint

**Authentication:** None (public endpoint, validated via state parameter)

**Response:** HTTP 302 Redirect

**Redirect URLs:**
- **Success:** `everreach://import-callback/{provider}?job_id={job_id}&status=success`
- **Error:** `everreach://import-callback/{provider}?job_id={job_id}&status=error&message={error}`

**Business Logic:**

1. **Decode and validate state**:
   ```javascript
   const state = JSON.parse(base64Decode(stateParam));
   const { job_id, user_id, random } = state;
   ```
   
2. **Verify job exists**:
   ```sql
   SELECT * FROM contact_import_jobs 
   WHERE id = job_id AND user_id = user_id AND status = 'authenticating'
   ```
   - If not found, redirect with error

3. **Exchange authorization code for tokens**:
   
   **For Google:**
   ```javascript
   POST https://oauth2.googleapis.com/token
   Body: {
     code: code,
     client_id: GOOGLE_CLIENT_ID,
     client_secret: GOOGLE_CLIENT_SECRET,
     redirect_uri: 'https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback',
     grant_type: 'authorization_code'
   }
   
   Response: {
     access_token: string,
     refresh_token: string,
     expires_in: number,
     scope: string
   }
   ```
   
   **For Microsoft:**
   ```javascript
   POST https://login.microsoftonline.com/common/oauth2/v2.0/token
   Body: {
     code: code,
     client_id: MICROSOFT_CLIENT_ID,
     client_secret: MICROSOFT_CLIENT_SECRET,
     redirect_uri: 'https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/callback',
     grant_type: 'authorization_code'
   }
   ```

4. **Store tokens** in database:
   ```sql
   UPDATE contact_import_jobs SET
     access_token = encrypted_access_token,
     refresh_token = encrypted_refresh_token,
     token_expires_at = NOW() + expires_in * INTERVAL '1 second',
     status = 'fetching',
     started_at = NOW()
   WHERE id = job_id
   ```

5. **Start background import job** (async):
   - Queue a background task to fetch and import contacts
   - Don't wait for it to complete

6. **Redirect to app** with deep link:
   ```javascript
   return Response.redirect(
     `everreach://import-callback/${provider}?job_id=${job_id}&status=success`
   );
   ```

**Error Handling:**
- If token exchange fails, redirect with error
- If database update fails, redirect with error
- Always redirect - never show blank page

---

### **4. Get Import Status** ⚠️ (NEEDS IMPLEMENTATION)

Poll for import progress.

```http
GET /api/v1/contacts/import/status/{jobId}
```

**Path Parameters:**
- `jobId`: UUID of import job

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (required)

**Response:**
```json
{
  "id": "uuid",
  "provider": "google",
  "status": "processing",
  "total_contacts": 500,
  "processed_contacts": 250,
  "imported_contacts": 200,
  "skipped_contacts": 30,
  "failed_contacts": 20,
  "progress_percent": 50.0,
  "provider_account_name": "user@gmail.com",
  "started_at": "2025-11-02T16:00:00Z",
  "completed_at": null,
  "error_message": null
}
```

**Status Values:**
- `authenticating` - Waiting for OAuth
- `fetching` - Downloading contacts from provider
- `processing` - Creating contacts in database
- `completed` - Import finished successfully
- `failed` - Import failed
- `cancelled` - User cancelled

**Business Logic:**

1. **Verify job belongs to user**:
   ```sql
   SELECT * FROM contact_import_jobs
   WHERE id = jobId AND user_id = {user_id_from_token}
   ```

2. **Calculate progress**:
   ```javascript
   progress_percent = (processed_contacts / total_contacts) * 100
   ```

3. **Return current status**

**Error Responses:**
```json
{
  "error": "Not Found",
  "message": "Import job not found or access denied"
}
```

---

### **5. List Import History** ⚠️ (NEEDS IMPLEMENTATION)

Get user's import history.

```http
GET /api/v1/contacts/import/list
  ?limit=20
  &offset=0
  &provider=google    (optional)
  &status=completed   (optional)
```

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (required)

**Query Parameters:**
- `limit`: Number of jobs to return (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `provider`: Filter by provider (optional)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "provider": "google",
      "status": "completed",
      "total_contacts": 500,
      "imported_contacts": 450,
      "skipped_contacts": 30,
      "failed_contacts": 20,
      "provider_account_name": "user@gmail.com",
      "created_at": "2025-11-02T16:00:00Z",
      "completed_at": "2025-11-02T16:05:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Business Logic:**

1. **Query user's import jobs**:
   ```sql
   SELECT * FROM contact_import_jobs
   WHERE user_id = {user_id_from_token}
     AND ($provider IS NULL OR provider = $provider)
     AND ($status IS NULL OR status = $status)
   ORDER BY created_at DESC
   LIMIT $limit OFFSET $offset
   ```

2. **Return paginated results**

---

## 🗄️ Database Schema

### **contact_import_jobs** Table

```sql
CREATE TABLE contact_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'icloud', 'csv')),
  
  -- OAuth tokens (ENCRYPT THESE!)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Provider info
  provider_account_id TEXT,
  provider_account_name TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'authenticating', 'fetching', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Progress counters
  total_contacts INT DEFAULT 0,
  processed_contacts INT DEFAULT 0,
  imported_contacts INT DEFAULT 0,
  skipped_contacts INT DEFAULT 0,
  failed_contacts INT DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_import_jobs_user_id ON contact_import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON contact_import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON contact_import_jobs(created_at DESC);

-- Row Level Security
ALTER TABLE contact_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import jobs"
  ON contact_import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import jobs"
  ON contact_import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs"
  ON contact_import_jobs FOR UPDATE
  USING (auth.uid() = user_id);
```

### **imported_contacts** Table (Optional - for tracking)

```sql
CREATE TABLE imported_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES contact_import_jobs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Provider data
  provider_contact_id TEXT,
  provider_etag TEXT,
  
  -- Import result
  action TEXT CHECK (action IN ('created', 'updated', 'skipped', 'failed')),
  skip_reason TEXT,
  error_message TEXT,
  
  -- Raw data for debugging
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_imported_contacts_job_id ON imported_contacts(import_job_id);
CREATE INDEX idx_imported_contacts_contact_id ON imported_contacts(contact_id);
```

---

## 🔄 Background Import Process

After OAuth callback stores tokens, start background job:

### **Google Contacts Import**

```javascript
async function importGoogleContacts(jobId) {
  // 1. Get job and tokens
  const job = await getJob(jobId);
  const { access_token, user_id } = job;
  
  // 2. Fetch contacts from Google People API
  let contacts = [];
  let nextPageToken = null;
  
  do {
    const response = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,addresses,organizations&pageSize=100${nextPageToken ? '&pageToken=' + nextPageToken : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    const data = await response.json();
    contacts = contacts.concat(data.connections || []);
    nextPageToken = data.nextPageToken;
    
    // Update total count
    await updateJob(jobId, {
      status: 'processing',
      total_contacts: contacts.length
    });
    
  } while (nextPageToken);
  
  // 3. Process each contact
  for (let i = 0; i < contacts.length; i++) {
    const googleContact = contacts[i];
    
    try {
      // Extract data
      const name = googleContact.names?.[0]?.displayName || '';
      const email = googleContact.emailAddresses?.[0]?.value || '';
      const phone = googleContact.phoneNumbers?.[0]?.value || '';
      
      // Skip if no email (duplicate detection uses email)
      if (!email) {
        await updateCounters(jobId, 'skipped');
        continue;
      }
      
      // Check for duplicate
      const existing = await findContactByEmail(user_id, email);
      
      if (existing) {
        // Skip duplicate
        await updateCounters(jobId, 'skipped');
      } else {
        // Create new contact
        await createContact({
          user_id,
          display_name: name,
          email,
          phone,
          source: 'google_import',
          imported_at: new Date()
        });
        
        await updateCounters(jobId, 'imported');
      }
      
      // Update progress
      await updateJob(jobId, {
        processed_contacts: i + 1
      });
      
    } catch (error) {
      await updateCounters(jobId, 'failed');
    }
  }
  
  // 4. Mark as completed
  await updateJob(jobId, {
    status: 'completed',
    completed_at: new Date()
  });
}
```

### **Microsoft Contacts Import**

Similar process, but use Microsoft Graph API:

```javascript
async function importMicrosoftContacts(jobId) {
  const job = await getJob(jobId);
  const { access_token, user_id } = job;
  
  // Fetch from Microsoft Graph
  let contacts = [];
  let nextLink = 'https://graph.microsoft.com/v1.0/me/contacts';
  
  do {
    const response = await fetch(nextLink, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const data = await response.json();
    contacts = contacts.concat(data.value || []);
    nextLink = data['@odata.nextLink'];
    
    await updateJob(jobId, {
      status: 'processing',
      total_contacts: contacts.length
    });
    
  } while (nextLink);
  
  // Process contacts (similar to Google)
  // ...
}
```

---

## ⚠️ Error Handling

### **Common Errors to Handle**

1. **OAuth Configuration Missing**
   ```json
   {
     "error": "Configuration Required",
     "message": "Provider OAuth not configured",
     "status": 400
   }
   ```

2. **Invalid Authorization Code**
   ```json
   {
     "error": "OAuth Failed",
     "message": "Failed to exchange authorization code",
     "status": 400
   }
   ```

3. **Token Expired**
   - Use refresh_token to get new access_token
   - If refresh fails, mark job as failed

4. **API Rate Limits**
   - Implement exponential backoff
   - Pause import and resume later

5. **Network Errors**
   - Retry up to 3 times
   - If all retries fail, mark job as failed

---

## 🔐 Security Requirements

1. **Encrypt OAuth Tokens**
   - Use AES-256 encryption for access_token and refresh_token
   - Store encryption key in secure environment variable

2. **Validate State Parameter**
   - Always verify state matches what was sent
   - Prevents CSRF attacks

3. **Rate Limiting**
   - Limit /start endpoint: 5 requests per hour per user
   - Limit /status endpoint: 60 requests per minute per user

4. **Token Cleanup**
   - Delete tokens after import completes (optional)
   - Or keep for future sync features

---

## 📝 Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-client-id-uuid
MICROSOFT_CLIENT_SECRET=your-client-secret

# Base URLs
NEXT_PUBLIC_BASE_URL=https://ever-reach-be.vercel.app
NEXT_PUBLIC_FRONTEND_URL=https://everreach.app
```

---

## ✅ Implementation Checklist

### **Must Have (MVP)**
- [ ] `/health` endpoint (already done ✅)
- [ ] `/start` endpoint - Generate OAuth URLs
- [ ] `/callback` endpoint - **CRITICAL** - Must redirect to app
- [ ] `/status` endpoint - Track progress
- [ ] `/list` endpoint - Show history
- [ ] Database migration - Create tables
- [ ] Background job - Import contacts
- [ ] Duplicate detection - Check existing emails

### **Nice to Have**
- [ ] Token refresh logic
- [ ] Resume failed imports
- [ ] Detailed error messages
- [ ] Import analytics/metrics
- [ ] Webhook notifications

### **Security**
- [ ] Encrypt OAuth tokens
- [ ] Validate state parameter
- [ ] Rate limiting
- [ ] RLS policies on tables

---

## 🧪 Testing

### **Manual Test Flow**

1. **Health Check:**
   ```bash
   curl https://ever-reach-be.vercel.app/api/v1/contacts/import/health
   # Should return provider configuration status
   ```

2. **Start Import:**
   ```bash
   curl -X POST https://ever-reach-be.vercel.app/api/v1/contacts/import/google/start \
     -H "Authorization: Bearer USER_TOKEN"
   # Should return job_id and authorization_url
   ```

3. **Callback:**
   - Open authorization_url in browser
   - Sign in with Google
   - Should redirect to: `everreach://import-callback/google?job_id=xxx&status=success`

4. **Check Status:**
   ```bash
   curl https://ever-reach-be.vercel.app/api/v1/contacts/import/status/JOB_ID \
     -H "Authorization: Bearer USER_TOKEN"
   # Should return import progress
   ```

5. **List History:**
   ```bash
   curl https://ever-reach-be.vercel.app/api/v1/contacts/import/list \
     -H "Authorization: Bearer USER_TOKEN"
   # Should return list of past imports
   ```

---

## 📞 Questions for Backend Team

1. **Which background job system are you using?**
   - Vercel Cron? Supabase Functions? External queue?

2. **How should we encrypt OAuth tokens?**
   - Built-in encryption? External service?

3. **Should we keep tokens after import?**
   - For future sync features or delete after completion?

4. **Preferred error handling pattern?**
   - Standard error format across all endpoints?

---

## 🚀 Priority Order

1. **HIGH:** `/callback` endpoint - Fix blank page issue
2. **HIGH:** `/start` endpoint - Generate OAuth URLs
3. **HIGH:** `/status` endpoint - Show progress
4. **MEDIUM:** Background import job
5. **MEDIUM:** `/list` endpoint - Import history
6. **LOW:** Advanced features (resume, sync, etc.)

---

**Last Updated:** November 2, 2025  
**Status:** Specification Complete - Ready for Implementation  
**Frontend Status:** ✅ Already Built and Waiting
