# Deploy Contact Import Cron - Quick Guide

**10-minute deployment checklist**

---

## ✅ Pre-Deployment Checklist

- [ ] Read [CONTACT_IMPORT_CRON_SYSTEM.md](./CONTACT_IMPORT_CRON_SYSTEM.md) (full system docs)
- [ ] Verify `CRON_SECRET` is set in Vercel
- [ ] Confirm current branch is up to date

---

## 🚀 Deployment Steps

### 1. Create Cron Route (5 min)

Create `app/api/cron/process-imports/route.ts`:

**Key features:**
- Auth via `x-vercel-cron` header or `CRON_SECRET`
- Atomic job claiming (prevents double-processing)
- Process up to 2 jobs per run
- Mark failed jobs with error messages

**Code:** See [CONTACT_IMPORT_CRON_SYSTEM.md](./CONTACT_IMPORT_CRON_SYSTEM.md#1-cron-route-apicronprocess-imports)

---

### 2. Extract Shared Logic (3 min)

Create `lib/imports/runImportJob.ts`:

**Exports:**
```typescript
export async function runImportJob(
  jobId: string,
  providerName: ImportProvider,
  accessToken: string
): Promise<void>
```

**Used by:**
- Cron route (for reliable processing)
- Callback route (optional, for very small imports)

**Code:** See [CONTACT_IMPORT_CRON_SYSTEM.md](./CONTACT_IMPORT_CRON_SYSTEM.md#2-shared-processing-logic-libimportsrunimportjobts)

---

### 3. Update Vercel Config (1 min)

Add to `vercel.json`:

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

---

### 4. Deploy to Vercel (2 min)

```bash
# Commit changes
git add .
git commit -m "feat: add import cron processor"

# Push and deploy
git push origin feat/dev-dashboard
vercel --prod
```

**Expected output:**
```
✅  Production: https://ever-reach-be.vercel.app [2s]
```

---

## ✅ Post-Deployment Verification

### 1. Check Cron Schedule (30 sec)

Visit Vercel Dashboard:
- Project → Settings → Cron Jobs
- Should show: `/api/cron/process-imports` scheduled every minute

---

### 2. Manual Test (1 min)

```bash
# Get CRON_SECRET from Vercel
CRON_SECRET="your-secret-here"

# Trigger manually
curl "https://ever-reach-be.vercel.app/api/cron/process-imports?key=$CRON_SECRET"
```

**Expected response:**
```json
{
  "message": "No pending jobs",
  "processed": 0,
  "failed": 0
}
```

---

### 3. Test with Real Import (2 min)

1. **Start import** in the app (Settings → Imports → Google)
2. **Check status** via polling:
   ```bash
   # Replace JOB_ID with your job ID
   curl "https://ever-reach-be.vercel.app/api/v1/contacts/import/status/JOB_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. **Wait 60 seconds** for cron to pick it up
4. **Verify completion**:
   ```json
   {
     "status": "completed",
     "total_contacts": 91,
     "imported_contacts": 1,
     "skipped_contacts": 3
   }
   ```

---

### 4. Monitor Logs (ongoing)

```bash
# Watch cron execution
vercel logs --follow

# Look for:
# [Import Cron] Starting job processor...
# [Import Cron] Found 1 pending jobs
# [Import Cron] ✅ Job abc-123 completed
```

---

## 🐛 Troubleshooting

### Cron Not Running

**Check:**
```bash
# Verify cron schedule exists
vercel env ls
vercel crons ls
```

**Fix:** Redeploy with `vercel --prod`

---

### Jobs Still Stuck

**Check database:**
```sql
SELECT id, status, started_at, total_contacts
FROM contact_import_jobs
WHERE status = 'fetching'
  AND started_at < now() - interval '2 minutes';
```

**Fix stuck job:**
```sql
-- Reset to allow retry
UPDATE contact_import_jobs
SET status = 'fetching'
WHERE id = 'JOB_ID';
```

---

### Cron Timing Out

**Symptoms:** Jobs fail with timeout errors

**Causes:**
- Too many contacts (> 500)
- Slow network

**Fix:** Reduce batch size in cron route:
```typescript
.limit(1)  // Process 1 job at a time instead of 2
```

---

## 📊 Success Metrics

After 24 hours, check:

```sql
-- Import success rate (should be > 95%)
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM contact_import_jobs
WHERE started_at > now() - interval '24 hours';

-- Average completion time (should be < 90 seconds)
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM contact_import_jobs
WHERE status = 'completed'
  AND started_at > now() - interval '24 hours';

-- Check for stuck jobs (should be 0)
SELECT COUNT(*)
FROM contact_import_jobs
WHERE status IN ('fetching', 'processing')
  AND started_at < now() - interval '5 minutes';
```

---

## ✅ Deployment Complete Checklist

After deployment:

- [ ] Cron schedule visible in Vercel dashboard
- [ ] Manual test returns success
- [ ] Real import completes within 60-90 seconds
- [ ] Status transitions: `fetching` → `processing` → `completed`
- [ ] Accurate counts: `total_contacts`, `imported_contacts`, `skipped_contacts`
- [ ] No stuck jobs in database
- [ ] Logs show successful cron executions

---

## 📞 Support

**Issues?**
1. Check [CONTACT_IMPORT_CRON_SYSTEM.md](./CONTACT_IMPORT_CRON_SYSTEM.md#-troubleshooting)
2. Review Vercel logs: `vercel logs --follow`
3. Check database for stuck jobs

**Questions?**
- Review full system docs: [CONTACT_IMPORT_CRON_SYSTEM.md](./CONTACT_IMPORT_CRON_SYSTEM.md)

---

**Estimated Deployment Time:** 10 minutes  
**Risk Level:** Low (no breaking changes)  
**Rollback:** Simply remove cron from `vercel.json` and redeploy  
**Last Updated:** 2025-11-03
