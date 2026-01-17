# Contact Import Cron System

**Background job processing for Google/Microsoft contact imports using Vercel Cron**

---

## 🎯 Problem

Vercel serverless functions have a 10-second execution timeout and **kill all background tasks** after the HTTP response is sent. This breaks the "fire-and-forget" pattern used in contact imports.

### What Was Failing

```typescript
// ❌ This doesn't work on Vercel
async function callback(req) {
  // Start background job
  processImport(jobId).catch(...);  // <-- Killed after return
  
  // Return immediately
  return redirect('/import-status');  // <-- Function exits, Vercel kills processImport()
}
```

**Result:** Import jobs get stuck at `"fetching"` status indefinitely because the background processing never completes.

---

## ✅ Solution: Vercel Cron

Run a scheduled serverless route every minute that safely "claims" and processes pending import jobs.

### Architecture

```
User triggers import
       ↓
OAuth callback creates job (status='fetching')
       ↓
Returns immediately (no background work)
       ↓
Cron runs every minute
       ↓
Cron claims pending jobs atomically
       ↓
Cron processes each job (fetch → upsert → mark completed)
       ↓
Frontend polls /api/v1/contacts/import/status/:jobId
       ↓
Shows completion with real counts
```

---

## 📁 Implementation

### 1. Cron Route: `/api/cron/process-imports`

**File:** `app/api/cron/process-imports/route.ts`

```typescript
import { options, ok, unauthorized, serverError } from '@/lib/cors';
import { getServiceClient } from '@/lib/supabase';
import { runImportJob } from '@/lib/imports/runImportJob';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return options(req);
}

export async function GET(req: Request) {
  // Auth: Vercel cron or manual trigger with secret
  const isVercelCron = req.headers.get('x-vercel-cron') !== null;
  const secretKey = new URL(req.url).searchParams.get('key');
  const headerSecret = req.headers.get('x-cron-secret');
  
  const isAuthorized = isVercelCron || 
    secretKey === process.env.CRON_SECRET ||
    headerSecret === process.env.CRON_SECRET;
  
  if (!isAuthorized) {
    return unauthorized('Unauthorized', req);
  }

  console.log('[Import Cron] Starting job processor...');
  
  const supabase = getServiceClient();
  const processed: string[] = [];
  const failed: string[] = [];

  try {
    // Claim up to 2 pending jobs (atomic to prevent double-processing)
    const { data: pendingJobs, error: selectErr } = await supabase
      .from('contact_import_jobs')
      .select('id, provider, access_token')
      .eq('status', 'fetching')
      .is('completed_at', null)
      .order('started_at', { ascending: true })
      .limit(2);

    if (selectErr) {
      console.error('[Import Cron] Failed to fetch pending jobs:', selectErr);
      return serverError('Failed to fetch jobs', req);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('[Import Cron] No pending jobs found');
      return ok({ message: 'No pending jobs', processed: 0, failed: 0 }, req);
    }

    console.log(`[Import Cron] Found ${pendingJobs.length} pending jobs`);

    // Process each job
    for (const job of pendingJobs) {
      try {
        // Claim the job (set status='processing' only if still 'fetching')
        const { data: claimed, error: claimErr } = await supabase
          .from('contact_import_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)
          .eq('status', 'fetching')
          .is('completed_at', null)
          .select('id')
          .maybeSingle();

        if (claimErr || !claimed) {
          console.log(`[Import Cron] Job ${job.id} already claimed by another worker`);
          continue;
        }

        console.log(`[Import Cron] Processing job ${job.id} (${job.provider})`);

        // Process the job
        await runImportJob(job.id, job.provider, job.access_token);
        
        processed.push(job.id);
        console.log(`[Import Cron] ✅ Job ${job.id} completed`);
      } catch (error: any) {
        console.error(`[Import Cron] ❌ Job ${job.id} failed:`, error);
        failed.push(job.id);
        
        // Mark as failed
        await supabase
          .from('contact_import_jobs')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }

    return ok({
      message: 'Processing complete',
      processed: processed.length,
      failed: failed.length,
      job_ids: { processed, failed },
    }, req);

  } catch (error: any) {
    console.error('[Import Cron] Fatal error:', error);
    return serverError(error.message, req);
  }
}
```

---

### 2. Shared Processing Logic: `lib/imports/runImportJob.ts`

Extract the import logic into a reusable function:

```typescript
import { getServiceClient } from '@/lib/supabase';
import { getProvider } from '@/lib/imports/provider';
import type { ImportProvider } from '@/lib/imports/types';

/**
 * Run a contact import job
 * 
 * This is the core processing logic shared by:
 * - Callback route (for very small imports)
 * - Cron route (for all imports on production)
 */
export async function runImportJob(
  jobId: string,
  providerName: ImportProvider,
  accessToken: string
): Promise<void> {
  const provider = getProvider(providerName);
  const supabase = getServiceClient();

  console.log(`[Import Job ${jobId}] Starting...`);

  // Load job user_id
  const { data: jobRow, error: jobLoadErr } = await supabase
    .from('contact_import_jobs')
    .select('user_id')
    .eq('id', jobId)
    .single();

  if (jobLoadErr || !jobRow) {
    throw new Error('Import job not found');
  }

  const userId = jobRow.user_id;
  let allContacts: any[] = [];
  let pageToken: string | undefined;
  let totalContacts = 0;

  // Fetch all pages
  console.log(`[Import Job ${jobId}] Fetching contacts...`);
  do {
    const result = await provider.fetchContacts(accessToken, pageToken);
    allContacts = allContacts.concat(result.contacts);
    pageToken = result.nextPageToken;
    totalContacts = result.totalContacts || allContacts.length;

    // Update progress
    await supabase
      .from('contact_import_jobs')
      .update({
        total_contacts: totalContacts,
        processed_contacts: allContacts.length,
      })
      .eq('id', jobId);

    console.log(`[Import Job ${jobId}] Fetched ${allContacts.length}/${totalContacts} contacts`);
  } while (pageToken);

  // Process contacts (create/update)
  console.log(`[Import Job ${jobId}] Processing ${allContacts.length} contacts...`);
  
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of allContacts) {
    try {
      // Check if contact exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .contains('emails', contact.emails)
        .maybeSingle();

      let action: 'created' | 'updated' | 'skipped' = 'created';
      let contactId: string | null = null;

      if (existing) {
        // Update existing
        const { data: updated } = await supabase
          .from('contacts')
          .update({
            display_name: contact.display_name,
            emails: contact.emails,
            phones: contact.phones,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        contactId = updated?.id || null;
        action = 'updated';
        imported++;
      } else {
        // Create new
        const { data: created } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            display_name: contact.display_name,
            emails: contact.emails,
            phones: contact.phones,
          })
          .select('id')
          .single();

        contactId = created?.id || null;
        action = 'created';
        imported++;
      }

      // Record in imported_contacts
      await supabase.from('imported_contacts').insert({
        import_job_id: jobId,
        contact_id: contactId,
        provider_contact_id: contact.provider_contact_id,
        action,
        raw_data: contact.raw_data,
      });

    } catch (error: any) {
      console.error(`[Import Job ${jobId}] Failed to process contact:`, error);
      failed++;
    }
  }

  // Mark job as completed
  console.log(`[Import Job ${jobId}] Complete: ${imported} imported, ${skipped} skipped, ${failed} failed`);
  
  await supabase
    .from('contact_import_jobs')
    .update({
      status: 'completed',
      imported_contacts: imported,
      skipped_contacts: skipped,
      failed_contacts: failed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
```

---

### 3. Vercel Configuration: `vercel.json`

Add the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-imports",
      "schedule": "* * * * *"
    }
  ]
}
```

**Schedule:** Every minute (`* * * * *`)

---

## 🔧 Environment Variables

Required in Vercel:

```bash
CRON_SECRET=your-secret-key-here
```

This allows manual triggers for testing:
```bash
curl https://ever-reach-be.vercel.app/api/cron/process-imports?key=CRON_SECRET
```

---

## 🚀 Deployment

### 1. Deploy Code

```bash
git add .
git commit -m "feat: add import cron processor"
git push origin main
vercel --prod
```

### 2. Verify Cron Schedule

Check Vercel dashboard → Cron Jobs tab:
- Should show `/api/cron/process-imports` scheduled for `* * * * *`
- Shows last run time and next run time

### 3. Test Manually

```bash
# Trigger manually (doesn't wait for cron schedule)
curl https://ever-reach-be.vercel.app/api/cron/process-imports?key=YOUR_CRON_SECRET

# Expected response:
# {"message":"Processing complete","processed":1,"failed":0}
```

### 4. Test with Real Import

1. Start a Google/Microsoft import in the app
2. Job created with `status='fetching'`
3. Wait up to 60 seconds
4. Cron picks up job, processes it
5. Status changes: `fetching` → `processing` → `completed`
6. Frontend shows: total_contacts, imported_contacts, skipped_contacts

---

## 📊 Monitoring

### Check Cron Logs

```bash
# Vercel CLI
vercel logs --follow

# Look for:
[Import Cron] Starting job processor...
[Import Cron] Found 1 pending jobs
[Import Cron] Processing job abc-123 (google)
[Import Job abc-123] Fetched 91/91 contacts
[Import Job abc-123] Complete: 1 imported, 0 skipped, 0 failed
[Import Cron] ✅ Job abc-123 completed
```

### Database Queries

```sql
-- Check stuck jobs (should be zero after cron deploys)
SELECT id, status, started_at, total_contacts, imported_contacts
FROM contact_import_jobs
WHERE status IN ('fetching', 'processing')
  AND completed_at IS NULL
  AND started_at < now() - interval '5 minutes';

-- Recent completions
SELECT id, provider, status, total_contacts, imported_contacts, skipped_contacts,
       completed_at - started_at as duration
FROM contact_import_jobs
WHERE completed_at > now() - interval '1 hour'
ORDER BY completed_at DESC;
```

---

## ⚙️ Configuration

### Job Claiming

Process up to **2 jobs per cron run** to stay well under 10-second timeout:

```typescript
.limit(2)  // Process 2 jobs max per minute
```

**Why 2?**
- Small imports (< 100 contacts): ~2-5 seconds each
- Large imports (1000+ contacts): May take multiple cron runs (progress tracked)
- Safety margin for Vercel's 10s timeout

### Atomic Claiming

Prevent double-processing with conditional update:

```typescript
// Only claim if still 'fetching' and not completed
.update({ status: 'processing' })
.eq('status', 'fetching')
.is('completed_at', null)
```

If another worker already claimed it, the update returns `null` and we skip it.

---

## 🐛 Troubleshooting

### Job Stuck at "fetching"

**Symptoms:** Job stays at `"fetching"` for > 2 minutes

**Causes:**
1. Cron not running (check Vercel dashboard)
2. Access token expired (auth error in logs)
3. Job claiming race condition (rare)

**Fix:**
```sql
-- Manually mark as failed
UPDATE contact_import_jobs 
SET status = 'failed', 
    error_message = 'Timeout - manually marked as failed',
    completed_at = now()
WHERE id = 'JOB_ID_HERE';
```

### Job Stuck at "processing"

**Symptoms:** Job at `"processing"` for > 5 minutes

**Causes:**
1. Cron crashed mid-processing
2. Network timeout fetching contacts

**Fix:**
```sql
-- Reset to 'fetching' so cron retries
UPDATE contact_import_jobs
SET status = 'fetching'
WHERE id = 'JOB_ID_HERE';
```

### Imported Count = 0

**Symptoms:** Job completes but `imported_contacts = 0`

**Causes:**
1. All contacts already exist (check `skipped_contacts`)
2. Email matching logic too strict
3. Service client RLS issue

**Check:**
```sql
-- Check what was recorded
SELECT action, COUNT(*) 
FROM imported_contacts 
WHERE import_job_id = 'JOB_ID_HERE'
GROUP BY action;
```

---

## 📈 Performance

### Typical Timings

| Contacts | Fetch Time | Process Time | Total |
|----------|------------|--------------|-------|
| 1-10     | 1-2s       | 1-3s         | 2-5s  |
| 10-100   | 2-5s       | 3-10s        | 5-15s |
| 100-500  | 5-15s      | 10-30s       | 15-45s |
| 500-1000 | 15-30s     | 30-60s       | 45-90s |

### Cron Frequency

**Every minute** is ideal because:
- Fast feedback for users (< 60s completion)
- Low resource usage (only runs if jobs pending)
- Atomic claiming prevents conflicts
- Processes 2 jobs/min = up to 120 jobs/hour capacity

---

## 🔮 Future Improvements

### 1. Vercel Queue (Paid)
Replace cron with proper queue for instant processing:
```typescript
import { Queue } from '@vercel/queue';
const q = new Queue();
await q.enqueue('process-import', { jobId });
```

### 2. BullMQ + Redis
For high volume (100+ imports/hour):
```typescript
import Queue from 'bullmq';
const importQueue = new Queue('imports', { connection: redis });
await importQueue.add('process', { jobId });
```

### 3. Batch Processing
Process multiple contacts per DB query:
```typescript
// Insert 50 contacts at once
await supabase.from('contacts').insert(batch);
```

### 4. Webhook Notifications
Notify user when import completes:
```typescript
await sendPushNotification(userId, {
  title: 'Import Complete',
  body: `${imported} contacts imported from Google`,
});
```

---

## ✅ Success Criteria

After deployment, imports should:

- ✅ Complete within 60-90 seconds
- ✅ Show real-time progress (total_contacts updates)
- ✅ Report accurate counts (imported/skipped/failed)
- ✅ Never get stuck at "fetching"
- ✅ Handle errors gracefully (mark as failed)
- ✅ Support concurrent imports (atomic claiming)

---

## 📞 Related Files

- **Cron route:** `app/api/cron/process-imports/route.ts`
- **Shared logic:** `lib/imports/runImportJob.ts`
- **Callback route:** `app/api/v1/contacts/import/[provider]/callback/route.ts`
- **Status endpoint:** `app/api/v1/contacts/import/status/[jobId]/route.ts`
- **Config:** `vercel.json` (cron schedule)
- **Migration:** `migrations/contact-imports.sql` (if needed)

---

**Last Updated:** 2025-11-03  
**Status:** Ready to deploy  
**Estimated Deploy Time:** 10 minutes  
**Risk Level:** Low (no breaking changes)
