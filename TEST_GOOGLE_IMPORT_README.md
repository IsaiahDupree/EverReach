# Google Contacts Import Testing

## Quick Test (Non-Interactive)
```bash
node test-google-import.mjs
```

This will:
1. ✅ Authenticate
2. ✅ Check provider health
3. ✅ Start import and get OAuth URL
4. ✅ List recent import jobs
5. 🔗 Display OAuth URL for you to complete manually

## Full End-to-End Test (Interactive)
```bash
node test-google-import.mjs --interactive
```

This will:
1. ✅ Authenticate
2. ✅ Check provider health  
3. ✅ Start import and get OAuth URL
4. ✅ List recent import jobs
5. ⏳ **Wait for you to complete OAuth in browser**
6. ⏳ **Poll until import completes**
7. ✅ **Verify contact was created in database**

### Interactive Mode Steps:
1. Run the command above
2. Copy the OAuth URL from the console
3. Open it in your browser
4. Sign in with Google and authorize
5. After being redirected back, press ENTER in the terminal
6. The script will poll for completion and verify the contact was saved

## What We Fixed

**Problem:** Contacts were being "imported" but not actually saved to the database.

**Root Cause:** 
- Database trigger `auto_set_contact_org_id()` called `auth.uid()`
- When using service role key (no user context), `auth.uid()` returns NULL
- This violated the NOT NULL constraint on `user_orgs.user_id`

**Solution:**
1. ✅ Look up user's `org_id` from `user_orgs` table
2. ✅ Include `org_id` when inserting contacts
3. ✅ Add proper error handling and logging

## Verification

After a successful import, you can verify in:

### Frontend
- Go to contacts list
- The new contact should appear

### Database (Supabase)
```sql
SELECT 
  c.id,
  c.display_name,
  c.emails,
  c.org_id,
  c.created_at
FROM imported_contacts ic
JOIN contacts c ON c.id = ic.contact_id
WHERE ic.import_job_id = 'YOUR_JOB_ID_HERE';
```

### API
```bash
curl https://ever-reach-be.vercel.app/api/v1/contacts/import/status/YOUR_JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Recent Test Results

**Job ID:** `b7fdcedc-b59a-4f08-be08-7bc9f056dc85`
- ✅ Status: completed
- ✅ Imported: 1 contact
- ✅ Contact: Sarah Ashley (sashleyblogs@gmail.com)
- ✅ Contact ID: f5bc9981-daf8-4798-9ff1-788d6799dee1
- ✅ org_id: ea27c9d6-92e0-49c4-9e34-0e5b95f83611 ✨ (properly set!)

## Files Changed

- `backend-vercel/lib/imports/runImportJob.ts` - Added org_id lookup and error handling
- `backend-vercel/__tests__/api/contact-import.test.ts` - API endpoint tests
- `backend-vercel/__tests__/lib/import-job.test.ts` - Unit tests for import job
- `test-google-import.mjs` - End-to-end test script (this one!)
