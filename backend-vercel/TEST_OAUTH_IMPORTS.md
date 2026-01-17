# 🧪 Testing OAuth Contact Imports

**Status:** ✅ Deployed and Ready  
**Date:** November 1, 2025

---

## 📋 Prerequisites

- ✅ Migration run (`06_contact_imports.sql`)
- ✅ OAuth credentials added to Vercel
- ✅ Endpoints deployed to production
- ⏳ User account for testing

---

## 🚀 Quick Test (3 Steps)

### **Step 1: Get Your User Token**

Run the token helper:

```bash
cd backend-vercel
node test/backend/get-user-token.mjs
```

**Enter your Supabase credentials:**
- Email: your_email@example.com
- Password: your_password

**Copy the token shown**, then:

**Windows PowerShell:**
```powershell
$env:TEST_TOKEN="YOUR_TOKEN_HERE"
```

**Mac/Linux:**
```bash
export TEST_TOKEN="YOUR_TOKEN_HERE"
```

### **Step 2: Run OAuth Test**

```bash
node test/backend/test-contact-import.mjs
```

**This will:**
- ✅ Test Google OAuth URL generation
- ✅ Test Microsoft OAuth URL generation
- ✅ List your import jobs
- ✅ Show OAuth URLs to open in browser

### **Step 3: Complete OAuth Flow**

1. **Copy one of the OAuth URLs** from the test output
2. **Open it in your browser**
3. **Sign in to Google/Microsoft**
4. **Grant permissions**
5. **You'll be redirected** to callback → import starts automatically

---

## 📊 Check Import Progress

After completing OAuth, check status:

```bash
curl "https://ever-reach-be.vercel.app/api/v1/contacts/import/status/JOB_ID" \
  -H "Authorization: Bearer $TEST_TOKEN"
```

Replace `JOB_ID` with the ID from step 2.

---

## 🧪 Manual Testing (cURL)

### **Test Google Import**

```bash
curl -X POST "https://ever-reach-be.vercel.app/api/v1/contacts/import/google/start" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "provider": "google"
}
```

### **Test Microsoft Import**

```bash
curl -X POST "https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/start" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "job_id": "uuid-here",
  "authorization_url": "https://login.microsoftonline.com/...",
  "provider": "microsoft"
}
```

### **List Import Jobs**

```bash
curl "https://ever-reach-be.vercel.app/api/v1/contacts/import/list" \
  -H "Authorization: Bearer $TEST_TOKEN"
```

---

## ✅ Success Criteria

After testing, verify:

- [ ] OAuth URLs generate correctly (no errors)
- [ ] Can complete Google OAuth flow
- [ ] Can complete Microsoft OAuth flow
- [ ] Contacts import successfully
- [ ] Progress tracking shows real-time updates
- [ ] No duplicate contacts created
- [ ] Import history shows in list

---

## 🐛 Troubleshooting

### **"401 Unauthorized"**
- Check your token is still valid (tokens expire after ~1 hour)
- Run `get-user-token.mjs` again to get a fresh token

### **"redirect_uri_mismatch"**
**Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Select your OAuth 2.0 Client
4. Add: `https://ever-reach-be.vercel.app/api/v1/contacts/import/google/callback`

**Microsoft:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Azure Active Directory → App registrations
3. Select your app → Authentication
4. Add: `https://ever-reach-be.vercel.app/api/v1/contacts/import/microsoft/callback`

### **"invalid_client"**
- Verify OAuth credentials in Vercel match your console
- Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Check `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

### **Import Stuck in "fetching"**
- Check [Vercel Logs](https://vercel.com/dashboard)
- Look for API errors or token expiration
- Verify provider API permissions are correct

---

## 📝 Test Results Template

```markdown
# Test Results - OAuth Contact Import

**Date:** 2025-11-01
**Tester:** Your Name

## Google Import
- [ ] OAuth URL generated
- [ ] User redirected to Google
- [ ] Permissions granted
- [ ] Callback successful
- [ ] Contacts imported: X
- [ ] Import completed in: X seconds

## Microsoft Import
- [ ] OAuth URL generated
- [ ] User redirected to Microsoft
- [ ] Permissions granted
- [ ] Callback successful
- [ ] Contacts imported: X
- [ ] Import completed in: X seconds

## Issues Found
- None / List issues here

## Notes
- Add any observations
```

---

## 🎯 Next Steps After Testing

Once testing is successful:

1. **Document results** using template above
2. **Test with multiple accounts** (different contact sizes)
3. **Test error scenarios** (revoke access, network errors)
4. **Performance testing** (large contact lists 1000+)
5. **Frontend integration** (build UI for import flow)

---

**Ready to test!** 🚀
