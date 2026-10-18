# 🎵 Upload Test Audio File for Voice Notes Tests

## Quick Upload Instructions

### Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/storage/buckets

2. **Navigate to voice-notes bucket**
   - Click on `voice-notes` bucket (just created)

3. **Upload the test audio file**
   - Click "Upload file"
   - Select: `C:\Users\Isaia\Downloads\ElevenLabs_2025-11-08T04_12_13_Nicole_pre_sp100_s50_sb75_se0_b_m2.mp3`
   - Rename to: `test-audio.mp3`
   - Click Upload

4. **Verify public URL**
   - The file should be accessible at:
   - `https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/voice-notes/test-audio.mp3`

### Option 2: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref utasetfxiqcrnwyfforx

# Upload file
supabase storage cp "C:\Users\Isaia\Downloads\ElevenLabs_2025-11-08T04_12_13_Nicole_pre_sp100_s50_sb75_se0_b_m2.mp3" voice-notes/test-audio.mp3 --public
```

### Option 3: Use a Public Test File (Quick Alternative)

If you don't want to upload, you can use a publicly available test MP3:

```javascript
// In voice-notes.test.mjs, update fixture:
file_url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav'
// or
file_url: 'https://filesamples.com/samples/audio/mp3/sample1.mp3'
```

## What Happens After Upload

Once the file is uploaded, the tests will:

1. ✅ Create voice notes with real audio URLs
2. ✅ Test transcription endpoint (if OPENAI_API_KEY is set)
3. ✅ Verify file URL validation works
4. ✅ Test complete voice note lifecycle

## Current Test Status

**File URL in tests:**
```
https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/voice-notes/test-audio.mp3
```

**Tests that will improve:**
- Voice note creation (already passing)
- Transcription test (currently failing due to missing audio)
- E2E lifecycle test (currently failing)

**Expected improvement:** +2-3 tests passing

## Storage Bucket Details

**Bucket:** `voice-notes`
**Settings:**
- Public: Yes (files accessible via URL)
- Max size: 100MB per file
- Allowed types: mp3, m4a, wav, ogg, mpeg

**RLS Policies Needed:**

If you want authenticated users to upload:

```sql
-- Allow authenticated users to upload their own voice notes
CREATE POLICY "Users can upload voice notes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public read access for voice notes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'voice-notes');
```

## Verification

After upload, test the URL:

```bash
curl -I "https://utasetfxiqcrnwyfforx.supabase.co/storage/v1/object/public/voice-notes/test-audio.mp3"
```

Should return `200 OK` with `Content-Type: audio/mpeg`

## Next Steps

1. ✅ Upload test audio file (see above)
2. ⏳ Wait for Vercel deployment to complete (~5 mins)
3. ⏳ Verify OPENAI_API_KEY is set in Vercel
4. ✅ Run tests: `npm test`

Expected results after all fixes:
- **Current:** 29/65 passing (45%)
- **After upload + deployment:** 35-40/65 passing (55-62%)
