# File Size Limits & Chunking Strategy

## Overview
EverReach handles files of various sizes with automatic chunking for large files when processing them with external services (e.g., OpenAI Whisper transcription).

## File Size Limits

### Storage Limits
- **Max Upload**: 100MB (Supabase Storage default)
- **Recommended**: < 50MB for optimal performance

### Processing Limits (with safety margins)

| Service | Hard Limit | Our Limit | Margin | Purpose |
|---------|-----------|-----------|--------|---------|
| OpenAI Whisper | 25MB | 20MB | 5MB | Audio transcription |
| General Processing | - | 50MB | - | Memory constraints |
| Chunk Size | - | 10MB | - | Optimal for overlap processing |

### Why Margins?
- **Network overhead**: Multipart uploads add bytes
- **Metadata**: Headers, encoding can increase size
- **API fluctuations**: Service limits may change
- **Error buffer**: Prevents edge-case failures

## Automatic Chunking

### When Chunking Occurs
Files are automatically chunked when:
- Audio file > 20MB for Whisper transcription
- Any file > 50MB for general processing

### How It Works

1. **Size Check**
   ```typescript
   const { size, needsChunking } = await checkFileSize(filePath, MAX_FILE_SIZES.WHISPER);
   ```

2. **Download & Split**
   ```typescript
   const chunks = await chunkAudioFile(filePath, 10MB);
   // Returns: [
   //   { index: 0, start: 0, end: 10MB, path: 'file_chunk0.mp3' },
   //   { index: 1, start: 10MB, end: 20MB, path: 'file_chunk1.mp3' },
   //   { index: 2, start: 20MB, end: 25MB, path: 'file_chunk2.mp3' }
   // ]
   ```

3. **Process Each Chunk**
   ```typescript
   for (const chunk of chunks) {
     const result = await processChunk(chunk);
     // Use previous chunk's end as context for continuity
   }
   ```

4. **Cleanup Temporary Chunks**
   ```typescript
   await cleanupChunks(chunks);
   ```

### Context Preservation
For transcription, we maintain context between chunks:
- Last 200 characters of previous transcript used as `prompt` for next chunk
- Helps Whisper maintain continuity across chunk boundaries
- Improves accuracy for conversations and narratives

## API Usage

### Upload File
```http
POST /api/v1/files
Content-Type: application/json

{
  "path": "audio/recording.mp3",
  "contentType": "audio/mpeg"
}

Response:
{
  "url": "https://...",  // Presigned upload URL
  "path": "audio/recording.mp3"
}
```

### Transcribe with Auto-Chunking
```http
POST /api/v1/files/:id/transcribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en",
  "prompt": "Optional context or glossary"
}

Response:
{
  "transcript": "Full transcription text...",
  "metadata": {
    "file_id": "uuid",
    "total_size_mb": "23.45",
    "was_chunked": true,
    "chunks_processed": 3,
    "transcript_length": 15420
  }
}
```

## Testing

### Small Files (< 1MB)
```javascript
const mp3Data = generateMP3Data(1024 * 1024); // 1MB
// Processes without chunking
```

### Medium Files (1-20MB)
```javascript
const mp3Data = generateMP3Data(15 * 1024 * 1024); // 15MB
// Processes without chunking (below Whisper limit)
```

### Large Files (20-25MB)
```javascript
const mp3Data = generateMP3Data(23 * 1024 * 1024); // 23MB
// Automatically chunked into 3 parts (10MB + 10MB + 3MB)
```

### Very Large Files (>25MB)
```javascript
const mp3Data = generateMP3Data(50 * 1024 * 1024); // 50MB
// Automatically chunked into 5 parts (10MB each)
// May require additional handling depending on service
```

## Implementation Files

### Core Utilities
- `lib/file-chunking.ts` - Chunking logic and utilities
- `lib/storage.ts` - Supabase Storage client

### API Endpoints
- `app/api/v1/files/route.ts` - File upload (presigned URLs)
- `app/api/v1/files/[id]/route.ts` - File CRUD operations
- `app/api/v1/files/[id]/transcribe/route.ts` - Transcription with auto-chunking

### Tests
- `test/backend/file-crud.mjs` - Basic CRUD with real data
- `test/backend/file-large.mjs` - Large file handling (14 bytes to 15MB)

## Performance Considerations

### Chunking Overhead
- **Download time**: Original file must be downloaded from storage
- **Upload time**: Chunks must be uploaded back to storage
- **Processing time**: Sequential processing of chunks
- **Cleanup time**: Temporary chunks deleted after processing

**Example**: 25MB file
- Download: ~2-3s
- Chunk & Upload: ~3-4s
- Process 3 chunks: ~30-45s (Whisper is the bottleneck)
- Cleanup: ~1s
- **Total**: ~40-55s (vs ~15-20s for single 20MB file)

### Memory Usage
- Chunks kept in memory during processing: ~10MB at a time
- Full file never loaded into memory simultaneously
- Suitable for serverless/edge environments

## Future Enhancements

### Parallel Processing
- Process chunks in parallel (requires concurrent Whisper API calls)
- Reduces total time by 60-70%
- Requires rate limiting management

### Smart Chunking
- Split on silence/pauses instead of fixed size
- Improves transcription accuracy at boundaries
- Requires audio analysis (ffmpeg, librosa)

### Streaming
- Stream-process chunks as they upload
- Start transcription before full file uploaded
- Reduces end-to-end latency

### Compression
- Pre-process with ffmpeg to compress before chunking
- Can reduce 50MB → 10MB without quality loss
- Eliminates need for chunking in many cases

## Best Practices

### For Clients
1. Show upload progress for files > 5MB
2. Warn users about processing time for files > 20MB
3. Suggest compression for very large files
4. Allow cancellation during chunked processing

### For Backend
1. Always cleanup temporary chunks (even on error)
2. Use background jobs for files > 25MB
3. Cache transcripts to avoid re-processing
4. Monitor chunk processing failures

### For Testing
1. Test with real files, not just generated data
2. Cover all size ranges (small, medium, large, very large)
3. Test cleanup on both success and failure
4. Verify transcript quality across chunk boundaries

## Troubleshooting

### "File too large" errors
- Check if file exceeds storage limit (100MB)
- Consider client-side compression before upload
- Split file manually if processing limit exceeded

### Chunking failures
- Check storage quotas (temporary chunks consume space)
- Verify OpenAI API key and quota
- Review logs for specific chunk failures

### Poor transcription quality at boundaries
- Increase context window (currently 200 chars)
- Implement smart chunking on silence
- Post-process to smooth transitions

### High costs
- Large files consume more API credits (3x chunks = 3x cost)
- Cache transcripts aggressively
- Compress files before transcription
- Consider batch processing during off-peak hours
