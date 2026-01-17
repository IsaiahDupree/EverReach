# OAuth Setup Guide - Contact Import

Complete guide to configure Google and Microsoft OAuth for contact importing.

---

## 🔴 Current Issue

**Error:** `Error 400: invalid_request` when trying Google OAuth

**Cause:** Google OAuth credentials not configured in backend environment variables

---

## ✅ Google OAuth Setup

### **Step 1: Google Cloud Console**

1. Go to: https://console.cloud.google.com/

2. **Create or Select Project:**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Name: `EverReach` or your app name
   - Click "Create"

3. **Enable Required APIs:**
   - Navigate to **"APIs & Services"** → **"Library"**
   - Search and enable:
     - ✅ **People API** (for reading contacts)
     - ✅ **Google+ API** or **OAuth2 API** (for user info)

4. **Configure OAuth Consent Screen:**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - User Type: **External** (unless you have Google Workspace)
   - Click "Create"
   
   **Fill in:**
   - App name: `EverReach`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   
   **Scopes:**
   - Click "Add or Remove Scopes"
   - Add:
     - `https://www.googleapis.com/auth/contacts.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click "Save and Continue"
   
   **Test Users (for development):**
   - Add your Gmail address
   - Click "Save and Continue"

5. **Create OAuth Credentials:**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"+ Create Credentials"** → **"OAuth client ID"**
   
   **Configure:**
   - Application type: **Web application**
   - Name: `EverReach Contact Import`
   
   **Authorized redirect URIs:** (Add both)
   ```
   https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback
   http://localhost:3000/api/v1/contacts/import/google/callback
   ```
   
   - Click **"Create"**

6. **Copy Your Credentials:**
   ```
   Client ID: 123456789-abcdefghijk.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 🔵 Microsoft OAuth Setup

### **Step 1: Azure Portal**

1. Go to: https://portal.azure.com/

2. **Navigate to Azure Active Directory:**
   - Search for "Azure Active Directory"
   - Click on it

3. **App Registrations:**
   - Click **"App registrations"** in the left menu
   - Click **"+ New registration"**
   
   **Configure:**
   - Name: `EverReach Contact Import`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URL: `https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/callback`
   - Click **"Register"**

4. **Copy Application ID:**
   - On the Overview page, copy:
     - **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

5. **Create Client Secret:**
   - Click **"Certificates & secrets"** in left menu
   - Click **"+ New client secret"**
   - Description: `EverReach Backend`
   - Expires: **24 months** (or your preference)
   - Click **"Add"**
   - **IMPORTANT:** Copy the **Value** immediately (it won't be shown again)
     - Client Secret: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **Configure API Permissions:**
   - Click **"API permissions"** in left menu
   - Click **"+ Add a permission"**
   - Select **"Microsoft Graph"**
   - Select **"Delegated permissions"**
   - Add:
     - ✅ `Contacts.Read` - Read user contacts
     - ✅ `User.Read` - Read user profile
   - Click **"Add permissions"**
   - Click **"Grant admin consent"** (if you're admin)

7. **Add Additional Redirect URI (for local testing):**
   - Click **"Authentication"** in left menu
   - Under "Web", click **"+ Add URI"**
   - Add: `http://localhost:3000/api/v1/contacts/import/microsoft/callback`
   - Click **"Save"**

---

## 🔧 Backend Environment Variables

### **Vercel Dashboard**

1. Go to: https://vercel.com/your-team/your-project
2. Click **"Settings"**
3. Click **"Environment Variables"**
4. Add the following:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL (for OAuth redirects)
NEXT_PUBLIC_FRONTEND_URL=https://everreach.app
# Or for development:
# NEXT_PUBLIC_FRONTEND_URL=http://localhost:8081
```

5. Click **"Save"**
6. **Redeploy** your backend for changes to take effect

---

## 🧪 Testing OAuth Flow

### **Test with cURL (Quick Check)**

```bash
# Test Google OAuth start
curl -X POST "https://ever-reach-be.vercel.app/api/v1/contacts/import/google/start" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "job_id": "uuid",
#   "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
# }
```

### **Test in App**

1. Open EverReach app
2. Navigate to **Settings** → **Import from Third Parties**
3. Tap **"Google Contacts"**
4. Browser should open to Google sign-in
5. Sign in and grant permissions
6. Should redirect back to app with import progress

---

## 🐛 Troubleshooting

### **Error: `redirect_uri_mismatch`**

**Problem:** The redirect URI doesn't match what's configured in Google/Microsoft console

**Solution:**
1. Check that redirect URI in console **exactly matches** what backend is sending
2. Must include `https://` (or `http://` for localhost)
3. No trailing slashes
4. Case-sensitive

**Check backend redirect URI:**
```bash
# It should be constructing:
https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback
```

---

### **Error: `invalid_request`** (Current Issue)

**Problem:** OAuth credentials not set in backend environment

**Solution:**
1. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars
2. Redeploy backend
3. Try OAuth flow again

---

### **Error: `Access blocked: Authorization Error`**

**Problem:** App not verified or scopes not added to OAuth consent screen

**Solution:**
1. Go back to Google Cloud Console → OAuth consent screen
2. Make sure scopes are added:
   - `contacts.readonly`
   - `userinfo.email`
3. If still blocked, add your email to "Test users"
4. For production, you'll need to submit app for verification

---

### **Backend Not Receiving Callback**

**Problem:** OAuth provider calls callback but backend doesn't respond

**Solution:**
1. Check Vercel logs for errors
2. Verify callback endpoint exists: `/api/v1/contacts/import/{provider}/callback`
3. Check that environment variables are set
4. Ensure backend is deployed and running

---

## 📋 Checklist

### **Google OAuth**
- [ ] Google Cloud project created
- [ ] People API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Redirect URIs added (production + localhost)
- [ ] Client ID and Secret copied
- [ ] Environment variables set in Vercel
- [ ] Backend redeployed
- [ ] Test users added (for development)

### **Microsoft OAuth**
- [ ] Azure app registration created
- [ ] Client ID copied
- [ ] Client secret created and copied
- [ ] API permissions added (Contacts.Read, User.Read)
- [ ] Redirect URIs added (production + localhost)
- [ ] Environment variables set in Vercel
- [ ] Backend redeployed

### **Backend**
- [ ] Environment variables verified
- [ ] Backend redeployed after adding env vars
- [ ] OAuth endpoints accessible (test with cURL)
- [ ] Logs show no errors

### **Frontend**
- [ ] Deep link configuration for OAuth callback
- [ ] Import screen accessible
- [ ] Progress tracking working
- [ ] Error handling for failed OAuth

---

## 🔐 Security Notes

1. **Never commit** Client IDs or Secrets to git
2. **Use environment variables** for all credentials
3. **Rotate secrets** periodically (every 6-12 months)
4. **Restrict redirect URIs** to only your actual domains
5. **Review OAuth scopes** - only request what you need
6. **Monitor OAuth usage** in Google/Microsoft dashboards

---

## 📚 References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google People API](https://developers.google.com/people)
- [Microsoft OAuth Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph Contacts API](https://docs.microsoft.com/en-us/graph/api/user-list-contacts)

---

**Last Updated:** November 1, 2025  
**Status:** In Progress - OAuth credentials need to be configured
