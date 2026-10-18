# Contact Import Debugging Guide

## ✅ Current Configuration (Verified Working)

### **Backend Endpoint**
- **Base URL:** `https://ever-reach-be.vercel.app`
- **Endpoint:** `/api/v1/contacts`
- **Full URL:** `https://ever-reach-be.vercel.app/api/v1/contacts`
- **Method:** `POST`
- **Auth:** Required (Bearer token)

### **Test Results**
✅ **Automated tests PASS 10/10** - Backend accepts contacts with:
- Phone only
- Email only
- Phone + Email
- Multiple phones/emails
- Special characters
- Unicode names

### **Configured in .env**
```bash
EXPO_PUBLIC_API_URL=https://ever-reach-be.vercel.app
```

---

## 🔍 Logging Configuration

### **1. API Layer Logging (`lib/api.ts`)**
Enhanced `apiFetch()` logs:

**REQUEST:**
- 🌐 Full URL
- 📤 HTTP Method
- 🎫 Auth token preview (first 30 chars)
- 📋 All headers
- 📦 Request body (raw + parsed JSON)

**RESPONSE:**
- ⏱️ Duration
- 📊 Status code
- 📥 Response body (raw + parsed JSON)

**ERROR:**
- ❌ Error object
- 💥 Error message
- 🔍 Error type

### **2. Repository Layer Logging (`repos/SupabaseContactsRepo.ts`)**
Extra logging in `upsert()`:
- Endpoint being called
- Method
- Payload structure
- Response status
- Error details

---

## 📱 How to Test

### **Start the App:**
```bash
cd fifth_pull
npm start
```

### **Import a Contact:**
1. Open app on device/simulator
2. Navigate to contact import
3. Select a contact
4. Try to import

### **Check Metro Console:**
You'll see logs like this:

```
[SupabaseContactsRepo] ===== API CALL DEBUG =====
[SupabaseContactsRepo] Endpoint: /api/v1/contacts
[SupabaseContactsRepo] Method: POST
[SupabaseContactsRepo] Payload: {
  "display_name": "Sarah Ashley",
  "phones": ["+16018264769"],
  "emails": []
}

========== API REQUEST ==========
🌐 URL: https://ever-reach-be.vercel.app/api/v1/contacts
📤 Method: POST
🎫 Has Token: true
🎫 Token Preview: Bearer eyJhbGciOiJIUzI1NiIs...
📦 Body: {"display_name":"Sarah Ashley","phones":["+16018264769"],"emails":[]}

========== API RESPONSE ==========
⏱️  Duration: 245ms
📊 Status: 201 Created
✅ OK: true
📥 Response: {"contact":{"id":"...","display_name":"Sarah Ashley"}}
```

---

## ✅ What to Verify

| Check | Expected | ❌ If Wrong |
|-------|----------|-------------|
| **Full URL** | `https://ever-reach-be.vercel.app/api/v1/contacts` | Check .env file |
| **Method** | `POST` | Check SupabaseContactsRepo.ts line 90 |
| **Has Token** | `true` | Check Supabase auth login |
| **Token Format** | `Bearer eyJ...` | Check authHeader() function |
| **Body has display_name** | `"display_name": "..."` | Check mapPersonToSupabaseContact() |
| **Body has phones OR emails** | `phones: [...]` or `emails: [...]` | Check contact picker extraction |
| **Status** | `201 Created` | Backend issue - check Vercel logs |

---

## 🧪 Verify Endpoint with curl

Test the backend directly:

```bash
# Get a token first
$env:TEST_EMAIL = "your@email.com"
$env:TEST_PASSWORD = "yourpassword"
$env:SUPABASE_ANON_KEY = (Select-String -Path ".env" -Pattern "EXPO_PUBLIC_SUPABASE_KEY=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
node ../get-token.mjs

# Use the token
$token = "paste_token_here"

curl -X POST https://ever-reach-be.vercel.app/api/v1/contacts `
  -H "Content-Type: application/json" `
  --oauth2-bearer "$SERVICE_API_TOKEN" `
  -d '{"display_name":"Test","phones":["+1234567890"]}'
```

**Expected:** `201 Created` with contact JSON

---

## 🐛 Common Issues

### **404 Not Found**
- ❌ Wrong endpoint path
- ❌ Backend not deployed
- ❌ Using wrong base URL
- ✅ **Solution:** Check EXPO_PUBLIC_API_URL in .env

### **401 Unauthorized**
- ❌ No auth token
- ❌ Invalid/expired token
- ❌ Wrong token format
- ✅ **Solution:** Re-login to app, check Supabase session

### **422 Validation Error**
- ❌ Missing display_name
- ❌ Missing both phones AND emails
- ✅ **Solution:** Ensure contact has at least one phone or email

### **500 Server Error**
- ❌ Backend runtime error
- ❌ Database issue
- ✅ **Solution:** Check Vercel logs, check backend-vercel branch

---

## 📋 Key Files

| File | Purpose |
|------|---------|
| `lib/api.ts` | Central API fetch with logging |
| `repos/SupabaseContactsRepo.ts` | Contact CRUD operations |
| `.env` | Backend URL configuration |
| `lib/supabase.ts` | Supabase auth (token provider) |

---

## 🎯 Expected Flow

1. **User selects contact** → Extracts name, phones, emails
2. **Calls `SupabaseContactsRepo.upsert()`** → Maps to backend schema
3. **Calls `apiFetch('/api/v1/contacts', ...)`** → Adds base URL + auth
4. **Logs request** → Shows full URL, headers, body
5. **Makes network request** → POST to backend
6. **Logs response** → Shows status, body
7. **Returns contact** → Success!

---

## 🚀 Test Status

- ✅ Backend validation working (accepts phone OR email)
- ✅ Automated tests passing (10/10)
- ✅ Endpoint exists and responds
- ✅ Frontend logging comprehensive
- ⏳ **Next:** Test in actual app with real contact import

---

**Last Updated:** 2025-09-30  
**Backend:** `https://ever-reach-be.vercel.app`  
**Branch:** `main` (frontend), `feat/backend-vercel-only-clean` (backend)
