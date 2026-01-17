# Quick Deploy Guide: AI Feature Bucketing

## ⚡ 5-Step Deployment

### Step 1: Enable pgvector in Supabase (2 min)

**CRITICAL:** Must be done first!

1. Go to https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new
2. Run this SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Verify:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return 1 row
```

---

### Step 2: Run Database Migrations (5 min)

#### Option A: Supabase SQL Editor (Recommended)

1. Go to https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

2. Copy and paste contents of:
   - `backend-vercel/migrations/feature-requests-enhanced.sql`
   - Click "Run"

3. Then copy and paste:
   - `backend-vercel/migrations/feature-buckets-ai.sql`
   - Click "Run"

#### Option B: psql Command Line

```bash
# Connect
psql postgresql://postgres:[YOUR_PASSWORD]@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres

# Run migrations
\i backend-vercel/migrations/feature-requests-enhanced.sql
\i backend-vercel/migrations/feature-buckets-ai.sql

# Verify
\dt feature*
```

**Expected tables:**
- `feature_buckets`
- `feature_requests`
- `feature_request_embeddings`
- `feature_votes`
- `feature_activity`
- `feature_user_stats`
- `feature_changelog`

---

### Step 3: Set Vercel Environment Variables (2 min)

Go to: https://vercel.com/your-team/backend-vercel/settings/environment-variables

Add/verify these variables:

```bash
OPENAI_API_KEY=sk-proj-...          # Your OpenAI key (for embeddings)
CRON_SECRET=your-secret-here        # Random string (e.g., use uuidgen)
NEXT_PUBLIC_BACKEND_BASE=https://ever-reach-be.vercel.app
SUPABASE_JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

### Step 4: Deploy Backend (3 min)

```bash
cd backend-vercel

# Make sure you're on the right branch
git checkout feat/backend-vercel-only-clean

# Add all new files
git add .

# Commit
git commit -m "Add AI feature bucketing system with pgvector clustering"

# Push (triggers auto-deploy)
git push origin feat/backend-vercel-only-clean
```

**Wait for Vercel to deploy** (~2-3 minutes)

Monitor at: https://vercel.com/your-team/backend-vercel/deployments

---

### Step 5: Test the System (5 min)

#### Test 1: Health Check

```bash
curl https://ever-reach-be.vercel.app/api/health
# Should return: {"status":"ok"}
```

#### Test 2: Create a Feature Request

```bash
# Get your auth token from browser DevTools
TOKEN="your-supabase-access-token"

curl -X POST https://ever-reach-be.vercel.app/api/v1/feature-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "feature",
    "title": "Add dark mode",
    "description": "I want a dark theme option for the app"
  }'

# Should return:
# {
#   "success": true,
#   "data": { "id": "...", ... },
#   "message": "Feature request submitted successfully"
# }
```

#### Test 3: Wait for Embedding Processing

Wait 5-10 seconds for the embedding to process...

```bash
# Check if request was bucketed
curl https://ever-reach-be.vercel.app/api/v1/feature-requests \
  -H "Authorization: Bearer $TOKEN"

# Look for "bucket_id" in the response
```

#### Test 4: View Leaderboard

```bash
curl https://ever-reach-be.vercel.app/api/v1/feature-buckets?sort=hot

# Should return:
# {
#   "success": true,
#   "data": [
#     {
#       "bucket_id": "...",
#       "title": "Theme Customization",  # AI-generated title!
#       "summary": "Users want dark mode options",
#       "votes_count": 0,
#       "request_count": 1,
#       ...
#     }
#   ]
# }
```

#### Test 5: Vote for the Request

```bash
# Get the feature request ID from Test 2
FEATURE_ID="your-feature-id"

curl -X POST https://ever-reach-be.vercel.app/api/v1/feature-requests/$FEATURE_ID/vote \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {
#   "success": true,
#   "data": {
#     "votes_count": 1
#   }
# }
```

---

## ✅ Success Checklist

After deploying, verify:

- [ ] pgvector extension enabled
- [ ] All 7 tables exist
- [ ] Can create feature request
- [ ] Embedding processes automatically
- [ ] Request gets assigned to bucket
- [ ] Bucket appears in leaderboard
- [ ] Can vote for requests
- [ ] Vote count updates
- [ ] Cron job configured in Vercel

---

## 🔍 Troubleshooting

### "Extension vector does not exist"
**Fix:** Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL editor

### "Failed to generate embedding"
**Fix:** Check `OPENAI_API_KEY` is set in Vercel environment variables

### "Bucket not created"
**Fix:** Check backend logs in Vercel dashboard for errors

### "Cron job not running"
**Fix:** 
1. Verify `vercel.json` is in repo root
2. Redeploy: `git push origin feat/backend-vercel-only-clean`
3. Check Vercel dashboard > Cron Jobs tab

### "Similarity search failing"
**Fix:** Make sure IVFFlat index was created:
```sql
-- Run in Supabase SQL editor
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('feature_buckets', 'feature_request_embeddings');
```

---

## 🎯 Next Steps

After successful deployment:

1. **Create 5-10 test requests** to build up the dataset
2. **Watch the AI cluster them** into buckets
3. **Build frontend leaderboard** (see `AI_FEATURE_BUCKETING_COMPLETE.md`)
4. **Add to your app navigation**
5. **Announce to users!** 🎉

---

## 📊 Monitor Performance

### Check Embedding Queue

```bash
curl https://ever-reach-be.vercel.app/api/cron/process-embeddings \
  -H "Authorization: Bearer $CRON_SECRET"

# Returns:
# {
#   "success": true,
#   "results": {
#     "processed": 5,
#     "errors": 0,
#     "skipped": 0
#   }
# }
```

### Check Bucket Stats

```sql
-- Run in Supabase SQL editor
SELECT 
  COUNT(*) as total_buckets,
  SUM(votes_count) as total_votes,
  AVG(request_count) as avg_requests_per_bucket
FROM feature_bucket_rollups;
```

### Check Embedding Coverage

```sql
-- How many requests have embeddings?
SELECT 
  COUNT(*) as total_requests,
  COUNT(e.feature_id) as with_embeddings,
  COUNT(r.bucket_id) as bucketed
FROM feature_requests r
LEFT JOIN feature_request_embeddings e ON e.feature_id = r.id;
```

---

## 🆘 Need Help?

- **Backend Logs:** https://vercel.com/your-team/backend-vercel/logs
- **Database:** https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx
- **Documentation:** See `AI_FEATURE_BUCKETING_COMPLETE.md`

---

**Estimated Total Time:** 15-20 minutes ⚡

Let's ship it! 🚀
