# Contact Photo Download & Re-hosting - Deployment Guide

**Deploy the contact photo download system to automatically re-host imported contact photos**

**Status**: ✅ Ready for Deployment  
**Est. Time**: 15-20 minutes  
**Last Updated**: November 7, 2025

---

## 📋 Overview

This system automatically downloads and re-hosts contact photos from external URLs (Google, Microsoft, etc.) to your Supabase storage.

**What's Included:**
- ✅ Database migration (`contact_photo_jobs` table)
- ✅ Photo optimization utilities (`lib/photos.ts`)
- ✅ Cron worker (`/api/cron/process-contact-photos`)
- ✅ Import integration (auto-queue photos)
- ✅ Cron job configuration

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

**Option A: Via Supabase SQL Editor (Recommended)**

1. Open Supabase Dashboard → SQL Editor
2. Copy the migration file: `migrations/contact_photo_jobs.sql`
3. Paste and execute
4. Verify table created:

```sql
SELECT COUNT(*) FROM contact_photo_jobs;
-- Should return 0 (empty table)

SELECT * FROM pg_proc WHERE proname = 'queue_contact_photo_download';
-- Should return 1 row (function exists)
```

**Option B: Via Supabase CLI**

```bash
# From backend-vercel directory
supabase db push --file migrations/contact_photo_jobs.sql
```

---

### Step 2: Verify Environment Variables

Ensure these are set in Vercel:

```bash
# Required (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Cron auth (should already be set)
CRON_SECRET=your_secret_here

# Optional tuning
PHOTO_BATCH_SIZE=10  # Default: 10 photos per cron run
```

---

### Step 3: Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: Add contact photo download and re-hosting system"

# Push to deploy branch
git push origin feat/dev-dashboard

# Or trigger deploy hook
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_QmaX0Q41OWo4konrSFNWoSoNCRHp/rKPcJJl3Ue
```

---

### Step 4: Verify Deployment

**4.1 Check Cron Job Registered**

Visit: https://vercel.com/your-team/your-project/settings/crons

Should see:
- ✅ `/api/cron/process-contact-photos` - Every 5 minutes

**4.2 Manually Trigger Cron (Test)**

```bash
curl -X GET "https://ever-reach-be.vercel.app/api/cron/process-contact-photos" \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response (if no jobs):
{
  "processed": 0,
  "message": "No pending jobs",
  "duration_ms": 45
}
```

---

### Step 5: Test End-to-End

**5.1 Import a Contact with Photo**

Use the frontend to import contacts from Google/Microsoft that have profile photos.

**5.2 Check Job Queue**

```sql
-- In Supabase SQL Editor
SELECT 
  id,
  contact_id,
  external_url,
  status,
  retry_count,
  created_at
FROM contact_photo_jobs
ORDER BY created_at DESC
LIMIT 5;
```

Should see jobs with `status = 'pending'`.

**5.3 Wait for Cron (or trigger manually)**

The cron runs every 5 minutes automatically. Or trigger manually:

```bash
curl -X GET "https://ever-reach-be.vercel.app/api/cron/process-contact-photos" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**5.4 Check Job Completed**

```sql
SELECT 
  id,
  status,
  storage_path,
  completed_at,
  error_message
FROM contact_photo_jobs
WHERE status IN ('completed', 'failed')
ORDER BY completed_at DESC
LIMIT 5;
```

**5.5 Verify Photo in Storage**

1. Open Supabase Storage → `attachments` bucket
2. Navigate to `contacts/{contact_id}/avatar.webp`
3. Should see optimized 400x400 WebP image

**5.6 Verify Contact Updated**

```sql
SELECT id, display_name, avatar_url
FROM contacts
WHERE id = 'your_contact_id';
```

`avatar_url` should now be: `contacts/{contact_id}/avatar.webp` (not external URL)

---

## 📊 Monitoring

### Check Job Stats

```sql
-- Get stats by status
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM contact_photo_jobs
GROUP BY status;
```

### Check Failed Jobs

```sql
-- Find failed jobs with errors
SELECT 
  id,
  contact_id,
  external_url,
  error_message,
  retry_count,
  created_at
FROM contact_photo_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Recent Activity

```sql
-- Last 24 hours of activity
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  status,
  COUNT(*) as count
FROM contact_photo_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), status
ORDER BY hour DESC;
```

---

## 🔧 Troubleshooting

### Issue: Photos Not Being Queued

**Check:**
1. Does `import_preview_contacts` table have `photo_url` field?
2. Are photos being imported with URLs?

```sql
-- Check if preview contacts have photos
SELECT 
  display_name,
  photo_url,
  job_id
FROM import_preview_contacts
WHERE photo_url IS NOT NULL
LIMIT 5;
```

**Fix:** Ensure Google/Microsoft import maps photo URLs to `photo_url` field.

---

### Issue: Download Failures

**Common Errors:**
- `Download timeout after 30 seconds` → External URL too slow
- `Invalid content type` → URL not pointing to image
- `Upload failed` → Supabase storage issue

**Check logs:**
```bash
vercel logs https://ever-reach-be.vercel.app/api/cron/process-contact-photos
```

**Retry failed jobs:**
```sql
-- Reset failed jobs to pending (will retry)
UPDATE contact_photo_jobs
SET 
  status = 'pending',
  retry_count = 0,
  error_message = NULL
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

### Issue: Cron Not Running

**Check:**
1. Cron job registered in Vercel dashboard
2. `CRON_SECRET` env var set
3. Check Vercel cron logs

```bash
# Manual trigger to test
curl -X GET "https://ever-reach-be.vercel.app/api/cron/process-contact-photos" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v
```

---

## 🎯 Performance Tuning

### Adjust Batch Size

```bash
# In Vercel env vars
PHOTO_BATCH_SIZE=20  # Process 20 photos per run (default: 10)
```

**Recommendations:**
- **Light usage**: 10-20 photos/run
- **Heavy usage**: 30-50 photos/run
- **Max**: 50 (to stay under 60s timeout)

### Storage Optimization

Photos are automatically optimized to:
- **Size**: 400x400px (perfect for avatars)
- **Format**: WebP (30-70% smaller than JPEG)
- **Quality**: 80% (good balance)
- **Result**: ~20-50KB per photo (vs 200-500KB original)

---

## 📈 Expected Results

### Storage Usage

**Estimate for 1,000 contacts with photos:**
- Original (external URLs): 0 MB (free, but unreliable)
- Re-hosted (WebP, optimized): ~30 MB
- Supabase Free Tier: 1 GB (plenty of space!)

### Processing Speed

- **Download + optimize**: ~1-3 seconds per photo
- **Batch of 10**: ~10-30 seconds
- **Cron frequency**: Every 5 minutes
- **Throughput**: ~120-300 photos/hour

---

## ✅ Success Criteria

After deployment, you should see:

- ✅ `contact_photo_jobs` table exists in Supabase
- ✅ Cron job running every 5 minutes in Vercel
- ✅ New imports automatically queue photo downloads
- ✅ Photos being downloaded and stored in `attachments/contacts/` bucket
- ✅ Contact `avatar_url` updated from external URL to storage path
- ✅ Frontend displays photos (works with both external and storage URLs)

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- 1. Stop queueing new jobs (disable in import logic)
-- No code change needed, just don't import new contacts

-- 2. Clear pending jobs
UPDATE contact_photo_jobs
SET status = 'failed', error_message = 'Manual rollback'
WHERE status = 'pending';

-- 3. Keep external URLs on contacts
-- (contacts.avatar_url still works with external URLs)

-- 4. Optionally drop table
DROP TABLE IF EXISTS contact_photo_jobs CASCADE;
DROP FUNCTION IF EXISTS queue_contact_photo_download CASCADE;
```

---

## 📚 Related Documentation

- [Photo Import Enhancement Guide](./CONTACT_PHOTO_IMPORT_ENHANCEMENT.md)
- [Contact Avatars Frontend Guide](./CONTACT_AVATARS_FRONTEND_GUIDE.md)
- [Profile Pictures Guide](./PROFILE_PICTURES_GUIDE.md)
- [Google Contacts Import API](./GOOGLE_CONTACTS_IMPORT_API.md)

---

## 🎉 Post-Deployment

### Monitor First 24 Hours

1. Check job success rate (should be >95%)
2. Monitor Vercel cron logs for errors
3. Verify storage usage in Supabase dashboard
4. Test importing contacts with photos

### Backfill Existing Contacts (Optional)

```sql
-- Queue downloads for existing contacts with external URLs
INSERT INTO contact_photo_jobs (contact_id, external_url, status)
SELECT 
  id,
  avatar_url,
  'pending'
FROM contacts
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE 'http%'
  AND id NOT IN (SELECT contact_id FROM contact_photo_jobs)
LIMIT 100; -- Start with 100 as a test

-- Check progress
SELECT COUNT(*) FROM contact_photo_jobs WHERE status = 'completed';
```

---

**Deployed by**: Backend Team  
**Status**: ✅ Production Ready  
**Cron Jobs**: 19/20 used (still under limit!)
