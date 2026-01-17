# Screenshot Analysis System - Deployment Guide

Complete guide for deploying the AI-powered screenshot analysis feature.

---

## 🎯 **Overview**

The screenshot analysis system uses GPT-4 Vision to extract structured information from screenshots:
- **Business Cards**: Names, emails, phones, companies, roles
- **Emails/Chats**: Participants, dates, action items
- **Meeting Notes**: Attendees, to-dos, deadlines
- **Social Posts**: Handles, platforms, sentiment

---

## 📋 **Prerequisites**

- ✅ Supabase project
- ✅ OpenAI API key (GPT-4 Vision access)
- ✅ PostHog account (for analytics)
- ✅ Vercel account (for deployment)

---

## 🚀 **Step 1: Install Dependencies**

```bash
cd backend-vercel
npm install
```

**New dependencies**:
- `sharp@^0.33.0` - Image processing (thumbnails, resizing)
- `posthog-node@^4.0.0` - Server-side analytics
- `uuid@^9.0.1` - Request ID generation

---

## 🗄️ **Step 2: Run Database Migrations**

### 2.1: Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** → **Create Bucket**
2. Name: `screenshots`
3. Public: **No** (private bucket)
4. File size limit: **10MB**
5. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp`

### 2.2: Run Migrations

```bash
# Run app_events migration (analytics)
psql $DATABASE_URL -f migrations/00XX_app_events.sql

# Run screenshots migration
psql $DATABASE_URL -f migrations/00XX_screenshots.sql
```

**Tables created**:
- `app_events` - Event analytics mirror
- `screenshots` - Screenshot metadata
- `screenshot_analysis` - AI analysis results

---

## 🔐 **Step 3: Set Environment Variables**

### Backend (.env.local)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# PostHog
POSTHOG_PROJECT_KEY=phc_your_project_key
POSTHOG_HOST=https://app.posthog.com

# App URL (for triggering async analysis)
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

### Vercel Environment Variables

Add these in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `POSTHOG_PROJECT_KEY`
- `POSTHOG_HOST`
- `NEXT_PUBLIC_API_URL`

---

## 🧪 **Step 4: Test Locally**

### 4.1: Start Backend

```bash
cd backend-vercel
npm run dev
```

### 4.2: Test Upload

```bash
curl -X POST http://localhost:3001/api/v1/screenshots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/test-image.jpg" \
  -F "context=business_card"
```

**Expected response**:
```json
{
  "screenshot_id": "uuid",
  "analysis_id": "uuid",
  "status": "queued",
  "message": "Screenshot uploaded successfully. Analysis in progress."
}
```

### 4.3: Check Analysis Status

```bash
curl http://localhost:3001/api/v1/screenshots/{screenshot_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected response** (after ~10-30 seconds):
```json
{
  "id": "uuid",
  "status": "analyzed",
  "analysis": {
    "entities": {
      "contacts": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890",
          "company": "Acme Corp",
          "role": "CEO",
          "confidence": 0.95
        }
      ],
      "emails": ["john@example.com"],
      "phones": ["+1234567890"]
    },
    "insights": {
      "summary": "Business card for John Doe, CEO of Acme Corp.",
      "action_items": ["Follow up next week"],
      "sentiment": "professional",
      "category": "business_card"
    }
  },
  "image_url": "https://...",
  "thumbnail_url": "https://..."
}
```

---

## 📱 **Step 5: Integrate with Mobile**

### 5.1: Update Mobile API Client

```typescript
// lib/api.ts
export async function uploadScreenshot(imageUri: string, context: string = 'general') {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'screenshot.jpg',
  } as any);
  formData.append('context', context);

  const response = await apiFetch('/api/v1/screenshots', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.json();
}

export async function getScreenshotAnalysis(screenshotId: string) {
  const response = await apiFetch(`/api/v1/screenshots/${screenshotId}`);
  return response.json();
}

export async function listScreenshots(limit: number = 20, offset: number = 0) {
  const response = await apiFetch(`/api/v1/screenshots?limit=${limit}&offset=${offset}`);
  return response.json();
}
```

### 5.2: Update Screenshot Hook

```typescript
// hooks/useScreenshotAnalysis.ts
const analyzeScreenshot = async () => {
  if (!image) return null;

  setAnalyzing(true);
  setError(null);

  try {
    // Upload to backend
    const uploadResult = await uploadScreenshot(image.uri, context);
    
    // Poll for analysis (or use webhook/SSE)
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      
      const analysis = await getScreenshotAnalysis(uploadResult.screenshot_id);
      
      if (analysis.analysis?.entities) {
        setAnalysisResult(analysis.analysis);
        return analysis.analysis;
      }
      
      attempts++;
    }
    
    throw new Error('Analysis timeout');
  } catch (err) {
    setError(err.message);
    return null;
  } finally {
    setAnalyzing(false);
  }
};
```

---

## 📊 **Step 6: Monitor Analytics**

### PostHog Events Tracked

1. **screenshot_uploaded**
   ```json
   {
     "screenshot_id": "uuid",
     "file_size": 1024000,
     "mime_type": "image/jpeg",
     "width": 1920,
     "height": 1080
   }
   ```

2. **screenshot_analyzed**
   ```json
   {
     "screenshot_id": "uuid",
     "entities_found": 5,
     "insights_count": 3,
     "processing_time_ms": 15000
   }
   ```

### Query in PostHog

```sql
-- Upload to analysis completion rate
SELECT 
  count(DISTINCT properties.screenshot_id) FILTER (WHERE event = 'screenshot_uploaded') as uploads,
  count(DISTINCT properties.screenshot_id) FILTER (WHERE event = 'screenshot_analyzed') as analyzed,
  (analyzed::float / uploads * 100) as completion_rate
FROM events
WHERE timestamp > now() - interval '7 days'
```

### Query in Supabase

```sql
-- Top categories
SELECT 
  insights->>'category' as category,
  count(*) as count,
  avg((insights->>'action_items')::jsonb::text::int) as avg_actions
FROM screenshot_analysis
WHERE status = 'analyzed'
GROUP BY category
ORDER BY count DESC;

-- Extraction success rate
SELECT 
  date_trunc('day', created_at) as date,
  count(*) as total,
  count(*) FILTER (WHERE status = 'analyzed') as analyzed,
  count(*) FILTER (WHERE status = 'error') as errors,
  (count(*) FILTER (WHERE status = 'analyzed')::float / count(*) * 100) as success_rate
FROM screenshot_analysis
GROUP BY date
ORDER BY date DESC;
```

---

## ✅ **Step 7: Acceptance Criteria**

### Functional
- [ ] Upload handles 10MB images
- [ ] Thumbnails generated (400px wide)
- [ ] Analysis completes within 30s (p95)
- [ ] Business cards: Extract name, email, phone, company
- [ ] Emails: Extract participants, dates, action items
- [ ] Meeting notes: Extract attendees, to-dos
- [ ] Social posts: Extract handles, platforms

### Performance
- [ ] P95 latency < 30s (upload → analyzed)
- [ ] P99 latency < 60s
- [ ] Error rate < 5%
- [ ] Storage costs reasonable (< $0.10/GB)

### Analytics
- [ ] Events tracked in PostHog
- [ ] Events mirrored to Supabase
- [ ] Dashboard shows upload/analysis metrics

---

## 🐛 **Troubleshooting**

### Analysis stuck in "queued"

**Check**:
```sql
SELECT * FROM screenshot_analysis WHERE status = 'queued' ORDER BY created_at DESC LIMIT 10;
```

**Fix**: Manually trigger analysis
```bash
curl -X POST http://localhost:3001/api/v1/screenshots/{id}/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### "Failed to download image"

**Cause**: Storage bucket not configured or RLS too restrictive

**Fix**:
1. Check bucket exists: `screenshots`
2. Check RLS policies allow service role access
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### GPT-4 Vision errors

**Common errors**:
- `Invalid image format` → Convert to JPEG/PNG
- `Image too large` → Max 20MB for GPT-4 Vision
- `Rate limit exceeded` → Implement exponential backoff

**Fix**:
```typescript
// Add retry logic
const analyzeWithRetry = async (imageData: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
};
```

---

## 🎉 **Success Indicators**

✅ **You're ready when**:
- Upload API returns 201 with `screenshot_id`
- Analysis completes within 30 seconds
- Extracted entities match expectations (90%+ accuracy)
- Events appear in PostHog dashboard
- Mobile app can upload and display results

---

## 📚 **Next Steps**

1. **Add retry logic** for failed analyses
2. **Implement webhooks** for real-time notifications
3. **Add batch processing** for multiple screenshots
4. **Create UI** for managing screenshots (web dashboard)
5. **Add OCR fallback** (Google Vision API) if GPT-4 fails
6. **Optimize costs** (cache common patterns, reduce API calls)

---

**Status**: ✅ Ready for deployment  
**Estimated setup time**: 30 minutes  
**Monthly cost**: ~$0.10/1000 screenshots (GPT-4 Vision @ $0.01/image)
