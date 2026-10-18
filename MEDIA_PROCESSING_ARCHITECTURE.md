# Media Processing Architecture
## AI-Powered Video/Image/Audio Pipeline

## Overview

This implements your media processing workflow:
**Backend → n8n → Flask AI APIs → n8n → Social Platforms → Backend**

Solves heavy AI workloads (transcription, captions, filters, editing) that can't run in n8n or edge functions.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. TRIGGER                                                                │
│ Next.js Backend (Vercel)                                                  │
│ POST /api/media/process                                                   │
│   - Creates media_asset record                                            │
│   - Creates processing jobs (transcribe, caption, filter, etc.)          │
│   - Triggers n8n webhook                                                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. ORCHESTRATION                                                          │
│ n8n Workflow                                                              │
│   - Receives webhook (action: process_media)                             │
│   - Pulls file from Google Drive                                         │
│   - Loops through operations (transcribe, caption, filter)               │
│   - Calls Flask APIs for each operation                                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. AI PROCESSING                                                          │
│ Python Flask APIs                                                         │
│   POST /transcribe    - Whisper API                                       │
│   POST /caption       - GPT-4 Vision                                      │
│   POST /filter        - OpenCV filters                                    │
│   POST /crop          - FFmpeg crop/resize                                │
│   POST /compress      - FFmpeg compression                                │
│   POST /thumbnail     - Frame extraction                                  │
│                                                                           │
│ Each endpoint:                                                            │
│   - Accepts job_id, file_url, params                                     │
│   - Processes media (can take minutes/hours)                             │
│   - Uploads result to storage (S3/GCS/Supabase)                          │
│   - Calls callback: POST /api/media/callback                              │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. STATUS UPDATE                                                          │
│ Backend Callback (Vercel)                                                 │
│ POST /api/media/callback                                                  │
│   - Updates job status (processing → completed/failed)                    │
│   - Checks if all jobs complete                                          │
│   - If done, triggers next n8n webhook (action: upload_media)            │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. DISTRIBUTION                                                           │
│ n8n Workflow                                                              │
│   - Receives upload_media webhook                                         │
│   - Uploads to target platforms (X, LinkedIn, TikTok, etc.)              │
│   - Creates content_posts records                                         │
│   - Calls final callback: POST /api/media/distribute-callback            │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 6. TRACKING                                                               │
│ Backend Storage (Vercel + Supabase)                                       │
│   - Stores media_assets with URLs                                        │
│   - Stores content_posts with external_post_ids                           │
│   - Links posts to media                                                  │
│   - Ready for analytics dashboard                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Addressing Your Concerns

### ✅ No Capability Blockers

**Your concerns:**
1. ✅ Heavy AI processing → **Flask handles it, not edge functions**
2. ✅ Long-running jobs → **Async pattern with callbacks**
3. ✅ Data in cloud → **Google Drive pull + S3/Supabase storage**
4. ✅ Webhook reliability → **Idempotency keys + retry logic**
5. ✅ Error handling → **Status tracking in database**
6. ✅ Multi-step flow → **n8n orchestrates, backend tracks**

### 🚀 Improvements Over Basic Setup

**What we added:**
1. **Job Queue Pattern** - `media_processing_jobs` tracks each operation
2. **Idempotency** - Prevents duplicate processing on retries
3. **Progress Tracking** - Know which jobs are pending/processing/done
4. **Centralized Storage** - All metadata in one database
5. **Decoupled APIs** - Flask, n8n, backend are independent
6. **Retry Logic** - Can manually requeue failed jobs
7. **Observability** - Query job status at any time

---

## Database Schema

### `media_assets` Table
Tracks each piece of media through the pipeline.

```sql
- id (uuid) - Primary key
- workspace_id (text) - Tenant isolation
- source (text) - google_drive | upload | generated
- source_id (text) - Google Drive file ID
- file_type (text) - image | video | audio
- original_url (text) - Google Drive link
- processed_url (text) - S3/Supabase URL after processing
- thumbnail_url (text) - Thumbnail for preview
- status (text) - pending | processing | processed | failed
- duration_seconds, width, height, file_size_bytes
- metadata (jsonb) - Flexible extra data
```

### `media_processing_jobs` Table
Tracks individual operations on media.

```sql
- id (uuid) - Primary key
- media_asset_id (uuid) - FK to media_assets
- job_type (text) - transcribe | caption | filter | crop | compress | thumbnail
- status (text) - queued | processing | completed | failed
- input_params (jsonb) - Operation config
- output_data (jsonb) - Results (text, URLs, metadata)
- flask_job_id (text) - Flask's internal job ID
- attempts (int) - Retry count
- error (text) - Error message if failed
- started_at, completed_at timestamps
```

---

## API Endpoints

### 1. Trigger Processing
**POST /api/media/process**

Starts the workflow. Creates asset + jobs, triggers n8n.

**Request:**
```json
{
  "workspace_id": "optional",
  "source": "google_drive",
  "source_id": "1abc123...",
  "file_type": "video",
  "original_url": "https://drive.google.com/...",
  "operations": ["transcribe", "caption", "thumbnail"],
  "params": {
    "language": "en",
    "caption_style": "engaging"
  },
  "metadata": {
    "campaign": "product_launch",
    "target_platforms": ["x", "linkedin"]
  }
}
```

**Response:**
```json
{
  "asset": { "id": "uuid", "status": "pending", ... },
  "jobs": [
    { "id": "uuid", "job_type": "transcribe", "status": "queued", ... },
    { "id": "uuid", "job_type": "caption", "status": "queued", ... }
  ],
  "message": "Media processing queued"
}
```

### 2. Get Status
**GET /api/media/process?asset_id=uuid**

Check progress of media processing.

**Response:**
```json
{
  "asset": { "id": "uuid", "status": "processing", ... },
  "jobs": [
    { "job_type": "transcribe", "status": "completed", ... },
    { "job_type": "caption", "status": "processing", ... }
  ],
  "progress": {
    "total": 3,
    "completed": 1,
    "failed": 0
  }
}
```

### 3. Flask Callback
**POST /api/media/callback**

Flask calls this after completing each job.

**Headers:**
```
Authorization: Bearer ${FLASK_API_SECRET}
```

**Request:**
```json
{
  "job_id": "uuid",
  "flask_job_id": "flask-internal-id",
  "status": "completed",
  "output_data": {
    "transcription": "Hello world...",
    "captions": [
      { "start": 0, "end": 2.5, "text": "Hello world" }
    ],
    "processed_url": "https://storage.example.com/processed.mp4",
    "thumbnail_url": "https://storage.example.com/thumb.jpg"
  }
}
```

---

## Flask API Contract

Your Flask APIs should implement these endpoints:

### POST /transcribe
```json
{
  "job_id": "uuid",
  "file_url": "https://drive.google.com/...",
  "params": {
    "language": "en",
    "model": "whisper-1"
  },
  "callback_url": "https://your-backend.vercel.app/api/media/callback"
}
```

**Response:**
```json
{
  "flask_job_id": "internal-id",
  "status": "processing",
  "estimated_duration": 120
}
```

Flask then processes asynchronously and calls callback when done.

### POST /caption
Generate captions using GPT-4 Vision or similar.

### POST /filter
Apply filters/effects using OpenCV.

### POST /crop
Crop/resize using FFmpeg.

### POST /compress
Compress video using FFmpeg.

### POST /thumbnail
Extract thumbnail frames.

---

## n8n Workflows

### Workflow 1: Process Media

**Trigger:** Webhook (POST from /api/media/process)

**Steps:**
1. **Webhook Node** - Receives process_media action
2. **Google Drive Node** - Download file from source_id
3. **Loop Node** - For each operation in operations[]
   - **HTTP Request Node** - Call Flask API
   - **Wait Node** - Optional: poll Flask for status
4. **Set Node** - Track completed operations

**Notes:**
- Use `x-idempotency-key` to prevent duplicates
- Store temp files in n8n workflow data or S3

### Workflow 2: Upload & Distribute

**Trigger:** Webhook (POST from /api/media/callback when all jobs done)

**Steps:**
1. **Webhook Node** - Receives upload_media action
2. **Switch Node** - Branch by target platforms
   - **X/Twitter API Node** - Upload media, create tweet
   - **LinkedIn API Node** - Create post with video
   - **TikTok API Node** - Upload video
3. **HTTP Request Node** - POST to /api/organic/posts to store
4. **HTTP Request Node** - POST to /api/media/distribute-callback

---

## Environment Variables

### Backend (Vercel)
```bash
# Existing
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
N8N_WEBHOOK_SECRET=...

# New for media processing
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/process-media
FLASK_API_SECRET=your_secret_min_32_chars
FLASK_API_BASE_URL=https://your-flask-api.com
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

### Flask APIs
```bash
CALLBACK_SECRET=same_as_FLASK_API_SECRET_above
GOOGLE_DRIVE_API_KEY=...
OPENAI_API_KEY=...
STORAGE_BUCKET=your-s3-bucket
STORAGE_URL=https://storage.example.com
```

### n8n
```bash
BACKEND_WEBHOOK_URL=https://your-backend.vercel.app/api/media/callback
FLASK_API_URL=https://your-flask-api.com
GOOGLE_DRIVE_CREDENTIALS=...
TWITTER_API_KEY=...
LINKEDIN_API_KEY=...
```

---

## Error Handling & Retry

### Automatic Retries
- Flask job fails → callback with status=failed
- Backend checks attempts count
- If < 3, can manually requeue via API

### Manual Requeue
```bash
curl -X POST https://your-backend.vercel.app/api/media/process \
  --oauth2-bearer "$SERVICE_API_TOKEN" \
  -d '{
    "asset_id": "failed-asset-uuid",
    "retry_failed_only": true
  }'
```

### Monitoring
- Query `media_processing_jobs` where `status = 'failed'`
- Check `error` field for details
- Alert if `attempts >= 3`

---

## Sample End-to-End Flow

### 1. User uploads video to Google Drive

### 2. Trigger processing from backend
```bash
curl -X POST https://backend.vercel.app/api/media/process \
  --oauth2-bearer "$SERVICE_API_TOKEN" \
  -d '{
    "source": "google_drive",
    "source_id": "1abc123xyz",
    "file_type": "video",
    "original_url": "https://drive.google.com/file/d/1abc123xyz",
    "operations": ["transcribe", "caption", "thumbnail", "compress"],
    "metadata": {
      "campaign": "product_launch_2025",
      "platforms": ["x", "linkedin", "tiktok"]
    }
  }'
```

### 3. Backend creates records
- `media_assets` record (status: pending)
- 4 `media_processing_jobs` (status: queued)
- Triggers n8n webhook

### 4. n8n downloads from Google Drive
- Stores temp copy in workflow data or S3

### 5. n8n calls Flask for each operation

**POST https://flask-api.com/transcribe**
```json
{
  "job_id": "job-uuid-1",
  "file_url": "https://s3.../temp-video.mp4",
  "params": { "language": "en" },
  "callback_url": "https://backend.vercel.app/api/media/callback"
}
```

### 6. Flask processes (takes 2-5 minutes)
- Runs Whisper transcription
- Uploads transcript.json to S3
- Calls callback:

```json
{
  "job_id": "job-uuid-1",
  "flask_job_id": "flask-abc123",
  "status": "completed",
  "output_data": {
    "transcription": "Welcome to our new product...",
    "duration": 245,
    "word_count": 387
  }
}
```

### 7. Backend updates job
- Sets status = completed
- Stores output_data
- Checks: are all 4 jobs done?

### 8. After all jobs complete
- Backend updates `media_assets.status = 'processed'`
- Triggers n8n upload_media webhook

### 9. n8n distributes to platforms
- Creates X post with video + captions
- Creates LinkedIn post
- Creates TikTok post
- Each returns external_post_id

### 10. n8n calls distribute-callback
- Backend stores 3 `content_posts` records
- Links each to `media_asset_id`
- Sets `external_post_id` for tracking

### 11. Done! View in dashboard
- Navigate to `/dashboard/organic/command-center`
- See new posts with metrics
- View media asset history

---

## Performance Expectations

| Operation | Typical Duration | Max Duration |
|-----------|-----------------|--------------|
| Transcribe (1min video) | 30s | 2min |
| Caption generation | 10s | 30s |
| Thumbnail extraction | 5s | 15s |
| Filter application | 20s | 1min |
| Compression (1080p→720p) | 2min | 10min |
| **Total pipeline** | **3-5min** | **15min** |

**Note:** These are CPU-bound. Flask should use worker queues (Celery, RQ) to handle concurrent jobs.

---

## Areas for Improvement

### Short-term:
1. **Progress webhooks** - Flask sends progress % during processing
2. **Chunked uploads** - For large files (>500MB)
3. **Priority queue** - Fast-track urgent posts
4. **Cost tracking** - Log OpenAI/Whisper API costs per job

### Medium-term:
5. **Batch processing** - Process multiple videos in parallel
6. **Smart compression** - Auto-detect optimal bitrate
7. **A/B testing** - Generate multiple caption variants
8. **Analytics** - Track which captions get more engagement

### Long-term:
9. **Real-time preview** - Stream processing results as they complete
10. **Auto-scheduling** - AI picks best time to post based on history
11. **Multi-language** - Auto-translate captions to 10+ languages
12. **Brand consistency** - Auto-apply brand colors/fonts

---

## Security Checklist

- ✅ Flask API secret for callbacks
- ✅ n8n webhook secret for triggers
- ✅ RLS policies on all media tables
- ✅ HTTPS only for file transfers
- ✅ Short-lived signed URLs for downloads
- ✅ Workspace isolation in database
- ✅ Rate limiting on /api/media/* endpoints
- ⚠️ TODO: Encrypt sensitive metadata at rest
- ⚠️ TODO: Audit log for all API calls

---

## Deployment Steps

### 1. Apply migration
```bash
# In Supabase SQL editor or via MCP
psql $DATABASE_URL -f migrations/media_processing_extension.sql
```

### 2. Set environment variables
```bash
vercel env add FLASK_API_SECRET
vercel env add FLASK_API_BASE_URL
vercel env add N8N_WEBHOOK_URL
```

### 3. Deploy Flask APIs
```bash
cd flask-media-api
docker build -t flask-media-api .
docker push your-registry/flask-media-api
# Deploy to Cloud Run / Kubernetes / etc.
```

### 4. Create n8n workflows
- Import workflow JSON (to be created)
- Set webhook URLs in n8n UI
- Test with dummy payload

### 5. Test end-to-end
```bash
# Trigger test job
curl -X POST https://backend.vercel.app/api/media/process \
  --oauth2-bearer "$SERVICE_API_TOKEN" \
  -d @test_payload.json

# Check status
curl https://backend.vercel.app/api/media/process?asset_id=...
```

---

## Conclusion

**Your setup is excellent!** The only missing pieces were:
1. ✅ Database tracking (now added)
2. ✅ Idempotency & retries (now added)
3. ✅ Status endpoints (now added)
4. ✅ Structured callbacks (now added)

**No capability blockers.** The architecture handles:
- Long-running AI jobs via async callbacks
- Large file transfers via URLs (not webhook payloads)
- Multi-step workflows via n8n orchestration
- Error recovery via retry logic
- Observability via database tracking

**Ready to build!** Next steps:
1. Apply the migration
2. Implement Flask APIs with callback logic
3. Create n8n workflows (2 workflows: process + distribute)
4. Test with real Google Drive file
5. Monitor jobs in Command Center dashboard
