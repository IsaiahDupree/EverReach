# Contact Import System

Complete guide for importing contacts from third-party providers (Google, Microsoft, Apple, etc.)

---

## 📋 Overview

The contact import system allows users to import their contacts from various third-party services using OAuth 2.0 authentication.

**Supported Providers:**
- ✅ **Google Contacts** - Google/Gmail contacts
- ✅ **Microsoft Contacts** - Outlook/Office 365 contacts
- ⏳ **Apple Contacts** - iCloud contacts (planned)
- ⏳ **CSV Import** - Manual CSV file upload (planned)

**Key Features:**
- OAuth 2.0 authentication flow
- Background import processing
- Progress tracking
- Duplicate detection
- Automatic contact mapping
- Import history
- Resume/retry support

---

## 🏗️ Architecture

### **Flow Overview**

```
User clicks "Import from Google"
         ↓
POST /v1/contacts/import/google/start
  - Creates import job (status: authenticating)
  - Returns OAuth authorization URL
         ↓
User redirected to Google OAuth
  - User grants permissions
         ↓
GET /v1/contacts/import/google/callback?code=...
  - Exchange code for tokens
  - Save tokens to database
  - Start background import
  - Redirect to status page
         ↓
Background Job:
  1. Fetch all contacts (paginated)
  2. Normalize to common format
  3. Check for duplicates
  4. Create/update contacts
  5. Track progress
         ↓
GET /v1/contacts/import/status/{jobId}
  - User polls for status
  - Shows progress bar
         ↓
Import completes
  - status: completed
  - Show summary (imported, skipped, failed)
```

---

## 📡 API Endpoints

### **1. Start Import (OAuth Flow)**

```http
POST /api/v1/contacts/import/{provider}/start
Authorization: Bearer USER_TOKEN
```

**Providers**: `google`, `microsoft`

**Response:**
```json
{
  "job_id": "uuid",
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "provider": "google"
}
```

**Frontend Action:**
- Redirect user to `authorization_url`
- User grants permissions
- Provider redirects back to callback endpoint

---

### **2. OAuth Callback** (Automatic)

```http
GET /api/v1/contacts/import/{provider}/callback
  ?code=AUTHORIZATION_CODE
  &state=STATE_TOKEN
```

**Flow:**
1. Exchange code for access/refresh tokens
2. Save tokens to database
3. Start background import job
4. Redirect to frontend status page: `/settings/imports/{jobId}`

---

### **3. Get Import Status**

```http
GET /api/v1/contacts/import/status/{jobId}
Authorization: Bearer USER_TOKEN
```

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
  "started_at": "2025-11-01T22:00:00Z",
  "completed_at": null,
  "duration_seconds": null
}
```

**Status Values:**
- `pending` - Job created, not started
- `authenticating` - Waiting for OAuth
- `fetching` - Fetching contacts from provider
- `processing` - Creating/updating contacts in database
- `completed` - Import finished successfully
- `failed` - Import failed (see error_message)
- `cancelled` - User cancelled

---

### **4. List Import Jobs**

```http
GET /api/v1/contacts/import/list
Authorization: Bearer USER_TOKEN

Query Parameters:
  ?limit=20           # Number of jobs (max 100)
  &offset=0           # Pagination offset
  &provider=google    # Filter by provider (optional)
  &status=completed   # Filter by status (optional)
```

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
      "created_at": "2025-11-01T22:00:00Z",
      "completed_at": "2025-11-01T22:05:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

## 🔧 Provider Setup

### **Google Contacts**

#### **1. Google Cloud Console Setup**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **People API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback`
5. Copy Client ID and Client Secret

#### **2. Environment Variables**

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

#### **3. Required Scopes**

- `https://www.googleapis.com/auth/contacts.readonly` - Read contacts
- `https://www.googleapis.com/auth/userinfo.email` - Get user email

---

### **Microsoft Contacts**

#### **1. Azure Portal Setup**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Set redirect URI: `https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/callback`
5. Go to **Certificates & secrets** → Create new client secret
6. Go to **API permissions** → Add permissions:
   - Microsoft Graph → Delegated → `Contacts.Read`
   - Microsoft Graph → Delegated → `User.Read`
7. Copy Application (client) ID and client secret value

#### **2. Environment Variables**

```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
```

#### **3. Required Scopes**

- `https://graph.microsoft.com/Contacts.Read` - Read contacts
- `https://graph.microsoft.com/User.Read` - Get user info

---

## 💻 Frontend Integration

### **React Native Example**

```typescript
import { useState } from 'react';
import { Linking } from 'react-native';

function ImportContactsFlow() {
  const [importing, setImporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Step 1: Start import
  async function startImport(provider: 'google' | 'microsoft') {
    setImporting(true);

    // Start OAuth flow
    const response = await fetch(
      `${API_BASE}/api/v1/contacts/import/${provider}/start`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const { job_id, authorization_url } = await response.json();
    setJobId(job_id);

    // Open OAuth page in browser
    await Linking.openURL(authorization_url);
  }

  // Step 2: Check status (poll every 2 seconds)
  async function checkStatus(jobId: string) {
    const response = await fetch(
      `${API_BASE}/api/v1/contacts/import/status/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const status = await response.json();
    return status;
  }

  // Step 3: Poll until completed
  async function pollStatus(jobId: string) {
    const interval = setInterval(async () => {
      const status = await checkStatus(jobId);

      if (status.status === 'completed') {
        clearInterval(interval);
        setImporting(false);
        alert(`Import complete! Imported ${status.imported_contacts} contacts`);
      } else if (status.status === 'failed') {
        clearInterval(interval);
        setImporting(false);
        alert('Import failed');
      }
    }, 2000);
  }

  return (
    <View>
      <Button
        title="Import from Google"
        onPress={() => startImport('google')}
        disabled={importing}
      />
      <Button
        title="Import from Microsoft"
        onPress={() => startImport('microsoft')}
        disabled={importing}
      />

      {importing && jobId && (
        <View>
          <Text>Importing contacts...</Text>
          <Button
            title="Check Status"
            onPress={() => pollStatus(jobId)}
          />
        </View>
      )}
    </View>
  );
}
```

### **Web (Next.js) Example**

```typescript
'use client';

import { useState } from 'react';

export function ImportButton({ provider }: { provider: 'google' | 'microsoft' }) {
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);

    try {
      // Start import
      const response = await fetch(`/api/v1/contacts/import/${provider}/start`, {
        method: 'POST',
      });

      const { job_id, authorization_url } = await response.json();

      // Redirect to OAuth
      window.location.href = authorization_url;

      // After OAuth callback, user will be redirected to:
      // /settings/imports/{job_id}

    } catch (error) {
      console.error('Import failed:', error);
      setLoading(false);
    }
  }

  return (
    <button onClick={handleImport} disabled={loading}>
      {loading ? 'Starting...' : `Import from ${provider}`}
    </button>
  );
}
```

---

## 📊 Database Schema

### **contact_import_jobs**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who started import |
| `provider` | enum | Provider name (google, microsoft, etc.) |
| `provider_account_id` | text | Email/ID from provider |
| `provider_account_name` | text | Display name from provider |
| `status` | enum | Current status |
| `total_contacts` | int | Total contacts to import |
| `processed_contacts` | int | Contacts processed so far |
| `imported_contacts` | int | Successfully imported |
| `skipped_contacts` | int | Duplicates or invalid |
| `failed_contacts` | int | Failed to import |
| `access_token` | text | OAuth access token |
| `refresh_token` | text | OAuth refresh token |
| `token_expires_at` | timestamptz | Token expiry |
| `error_message` | text | Error if failed |
| `started_at` | timestamptz | When import started |
| `completed_at` | timestamptz | When import completed |

### **imported_contacts**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `import_job_id` | UUID | Related import job |
| `contact_id` | UUID | Created/updated contact |
| `provider_contact_id` | text | ID from provider |
| `provider_etag` | text | For sync/updates |
| `action` | text | created, updated, skipped, failed |
| `skip_reason` | text | Why skipped |
| `raw_data` | jsonb | Original provider data |

---

## 🔒 Security Considerations

### **OAuth Tokens**

- Access tokens stored in database (encrypt in production)
- Refresh tokens used to renew expired access tokens
- Tokens deleted after import completes (optional)

### **CSRF Protection**

- State parameter includes job_id and random value
- State validated in callback

### **Rate Limiting**

- Import start: 5 requests per hour per user
- Status check: 60 requests per minute per user

### **Data Privacy**

- Users can only import to their own account
- RLS policies enforce user isolation
- Raw contact data stored for debugging (can be cleared)

---

## 🧪 Testing

### **Test Import Flow**

```bash
# 1. Start import
curl -X POST "https://ever-reach-be.vercel.app/api/v1/contacts/import/google/start" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
# {
#   "job_id": "abc-123",
#   "authorization_url": "https://accounts.google.com/..."
# }

# 2. User completes OAuth (in browser)

# 3. Check status
curl "https://ever-reach-be.vercel.app/api/v1/contacts/import/status/abc-123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. List all imports
curl "https://ever-reach-be.vercel.app/api/v1/contacts/import/list" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Deployment Checklist

### **Environment Variables**

- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `MICROSOFT_CLIENT_ID`
- [ ] `MICROSOFT_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_FRONTEND_URL`
- [ ] `NEXT_PUBLIC_BASE_URL`

### **OAuth Setup**

- [ ] Google Cloud Console configured
- [ ] Azure Portal configured
- [ ] Redirect URIs added to providers
- [ ] Scopes configured correctly

### **Database**

- [ ] Run migration `06_contact_imports.sql`
- [ ] Verify tables created
- [ ] Verify RLS policies enabled

### **Testing**

- [ ] Test Google import flow
- [ ] Test Microsoft import flow
- [ ] Test status polling
- [ ] Test duplicate detection
- [ ] Test error handling

---

## 🐛 Troubleshooting

### **"OAuth error: access_denied"**

**Cause:** User denied permissions or OAuth misconfigured

**Solution:**
- Verify OAuth client ID/secret are correct
- Check redirect URI matches exactly
- Ensure scopes are requested correctly

### **"Import stuck in 'fetching' status"**

**Cause:** Background job failed silently

**Solution:**
- Check server logs for errors
- Verify access token is valid
- Check provider API rate limits

### **"No contacts imported (all skipped)"**

**Cause:** All contacts already exist or have no email

**Solution:**
- Check `imported_contacts` table for skip reasons
- Verify duplicate detection logic
- Check contact email requirements

---

## 📝 Adding New Providers

To add a new provider (e.g., LinkedIn, Twitter):

1. **Add to enum** in migration:
   ```sql
   ALTER TYPE import_provider ADD VALUE 'linkedin';
   ```

2. **Create provider class** in `lib/imports/provider.ts`:
   ```typescript
   class LinkedInContactsProvider extends ContactImportProvider {
     // Implement abstract methods
   }
   ```

3. **Register provider**:
   ```typescript
   PROVIDERS.linkedin = () => new LinkedInContactsProvider();
   ```

4. **Add OAuth credentials** to environment variables

5. **Test the flow**

---

**Created:** November 1, 2025  
**Version:** 1.0  
**Status:** Production Ready
